import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Task from '../models/Task';
import TaskExecution from '../models/TaskExecution';
import User from '../models/User';
import Report from '../models/Report';
import { checkMultipleFields } from '../utils/sensitiveFilter';

// POST /tasks
export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, nodes } = req.body;

        // 敏感词检测
        const fieldsToCheck: { [key: string]: string } = {
            '标题': title || '',
            '描述': description || '',
        };

        // 检测节点描述
        if (nodes && Array.isArray(nodes)) {
            nodes.forEach((node: any, index: number) => {
                if (node.description) {
                    fieldsToCheck[`节点${index + 1}`] = node.description;
                }
            });
        }

        const filterResult = checkMultipleFields(fieldsToCheck);

        if (!filterResult.isClean) {
            return res.status(400).json({
                error: '内容包含敏感词，无法创建任务',
                code: 'SENSITIVE_CONTENT',
                details: filterResult.matchedWords
            });
        }

        // 奇遇任务赠言必填验证
        if (req.body.taskType === 'serendipity') {
            if (!req.body.serendipityConfig?.successMessage?.trim()) {
                return res.status(400).json({
                    error: '奇遇任务必须填写赠言（successMessage）',
                    code: 'SERENDIPITY_MESSAGE_REQUIRED'
                });
            }
        }

        // 获取发布者信息，检查是否管理员
        const author = await User.findById(req.userId);
        const isAdmin = author?.isAdmin === true;
        const isPrivate = req.body.isPrivate === true;

        let status = 'pending';
        if (isPrivate) {
            status = 'private';
        } else if (isAdmin) {
            status = 'approved';
        }

        // 构建任务数据
        const taskData = {
            ...req.body,
            author: req.userId,
            // 管理员发布的任务直接通过，普通用户需要审核，私密任务为 private
            status: status,
            // 只有管理员可以设置 isOfficial，普通用户强制为 false
            isOfficial: isAdmin ? (req.body.isOfficial || false) : false,
        };

        const task = new Task(taskData);
        await task.save();

        // 如果是私密任务，自动加入收藏
        if (isPrivate && author) {
            // @ts-ignore
            if (!author.savedTasks.includes(task._id)) {
                // @ts-ignore
                author.savedTasks.push(task._id);
                await author.save();
            }
        }

        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create task', details: error });
    }
};

// GET /tasks
export const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 10, isOfficial, isAI, sort, period, status, city } = req.query;
        const userId = req.userId; // 可能未登录
        const filter: any = {};

        // 城市过滤 (City Filter)
        if (city && city !== '全国' && city !== '不限') {
            filter.targetCities = city;
        }

        // 默认只返回已通过审核的任务，除非明确指定 status
        if (status === 'pending') {
            filter.status = 'pending'; // 审核空间使用
            // 审核空间需要显示社团活动，所以不过滤 clubId
        } else if (status === 'all') {
            // 不添加状态过滤，返回所有（管理员用）
        } else {
            filter.status = 'approved'; // 普通列表只显示已通过审核的任务
        }

        // 默认过滤已删除任务，除非管理员特意请求
        filter.isDeleted = { $ne: true };

        // 隐藏奇遇任务（奇遇任务只有在触发后才可见）
        filter.taskType = { $ne: 'serendipity' };

        // 隐藏社团任务（社团任务只在社团内可见）- 审核空间除外
        if (status !== 'pending') {
            filter.clubId = { $exists: false };
        }

        if (isOfficial === 'true') filter.isOfficial = true;
        if (isAI === 'true') filter.isAI = true;

        // "Hot" means high likes/views within a specific period
        if (sort === 'hot' && period) {
            const now = new Date();
            let startDate = new Date();

            if (period === 'week') startDate.setDate(now.getDate() - 7);
            else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
        }

        let sortOption: any = { createdAt: -1 };
        if (sort === 'hot') {
            // 改为按点赞数组长度排序（需要在内存中处理）
            sortOption = { createdAt: -1 }; // 先获取，后排序
        }

        const tasks = await Task.find(filter)
            .populate('author', 'username level avatarUrl')
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort(sortOption);

        // 获取每个任务的用户数（收藏 + 执行的唯一用户）
        const taskIds = tasks.map(t => t._id);

        // 获取收藏该任务的用户
        const savedUsersMap = new Map<string, Set<string>>();
        const usersWithSaved = await User.find({ savedTasks: { $in: taskIds } }).select('_id savedTasks');
        usersWithSaved.forEach(u => {
            (u.savedTasks as any[]).forEach(taskId => {
                const tid = taskId.toString();
                if (!savedUsersMap.has(tid)) savedUsersMap.set(tid, new Set());
                savedUsersMap.get(tid)!.add(u._id.toString());
            });
        });

        // 获取执行该任务的用户
        const executionUsersMap = new Map<string, Set<string>>();
        const executions = await TaskExecution.find({ task: { $in: taskIds } }).select('task user');
        executions.forEach(e => {
            const tid = (e.task as any).toString();
            if (!executionUsersMap.has(tid)) executionUsersMap.set(tid, new Set());
            executionUsersMap.get(tid)!.add((e.user as any).toString());
        });

        // 组装响应数据
        const tasksWithStats = tasks.map(task => {
            const tid = task._id.toString();
            const savedUsers = savedUsersMap.get(tid) || new Set();
            const execUsers = executionUsersMap.get(tid) || new Set();
            const allUsers = new Set([...savedUsers, ...execUsers]);

            const likeCount = task.likes?.length || 0;
            const isLiked = userId ? task.likes?.some(uid => uid.toString() === userId) : false;

            return {
                ...task.toObject(),
                likeCount,
                isLiked,
                userCount: allUsers.size
            };
        });

        // 如果按热度排序，在内存中排序
        if (sort === 'hot') {
            tasksWithStats.sort((a, b) => b.likeCount - a.likeCount);
        }

        res.json(tasksWithStats);
    } catch (error) {
        console.error('getTasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
};

// GET /tasks/my
export const getMyTasks = async (req: AuthRequest, res: Response) => {
    try {
        const executions = await TaskExecution.find({ user: req.userId })
            .populate({
                path: 'task',
                populate: { path: 'author', select: 'username avatarUrl' }
            })
            .sort({ updatedAt: -1 });

        // Calculate progress for each execution
        const myTasks = executions.map(exec => {
            const task = exec.task as any;
            if (!task) return null; // Should not happen

            // Calculate progress simply based on prep completion or node completion
            const prepTotal = exec.prepProgress.length;
            const prepCompleted = exec.prepProgress.filter(p => p.isCompleted).length;
            const nodeTotal = task.nodes?.length || 0;
            const nodeCompleted = exec.completedNodes.length;

            // Simple heuristic for progress if not strictly defined
            // Assume 20% is prep, 80% is route
            let progress = 0;
            if (prepTotal > 0) {
                progress += (prepCompleted / prepTotal) * 20;
            } else {
                progress += 20; // Skip prep
            }

            if (nodeTotal > 0) {
                progress += (nodeCompleted / nodeTotal) * 80;
            }

            if (exec.status === 'completed') progress = 100;

            return {
                id: task._id,
                executionId: exec._id,
                title: task.title,
                location: task.location || '未知地点',
                type: task.type || '探索',
                progress: Math.round(progress),
                lastCheckIn: exec.updatedAt,
                image: task.coverImage || '',
                status: exec.status,
                isFavorite: false, // TODO: Add favorite logic
                theme: task.theme || { bg: 'bg-blue-100', text: 'text-blue-600' },
                startTime: exec.startTime, // For completion stats
                completionTime: exec.completionTime, // For completion stats
                stats: { // For Completion Screen
                    distance: task.distance || 0,
                    checkpoints: task.nodes?.length || 0
                },
                prepChecklist: exec.prepProgress.map((p: any) => ({
                    id: p._id,
                    title: p.title,
                    status: p.isCompleted ? 'completed' : 'pending',
                    kind: p.kind
                }))
            };
        }).filter(Boolean);

        res.json(myTasks);
    } catch (error) {
        console.error('getMyTasks error:', error);
        res.status(500).json({ error: 'Failed to fetch my tasks' });
    }
};

// GET /tasks/:id
export const getTaskById = async (req: AuthRequest, res: Response) => {
    try {
        const task = await Task.findById(req.params.id).populate('author', 'username level avatarUrl');
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // 计算完成数：统计状态为 completed 的执行记录
        const completedCount = await TaskExecution.countDocuments({
            task: req.params.id,
            status: 'completed'
        });

        // 计算收藏数：统计 savedTasks 包含此任务的用户数
        const savedCount = await User.countDocuments({
            savedTasks: req.params.id
        });

        // 社团活动额外信息
        let clubActivityInfo: any = null;
        if (task.clubId) {
            // 获取社团信息
            const Club = require('../models/Club').default;
            const club = await Club.findById(task.clubId).select('name president');

            // Debug logging
            console.log('[TaskController] President comparison:', {
                clubPresident: club?.president?.toString(),
                reqUserId: req.userId,
                clubPresidentType: typeof club?.president,
                reqUserIdType: typeof req.userId
            });

            const isPresident = club?.president?.toString() === req.userId?.toString();

            // 检查当前用户是否已报名
            const userExecution = await TaskExecution.findOne({
                task: req.params.id,
                user: req.userId,
                status: { $ne: 'completed' }
            });

            // 获取报名人数
            const participantCount = await TaskExecution.countDocuments({
                task: req.params.id,
                status: { $in: ['scheduled', 'ongoing'] }
            });

            clubActivityInfo = {
                participantCount,
                maxParticipants: task.timeConfig?.maxParticipants || 18,
                isRegistered: !!userExecution,
                registrationStatus: userExecution?.status || null,
                clubName: club?.name || '',
                isPresident
            };
        }

        // 返回任务数据和统计
        res.json({
            ...task.toObject(),
            completedCount,
            savedCount,
            ...(clubActivityInfo && { clubActivityInfo })
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch task' });
    }
};

// POST /tasks/:id/join
export const joinTask = async (req: AuthRequest, res: Response) => {
    try {
        const taskId = req.params.id;
        const userId = req.userId;

        // Check if tasks exists
        const task: any = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Event Task Validation - 只有在活动时间段内才能加入
        if (task.timeConfig?.isEventTask) {
            const now = new Date();
            const start = task.timeConfig.eventStartDate ? new Date(task.timeConfig.eventStartDate) : null;
            const end = task.timeConfig.eventEndDate ? new Date(task.timeConfig.eventEndDate) : null;

            if (start && now < start) {
                return res.status(400).json({ error: '活动尚未开始，无法加入' });
            }
            if (end && now > end) {
                return res.status(400).json({ error: '活动已结束，无法加入' });
            }
        }

        // Check for existing execution
        const existingExecution = await TaskExecution.findOne({ user: userId, task: taskId, status: { $ne: 'completed' } });
        if (existingExecution) {
            return res.status(400).json({ error: 'You have already joined this task' });
        }

        // Initialize prep progress based on config
        const prepProgress = task.prepListConfig?.map((config: { _id?: any; title: string; type: string }) => ({
            configId: config._id,
            title: config.title,
            kind: config.type,
            isCompleted: false,
            note: '',
            data: {}
        })) || [];

        if (prepProgress.length === 0) {
            prepProgress.push(
                { configId: undefined, title: '门票', kind: 'ticket', isCompleted: false, note: '', data: {} },
                { configId: undefined, title: '车票', kind: 'transport', isCompleted: false, note: '', data: {} },
                { configId: undefined, title: '住宿', kind: 'lodging', isCompleted: false, note: '', data: {} },
                { configId: undefined, title: '证件', kind: 'documents', isCompleted: false, note: '', data: {} },
                { configId: undefined, title: '其他', kind: 'other', isCompleted: false, note: '', data: {} }
            );
        }

        const execution = new TaskExecution({
            user: userId,
            task: taskId,
            status: 'new',
            prepProgress,
            completedNodes: []
        });

        await execution.save();
        res.status(201).json(execution);
    } catch (error) {
        res.status(400).json({ error: 'Failed to join task', details: error });
    }
};
// PUT /tasks/:id
export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const taskId = req.params.id;
        const userId = req.userId;

        // 获取当前用户信息
        const User = (await import('../models/User')).default;
        const currentUser = await User.findById(userId);
        if (!currentUser) return res.status(401).json({ error: 'User not found' });

        // 获取任务信息
        const existingTask = await Task.findById(taskId);
        if (!existingTask) return res.status(404).json({ error: 'Task not found' });

        // 检查权限：只有作者或管理员可以更新任务
        const isAuthor = existingTask.author.toString() === userId;
        const isAdmin = currentUser.isAdmin === true;

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'You do not have permission to update this task' });
        }

        // 只有管理员可以设置 isOfficial 字段
        if (req.body.isOfficial !== undefined && !isAdmin) {
            return res.status(403).json({ error: 'Only administrators can set official status' });
        }

        const task = await Task.findByIdAndUpdate(taskId, req.body, { new: true });
        res.json(task);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update task' });
    }
};

// POST /tasks/:id/review - 审核任务
const REVIEW_THRESHOLD = 20; // 普通用户需要 20 人审核通过

export const reviewTask = async (req: AuthRequest, res: Response) => {
    try {
        const taskId = req.params.id;
        const userId = req.userId;
        const { action } = req.body; // 'approve' 或 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
        }

        const User = (await import('../models/User')).default;
        const currentUser = await User.findById(userId);
        if (!currentUser) return res.status(401).json({ error: 'User not found' });

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const isAdmin = currentUser.isAdmin === true;
        const isOwnTask = task.author.toString() === userId;

        // 普通用户不能审核任何任务（包括自己的）
        if (!isAdmin) {
            return res.status(403).json({ error: '只有管理员可以审核任务' });
        }

        // 已经审核通过的任务不能再审核
        if (task.status === 'approved') {
            return res.status(400).json({ error: 'This task has already been approved' });
        }

        if (action === 'reject') {
            task.status = 'rejected';
            task.rejectionReason = '被管理员拒绝';
            await task.save();

            // 通知任务作者
            const { createNotificationInternal } = await import('./notificationController');
            await createNotificationInternal(
                task.author.toString(),
                'task_rejected',
                undefined,
                taskId as string,
                `您发布的任务"${task.title}"未通过审核`
            );

            return res.json({ message: 'Task rejected', task });
        }

        // 审核通过逻辑（管理员，包括自审）
        task.status = 'approved';
        task.approvedBy = currentUser._id as any;
        task.approvedAt = new Date();
        await task.save();

        // 如果是社团活动，创建团长的Host执行记录
        if (task.clubId) {
            const existingHostExecution = await TaskExecution.findOne({
                task: task._id,
                'coopContext.isHost': true
            });

            if (!existingHostExecution) {
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

                // 判断活动是否已开始，决定初始状态
                const now = new Date();
                const startDate = task.timeConfig?.eventStartDate ? new Date(task.timeConfig.eventStartDate) : null;
                const isStarted = startDate && now >= startDate;
                const executionStatus = isStarted ? 'ongoing' : 'scheduled';

                await TaskExecution.create({
                    user: task.author,
                    task: task._id,
                    status: executionStatus,
                    prepProgress,
                    completedNodes: [],
                    coopContext: {
                        isHost: true,
                        participants: [task.author]
                    }
                });
            }
        }

        // 通知任务作者（审核通过）
        const { createNotificationInternal } = await import('./notificationController');
        await createNotificationInternal(
            task.author.toString(),
            'task_approved',
            undefined,
            taskId as string,
            `您发布的任务"${task.title}"已通过审核`
        );

        // 如果是自审，给个提示
        const message = isOwnTask
            ? '您的任务已通过自审（管理员权限）'
            : 'Task approved by administrator';

        return res.json({ message, task });
    } catch (error) {
        console.error('reviewTask error:', error);
        res.status(400).json({ error: 'Failed to review task' });
    }
};

// GET /tasks/pending - 获取待审核任务列表
export const getPendingTasks = async (req: AuthRequest, res: Response) => {
    try {
        const tasks = await Task.find({ status: 'pending' })
            .populate('author', 'username avatarUrl level')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending tasks' });
    }
};

// POST /tasks/:id/report - 举报任务
const REPORT_THRESHOLD = 5; // 5人举报自动拒绝
const DAILY_REPORT_LIMIT = 5; // 每日举报限制

// 检查并更新用户每日举报次数
const checkAndUpdateDailyReportLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number }> => {
    const user = await User.findById(userId);
    if (!user) return { allowed: false, remaining: 0 };

    // 管理员不受举报次数限制
    if (user.isAdmin) {
        return { allowed: true, remaining: 999 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastReportDate = user.lastReportDate ? new Date(user.lastReportDate) : null;
    const isNewDay = !lastReportDate || lastReportDate < today;

    if (isNewDay) {
        // 新的一天，重置计数
        user.dailyReportCount = 1;
        user.lastReportDate = new Date();
        await user.save();
        return { allowed: true, remaining: DAILY_REPORT_LIMIT - 1 };
    }

    if (user.dailyReportCount >= DAILY_REPORT_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    user.dailyReportCount += 1;
    await user.save();
    return { allowed: true, remaining: DAILY_REPORT_LIMIT - user.dailyReportCount };
};

export const reportTask = async (req: AuthRequest, res: Response) => {
    try {
        const taskId = req.params.id;
        const userId = req.userId;

        // 检查每日举报限制
        const reportLimit = await checkAndUpdateDailyReportLimit(userId as string);
        if (!reportLimit.allowed) {
            return res.status(400).json({
                error: '您今日的举报次数已用完（每日限5次），请明天再试',
                code: 'DAILY_REPORT_LIMIT_EXCEEDED'
            });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // 注释掉自我举报限制，方便测试
        // if (task.author.toString() === userId) {
        //     return res.status(400).json({ error: '不能举报自己的任务' });
        // }

        // 检查是否已经举报过
        if (task.reportedBy && task.reportedBy.some(uid => uid.toString() === userId)) {
            return res.status(400).json({ error: '您已经举报过此任务' });
        }

        // 添加到举报列表
        if (!task.reportedBy) task.reportedBy = [];
        task.reportedBy.push(userId as any);
        task.reportCount = task.reportedBy.length;

        await task.save();

        // 创建举报记录
        const newReport = await Report.create({
            reporter: userId,
            targetType: 'task',
            targetId: taskId,
            status: 'pending'
        });
        console.log('Created report:', newReport._id, 'for task:', taskId);

        return res.json({
            message: '举报已记录，我们将尽快处理',
            reportCount: task.reportCount,
            dailyReportRemaining: reportLimit.remaining
        });
    } catch (error) {
        console.error('reportTask error:', error);
        res.status(400).json({ error: 'Failed to report task' });
    }
};

// DELETE /tasks/:id - 软删除任务
export const deleteTask = async (req: AuthRequest, res: Response) => {
    try {
        const taskId = req.params.id;
        const userId = req.userId;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const User = (await import('../models/User')).default;
        const currentUser = await User.findById(userId);
        if (!currentUser) return res.status(401).json({ error: 'User not found' });

        // 检查权限：只有作者或管理员可以删除
        const isAuthor = task.author.toString() === userId;
        const isAdmin = currentUser.isAdmin === true;

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'You do not have permission to delete this task' });
        }

        // 软删除
        task.isDeleted = true;
        await task.save();

        res.json({ message: 'Task deleted successfully (soft delete)', taskId });
    } catch (error) {
        console.error('deleteTask error:', error);
        res.status(400).json({ error: 'Failed to delete task', details: error });
    }
};

// POST /tasks/:id/like - 切换任务点赞状态
export const likeTask = async (req: AuthRequest, res: Response) => {
    try {
        const taskId = req.params.id;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Please login to like tasks' });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // 检查用户是否已点赞（收藏）
        const likeIndex = task.likes.findIndex(uid => uid.toString() === userId);

        // Event Task Check - 活动结束后不能收藏（取消收藏不受限制，活动开始前可以收藏）
        if (task.timeConfig?.isEventTask && likeIndex === -1) {
            const now = new Date();
            const end = task.timeConfig.eventEndDate ? new Date(task.timeConfig.eventEndDate) : null;

            if (end && now > end) {
                return res.status(400).json({ error: '活动已结束，无法收藏' });
            }
        }

        let isLiked: boolean;

        if (likeIndex > -1) {
            // 已点赞，取消点赞
            task.likes.splice(likeIndex, 1);
            isLiked = false;
        } else {
            // 未点赞，添加点赞
            task.likes.push(userId as any);
            isLiked = true;
        }

        await task.save();

        res.json({
            isLiked,
            likeCount: task.likes.length
        });
    } catch (error) {
        console.error('likeTask error:', error);
        res.status(400).json({ error: 'Failed to toggle like' });
    }
};

// GET /tasks/reported - 获取被举报的任务列表（仅管理员）
export const getReportedTasks = async (req: AuthRequest, res: Response) => {
    try {
        // 权限检查：仅管理员可访问
        const currentUser = await User.findById(req.userId);
        if (!currentUser?.isAdmin) {
            return res.status(403).json({ error: '无权限访问' });
        }

        const tasks = await Task.find({ reportCount: { $gt: 0 } })
            .populate('author', 'username avatarUrl level')
            .populate('reportedBy', 'username avatarUrl')
            .sort({ reportCount: -1, createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        console.error('getReportedTasks error:', error);
        res.status(500).json({ error: 'Failed to fetch reported tasks' });
    }
};

// POST /tasks/:id/report-action - 处理举报（仅管理员）
export const handleTaskReport = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body; // action: 'dismiss' | 'accept'

        // 权限检查：仅管理员可操作
        const currentUser = await User.findById(req.userId);
        if (!currentUser?.isAdmin) {
            return res.status(403).json({ error: '无权限操作' });
        }

        if (!['dismiss', 'accept'].includes(action)) {
            return res.status(400).json({ error: '无效的操作类型' });
        }

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ error: '任务不存在' });
        }

        if (action === 'dismiss') {
            // 驳回举报：清空举报记录
            task.reportedBy = [];
            task.reportCount = 0;
            await task.save();

            return res.json({
                message: '举报已驳回',
                reason: reason || '经审核，该内容不违规'
            });
        } else {
            // 接受举报：下架内容
            task.status = 'rejected';
            task.rejectionReason = reason || '因被举报违规，已下架';
            task.isDeleted = true;
            await task.save();

            // 通知作者
            const { createNotificationInternal } = await import('./notificationController');
            await createNotificationInternal(
                task.author.toString(),
                'task_removed',
                undefined,
                id as string,
                `您的任务"${task.title}"因被举报已下架${reason ? '，原因：' + reason : ''}`
            );

            return res.json({
                message: '举报已接受，任务已下架',
                task
            });
        }
    } catch (error) {
        console.error('handleTaskReport error:', error);
        res.status(500).json({ error: 'Failed to handle report' });
    }
};

// GET /tasks/random
export const getRandomTask = async (req: AuthRequest, res: Response) => {
    try {
        const { city } = req.query;
        const userId = req.userId;

        // 1. Get excluded task IDs (joined or saved)
        const excludedTaskIds: any[] = [];

        if (userId) {
            // Finished or ongoing executions
            const executions = await TaskExecution.find({ user: userId }).select('task');
            executions.forEach(exec => excludedTaskIds.push(exec.task));

            // Saved tasks
            const User = (await import('../models/User')).default;
            const currentUser = await User.findById(userId).select('savedTasks');
            if (currentUser && currentUser.savedTasks) {
                // @ts-ignore
                excludedTaskIds.push(...currentUser.savedTasks);
            }
        }

        // 2. Build Aggregation Pipeline
        const pipeline: any[] = [];

        // Match basic criteria
        const matchStage: any = {
            status: 'approved',
            isDeleted: { $ne: true },
            taskType: { $ne: 'serendipity' }, // 排除奇遇任务
            clubId: { $exists: false }, // 排除社团任务
            _id: { $nin: excludedTaskIds }
        };

        if (city && city !== '全国' && city !== '不限') {
            // Flexible matching for city name (ignoring 'City'/'市' suffix and case)
            // e.g., "北京市" will search for "北京"
            const cityName = (city as string).replace(/市$|City$/i, '');
            matchStage.targetCities = { $regex: new RegExp(cityName, 'i') };
        }

        pipeline.push({ $match: matchStage });

        // Score Calculation
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        pipeline.push({
            $addFields: {
                // Calculate like count
                likeCount: { $size: { $ifNull: ["$likes", []] } },
                // Calculate freshness score (1 if recent, 0 if not)
                isRecent: { $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0] },
                // Calculate official score (1 if official, 0 if not)
                isOfficialScore: { $cond: ["$isOfficial", 1, 0] }
            }
        });

        pipeline.push({
            $addFields: {
                totalScore: {
                    $add: [
                        1, // Base score
                        { $multiply: ["$isOfficialScore", 10] }, // Official + 10
                        { $divide: ["$likeCount", 10] }, // Likes/10
                        { $multiply: ["$isRecent", 5] } // Recent + 5
                    ]
                }
            }
        });

        // Sort by score
        pipeline.push({ $sort: { totalScore: -1 } });

        // Limit to top 20 pool
        pipeline.push({ $limit: 20 });

        // Randomly pick 1 from the pool
        pipeline.push({ $sample: { size: 1 } });

        // Lookup author info (since aggregation doesn't auto-populate)
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'authorInfo'
            }
        });

        pipeline.push({
            $unwind: { path: "$authorInfo", preserveNullAndEmptyArrays: true }
        });

        // Project necessary fields
        pipeline.push({
            $project: {
                ...Object.keys((await Task.schema.paths)).reduce((acc: any, key) => { acc[key] = 1; return acc; }, {}), // Keep all fields
                'author': {
                    _id: "$authorInfo._id",
                    username: "$authorInfo.username",
                    avatarUrl: "$authorInfo.avatarUrl",
                    level: "$authorInfo.level"
                }
            }
        });

        const tasks = await Task.aggregate(pipeline);

        if (tasks.length === 0) {
            return res.json(null);
        }

        res.json(tasks[0]);

    } catch (error) {
        console.error('getRandomTask error:', error);
        res.status(500).json({ error: 'Failed to get random task' });
    }
};
