import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Club from '../models/Club';
import Task from '../models/Task';
import TaskExecution from '../models/TaskExecution';
import ClubJoinRequest from '../models/ClubJoinRequest';

// 获取社团列表（支持搜索和城市筛选）- 只显示已审核通过的社团
export const getClubs = async (req: AuthRequest, res: Response) => {
    try {
        const { keyword, city, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        let query: any = { status: 'approved' };  // 只显示已审核通过的社团

        // 城市筛选
        if (city && typeof city === 'string' && city.trim()) {
            query.city = city.trim();
        }

        // 关键词搜索
        if (keyword && typeof keyword === 'string' && keyword.trim()) {
            const searchRegex = new RegExp(keyword.trim(), 'i');
            const searchConditions: any[] = [
                { name: searchRegex },
                { description: searchRegex }
            ];
            // 如果没有指定城市，也搜索城市字段
            if (!city) {
                searchConditions.push({ city: searchRegex });
            }
            query.$or = searchConditions;
        }

        const [clubs, total] = await Promise.all([
            Club.find(query)
                .populate('president', 'username level avatarUrl')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            Club.countDocuments(query)
        ]);

        res.json({ clubs, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch clubs' });
    }
};

// 获取我的社团（分类）- 创建的社团显示所有状态，加入的只显示已审核
export const getMyClubs = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;

        // 我创建的社团（包括待审核和已拒绝的，方便用户查看状态）
        const createdClubs = await Club.find({ president: userId })
            .populate('president', 'username level avatarUrl')
            .sort({ createdAt: -1 });

        // 我加入的社团（不包含创建的，只显示已审核通过的）
        const joinedClubs = await Club.find({
            members: userId,
            president: { $ne: userId },
            status: 'approved'
        })
            .populate('president', 'username level avatarUrl')
            .sort({ createdAt: -1 });

        res.json({
            created: createdClubs,
            joined: joinedClubs,
            totalCount: createdClubs.length + joinedClubs.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch my clubs' });
    }
};

// 获取社团详情
export const getClubDetail = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const club = await Club.findById(id)
            .populate('president', 'username level avatarUrl')
            .populate('members', 'username level avatarUrl');

        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        res.json(club);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch club detail' });
    }
};

// 创建社团（需要审核）
export const createClub = async (req: AuthRequest, res: Response) => {
    try {
        // 检查社团名称是否已存在
        const existingClub = await Club.findOne({ name: req.body.name });
        if (existingClub) {
            return res.status(400).json({
                error: '该社团名称已被使用，请换一个名称',
                code: 'DUPLICATE_NAME'
            });
        }

        // 检查用户创建的社团数量（最多3个）
        const createdCount = await Club.countDocuments({ president: req.userId });
        if (createdCount >= 3) {
            return res.status(400).json({
                error: '您最多只能创建3个社团',
                code: 'MAX_CREATED_CLUBS'
            });
        }

        // 检查用户加入的社团总数（创建+加入最多8个）
        const joinedCount = await Club.countDocuments({ members: req.userId });
        if (joinedCount >= 8) {
            return res.status(400).json({
                error: '您最多只能加入8个社团（包含创建的）',
                code: 'MAX_JOINED_CLUBS'
            });
        }

        const club = new Club({
            ...req.body,
            president: req.userId,
            members: [req.userId],
            status: 'pending'  // 社团创建后需要审核
        });
        await club.save();

        res.status(201).json({ club, message: '社团已提交，等待审核' });
    } catch (error: any) {
        // 处理MongoDB唯一索引错误
        if (error.code === 11000) {
            return res.status(400).json({
                error: '该社团名称已被使用，请换一个名称',
                code: 'DUPLICATE_NAME'
            });
        }
        res.status(400).json({ error: 'Failed to create club', details: error });
    }
};

// 申请加入社团（需要团长审核）
export const applyToJoinClub = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        // 检查用户加入的社团总数
        const joinedCount = await Club.countDocuments({ members: req.userId });
        if (joinedCount >= 8) {
            return res.status(400).json({
                error: '您最多只能加入8个社团（包含创建的）',
                code: 'MAX_JOINED_CLUBS'
            });
        }

        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 只能申请已审核通过的社团
        if (club.status !== 'approved') {
            return res.status(400).json({ error: '该社团尚未通过审核' });
        }

        // 检查是否已经是成员
        if (club.members.includes(req.userId as any)) {
            return res.status(400).json({ error: '您已经是该社团成员' });
        }

        // 检查是否已有待处理的申请
        const existingRequest = await ClubJoinRequest.findOne({
            club: id,
            user: req.userId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ error: '您已提交过申请，请等待审核' });
        }

        // 创建申请
        const joinRequest = new ClubJoinRequest({
            club: id,
            user: req.userId,
            message: message || '',
            status: 'pending'
        });
        await joinRequest.save();

        res.status(201).json({
            message: '申请已提交，请等待团长审核',
            request: joinRequest
        });
    } catch (error) {
        res.status(400).json({ error: 'Failed to apply to join club', details: error });
    }
};

// 获取用户对某社团的申请状态
export const getJoinRequestStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const request = await ClubJoinRequest.findOne({
            club: id,
            user: req.userId
        }).sort({ createdAt: -1 });

        res.json({ request });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get request status' });
    }
};

// 获取社团的待审核申请列表（团长用）
export const getClubJoinRequests = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status = 'pending' } = req.query;

        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 只有团长可以查看
        if (club.president.toString() !== req.userId) {
            return res.status(403).json({ error: '只有团长可以查看入社申请' });
        }

        const query: any = { club: id };
        if (status !== 'all') {
            query.status = status;
        }

        const requests = await ClubJoinRequest.find(query)
            .populate('user', 'username avatarUrl level bio')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get join requests' });
    }
};

// 获取团长所有社团的待审核申请数量
export const getPendingRequestsCount = async (req: AuthRequest, res: Response) => {
    try {
        // 获取用户创建的所有社团
        const clubs = await Club.find({ president: req.userId });
        const clubIds = clubs.map(c => c._id);

        // 统计待审核申请数量
        const count = await ClubJoinRequest.countDocuments({
            club: { $in: clubIds },
            status: 'pending'
        });

        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get pending count' });
    }
};

// 审核入社申请（团长用）
export const reviewJoinRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { id, requestId } = req.params;
        const { action, rejectReason } = req.body;  // action: 'approve' | 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 只有团长可以审核
        if (club.president.toString() !== req.userId) {
            return res.status(403).json({ error: '只有团长可以审核入社申请' });
        }

        const joinRequest = await ClubJoinRequest.findById(requestId);
        if (!joinRequest) return res.status(404).json({ error: 'Request not found' });

        if (joinRequest.status !== 'pending') {
            return res.status(400).json({ error: '该申请已被处理' });
        }

        if (action === 'approve') {
            // 检查申请人是否已达到加入上限
            const userJoinedCount = await Club.countDocuments({ members: joinRequest.user });
            if (userJoinedCount >= 8) {
                return res.status(400).json({ error: '该用户已达到加入社团上限' });
            }

            // 添加成员
            if (!club.members.includes(joinRequest.user as any)) {
                club.members.push(joinRequest.user as any);
                await club.save();
            }

            joinRequest.status = 'approved';

            // 发送通知
            const { createNotificationInternal } = await import('./notificationController');
            await createNotificationInternal(
                joinRequest.user.toString(),
                'system',
                undefined,
                undefined,
                `您申请加入的社团「${club.name}」已通过审核，欢迎加入！`
            );
        } else {
            joinRequest.status = 'rejected';
            joinRequest.rejectReason = rejectReason || '';

            // 发送通知
            const { createNotificationInternal } = await import('./notificationController');
            await createNotificationInternal(
                joinRequest.user.toString(),
                'system',
                undefined,
                undefined,
                `您申请加入的社团「${club.name}」未通过审核${rejectReason ? `，原因：${rejectReason}` : ''}`
            );
        }

        joinRequest.reviewedBy = req.userId as any;
        joinRequest.reviewedAt = new Date();
        await joinRequest.save();

        res.json({
            message: action === 'approve' ? '已通过申请' : '已拒绝申请',
            request: joinRequest
        });
    } catch (error) {
        console.error('Failed to review join request:', error);
        res.status(500).json({ error: 'Failed to review join request' });
    }
};

// 加入社团（保留用于直接加入，如团长邀请等场景）
export const joinClub = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // 检查用户加入的社团总数
        const joinedCount = await Club.countDocuments({ members: req.userId });
        if (joinedCount >= 8) {
            return res.status(400).json({
                error: '您最多只能加入8个社团（包含创建的）',
                code: 'MAX_JOINED_CLUBS'
            });
        }

        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 只能加入已审核通过的社团
        if (club.status !== 'approved') {
            return res.status(400).json({ error: '该社团尚未通过审核' });
        }

        if (!club.members.includes(req.userId as any)) {
            club.members.push(req.userId as any);
            await club.save();
        }

        res.json(club);
    } catch (error) {
        res.status(400).json({ error: 'Failed to join club', details: error });
    }
};

// 退出社团
export const leaveClub = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 团长不能退出
        if (club.president.toString() === req.userId) {
            return res.status(400).json({ error: '团长不能退出社团，请先转让团长职位' });
        }

        // 移除成员
        club.members = club.members.filter(m => m.toString() !== req.userId);
        await club.save();

        res.json({ message: '已退出社团' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to leave club' });
    }
};

// 更新社团公告
export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { announcement } = req.body;

        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 仅团长可编辑
        if (club.president.toString() !== req.userId) {
            return res.status(403).json({ error: 'Only president can edit announcement' });
        }

        club.announcement = announcement;
        club.announcementUpdatedAt = new Date();
        await club.save();

        res.json(club);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update announcement' });
    }
};

// 获取社团任务列表
export const getClubTasks = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status = 'active' } = req.query;

        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        const now = new Date();
        let query: any = {
            clubId: id,
            status: 'approved'  // 只显示已审核通过的任务
        };

        if (status === 'active') {
            // 准备中和进行中的任务（未过期）
            query['timeConfig.eventEndDate'] = { $gt: now };
        }

        const tasks = await Task.find(query)
            .populate('author', 'username avatarUrl')
            .sort({ 'timeConfig.eventStartDate': 1 });

        // 获取每个任务的报名人数
        const tasksWithParticipants = await Promise.all(tasks.map(async (task: any) => {
            const participantCount = await TaskExecution.countDocuments({
                task: task._id,
                status: { $in: ['scheduled', 'ongoing'] }
            });
            return {
                ...task.toObject(),
                participantCount,
                maxParticipants: task.timeConfig?.maxParticipants || 18
            };
        }));

        res.json(tasksWithParticipants);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch club tasks' });
    }
};

// 创建社团活动
export const createClubActivity = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 仅团长可创建
        if (club.president.toString() !== req.userId) {
            return res.status(403).json({ error: 'Only president can create activities' });
        }

        // 检查活跃任务数量（未过期且已审核通过的任务最多3个）
        const now = new Date();
        const activeTasksCount = await Task.countDocuments({
            clubId: id,
            'timeConfig.isEventTask': true,
            'timeConfig.eventEndDate': { $gt: now },
            status: 'approved'
        });

        if (activeTasksCount >= 3) {
            return res.status(400).json({
                error: '每个社团最多只能有3个活跃任务',
                code: 'MAX_ACTIVE_TASKS'
            });
        }

        // 创建任务（需要审核）
        const taskData = {
            ...req.body,
            author: req.userId,
            clubId: id,
            isOfficial: false,
            status: 'pending',  // 社团活动需要审核
            timeConfig: {
                ...req.body.timeConfig,
                isEventTask: true,
                maxParticipants: req.body.timeConfig?.maxParticipants || 18
            }
        };

        const task = new Task(taskData);
        await task.save();

        club.activityTasks.push(task._id as any);
        await club.save();

        // 注意：团长的Host执行记录将在审核通过后创建
        res.status(201).json({ task, message: '活动已提交，等待审核' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to create activity', details: error });
    }
};

// 报名社团活动
export const registerActivity = async (req: AuthRequest, res: Response) => {
    try {
        const { clubId, taskId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 检查是否是社团成员
        if (!club.members.includes(req.userId as any)) {
            return res.status(403).json({ error: '请先加入社团' });
        }

        const task: any = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // 检查活动是否已结束
        const now = new Date();
        if (task.timeConfig?.eventEndDate && new Date(task.timeConfig.eventEndDate) < now) {
            return res.status(400).json({ error: '活动已结束' });
        }

        // 检查是否已报名
        const existingExecution = await TaskExecution.findOne({
            user: req.userId,
            task: taskId,
            status: { $ne: 'completed' }
        });

        if (existingExecution) {
            return res.status(400).json({ error: '您已报名此活动' });
        }

        // 检查人数限制
        const maxParticipants = task.timeConfig?.maxParticipants || 18;
        const currentCount = await TaskExecution.countDocuments({
            task: taskId,
            status: { $in: ['scheduled', 'ongoing'] }
        });

        if (currentCount >= maxParticipants) {
            return res.status(400).json({ error: '活动人数已满' });
        }

        // 找到Host的执行记录
        const hostExecution = await TaskExecution.findOne({
            task: taskId,
            'coopContext.isHost': true
        });

        // 创建报名记录
        const prepProgress = (task.prepListConfig || []).map((config: any) => ({
            configId: config._id,
            title: config.title,
            kind: config.type,
            isCompleted: false,
            note: '',
            data: {}
        }));

        if (prepProgress.length === 0) {
            prepProgress.push(
                { configId: undefined, title: '门票', kind: 'ticket', isCompleted: false, note: '', data: {} },
                { configId: undefined, title: '车票', kind: 'transport', isCompleted: false, note: '', data: {} },
                { configId: undefined, title: '住宿', kind: 'lodging', isCompleted: false, note: '', data: {} },
                { configId: undefined, title: '证件', kind: 'documents', isCompleted: false, note: '', data: {} },
                { configId: undefined, title: '其他', kind: 'other', isCompleted: false, note: '', data: {} }
            );
        }

        // 判断活动是否已开始，决定状态
        const startDate = task.timeConfig?.eventStartDate ? new Date(task.timeConfig.eventStartDate) : null;
        const isStarted = startDate && now >= startDate;
        const executionStatus = isStarted ? 'ongoing' : 'scheduled';

        // 获取当前所有参与者（包括Host和已报名的成员）
        let allParticipants = hostExecution?.coopContext?.participants || [];
        if (!allParticipants.includes(req.userId as any)) {
            allParticipants.push(req.userId as any);
        }

        const execution = await TaskExecution.create({
            user: req.userId,
            task: taskId,
            status: executionStatus,
            prepProgress,
            completedNodes: [],
            coopContext: {
                isHost: false,
                hostExecutionId: hostExecution?._id,
                participants: allParticipants  // 包含所有参与者
            }
        });

        // 更新Host的参与者列表
        if (hostExecution) {
            if (!hostExecution.coopContext!.participants.includes(req.userId as any)) {
                hostExecution.coopContext!.participants.push(req.userId as any);
                await hostExecution.save();
            }
        }

        // 更新所有其他参与者的participants列表（确保所有人都能看到新成员）
        await TaskExecution.updateMany(
            {
                task: taskId,
                status: { $in: ['scheduled', 'ongoing'] },
                _id: { $ne: execution._id }
            },
            {
                $addToSet: { 'coopContext.participants': req.userId }
            }
        );

        res.status(201).json(execution);
    } catch (error) {
        res.status(400).json({ error: 'Failed to register activity', details: error });
    }
};

// 取消报名社团活动
export const cancelRegistration = async (req: AuthRequest, res: Response) => {
    try {
        const { clubId, taskId } = req.params;

        const execution = await TaskExecution.findOne({
            user: req.userId,
            task: taskId,
            status: { $in: ['scheduled', 'ongoing'] }
        });

        if (!execution) {
            return res.status(404).json({ error: '未找到报名记录' });
        }

        // Host不能取消报名
        if (execution.coopContext?.isHost) {
            return res.status(400).json({ error: '活动创建者不能取消报名' });
        }

        // 删除报名记录
        await TaskExecution.deleteOne({ _id: execution._id });

        // 从所有参与者的列表中移除该用户
        await TaskExecution.updateMany(
            {
                task: taskId,
                status: { $in: ['scheduled', 'ongoing'] }
            },
            {
                $pull: { 'coopContext.participants': req.userId }
            }
        );

        res.json({ message: '已取消报名' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to cancel registration' });
    }
};

// 获取用户已加入社团的所有活动
export const getClubActivities = async (req: AuthRequest, res: Response) => {
    try {
        // 获取用户加入的所有社团
        const clubs = await Club.find({ members: req.userId });
        const clubIds = clubs.map(c => c._id);

        const now = new Date();

        // 获取这些社团的所有活跃任务
        const tasks = await Task.find({
            clubId: { $in: clubIds },
            'timeConfig.isEventTask': true,
            'timeConfig.eventEndDate': { $gt: now }
        })
            .populate('author', 'username avatarUrl')
            .populate('clubId', 'name coverUrl')
            .sort({ 'timeConfig.eventStartDate': 1 });

        // 获取每个任务的报名人数和用户报名状态
        const tasksWithInfo = await Promise.all(tasks.map(async (task: any) => {
            const participantCount = await TaskExecution.countDocuments({
                task: task._id,
                status: { $in: ['scheduled', 'ongoing'] }
            });

            const userExecution = await TaskExecution.findOne({
                user: req.userId,
                task: task._id,
                status: { $ne: 'completed' }
            });

            return {
                ...task.toObject(),
                participantCount,
                maxParticipants: task.timeConfig?.maxParticipants || 18,
                isRegistered: !!userExecution,
                userExecutionId: userExecution?._id
            };
        }));

        res.json(tasksWithInfo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
};

// 解散社团
export const dissolveClub = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const club = await Club.findById(id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        // 仅团长可解散
        if (club.president.toString() !== req.userId) {
            return res.status(403).json({ error: '只有团长可以解散社团' });
        }

        // 获取社团的所有任务
        const clubTasks = await Task.find({ clubId: id });
        const taskIds = clubTasks.map(t => t._id);

        // 删除所有相关的任务执行记录
        await TaskExecution.deleteMany({ task: { $in: taskIds } });

        // 删除所有社团任务
        await Task.deleteMany({ clubId: id });

        // 删除社团
        await Club.deleteOne({ _id: id });

        res.json({ message: '社团已解散' });
    } catch (error) {
        console.error('Failed to dissolve club:', error);
        res.status(500).json({ error: 'Failed to dissolve club' });
    }
};

// 获取待审核社团列表（管理员）
export const getPendingClubs = async (req: AuthRequest, res: Response) => {
    try {
        const clubs = await Club.find({ status: 'pending' })
            .populate('president', 'username level avatarUrl')
            .sort({ createdAt: -1 });

        res.json(clubs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending clubs' });
    }
};

// 取消社团活动（团长专用）
export const cancelActivity = async (req: AuthRequest, res: Response) => {
    try {
        const { clubId, taskId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        // 仅团长可取消活动
        if (club.president.toString() !== req.userId) {
            return res.status(403).json({ error: '只有团长可以取消活动' });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // 确认任务属于该社团
        if (task.clubId?.toString() !== clubId) {
            return res.status(400).json({ error: '该任务不属于此社团' });
        }

        // 获取所有报名的用户
        const executions = await TaskExecution.find({
            task: taskId,
            status: { $in: ['scheduled', 'ongoing'] }
        }).populate('user', 'username');

        // 删除所有相关的执行记录
        await TaskExecution.deleteMany({
            task: taskId,
            status: { $in: ['scheduled', 'ongoing'] }
        });

        // 从社团的活动列表中移除
        club.activityTasks = club.activityTasks.filter(
            (t: any) => t.toString() !== taskId
        );
        await club.save();

        // 删除任务
        await Task.deleteOne({ _id: taskId });

        // 发送通知给所有已报名的用户
        const { createNotificationInternal } = await import('./notificationController');
        for (const exec of executions) {
            if (exec.user && exec.user.toString() !== req.userId) {
                await createNotificationInternal(
                    exec.user.toString(),
                    'system',
                    undefined,
                    undefined,
                    `社团「${club.name}」的活动「${task.title}」已被取消`
                );
            }
        }

        res.json({
            message: '活动已取消',
            notifiedUsers: executions.length
        });
    } catch (error) {
        console.error('Failed to cancel activity:', error);
        res.status(500).json({ error: 'Failed to cancel activity' });
    }
};

// 审核社团（管理员）
export const reviewClub = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { action } = req.body;  // 'approve' or 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const club = await Club.findById(id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        if (club.status !== 'pending') {
            return res.status(400).json({ error: '该社团已被审核' });
        }

        club.status = action === 'approve' ? 'approved' : 'rejected';
        await club.save();

        // 发送通知给社团创建者
        const { createNotificationInternal } = await import('./notificationController');
        const notificationContent = action === 'approve'
            ? `恭喜！您创建的社团「${club.name}」已通过审核，现在可以正常使用了`
            : `很抱歉，您创建的社团「${club.name}」未通过审核`;

        await createNotificationInternal(
            club.president.toString(),
            'system',
            undefined,
            undefined,
            notificationContent
        );

        res.json({
            message: action === 'approve' ? '社团已通过审核' : '社团已被拒绝',
            club
        });
    } catch (error) {
        console.error('Failed to review club:', error);
        res.status(500).json({ error: 'Failed to review club' });
    }
};
