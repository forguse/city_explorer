import { Request, Response } from 'express';
import Team from '../models/Team';
import Task from '../models/Task';
import User from '../models/User';

// 创建团队
export const createTeam = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { taskId, name, timeLimit } = req.body;

        // 验证任务存在
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: '任务不存在' });
        }

        // 生成邀请码
        const code = await (Team as any).generateCode();

        // 创建团队
        const team = new Team({
            name: name || `${task.title} 探索队`,
            code,
            task: taskId,
            members: [{
                user: userId,
                role: 'leader',
                status: 'active',
                completedNodes: [],
                joinedAt: new Date(),
                lastActiveAt: new Date()
            }],
            status: 'preparing',
            progress: 0,
            completedNodes: [],
            totalNodes: task.nodes?.length || 0,
            timeLimit: timeLimit || 7200
        });

        await team.save();

        // 返回填充后的数据
        const populatedTeam = await Team.findById(team._id)
            .populate('task', 'title coverImage nodes location')
            .populate('members.user', 'username avatarUrl');

        res.status(201).json(populatedTeam);
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: '创建团队失败' });
    }
};

// 通过邀请码加入团队
export const joinTeam = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { code } = req.body;

        const team = await Team.findOne({ code });
        if (!team) {
            return res.status(404).json({ error: '团队不存在或邀请码无效' });
        }

        if (team.status !== 'preparing' && team.status !== 'ongoing') {
            return res.status(400).json({ error: '团队已结束，无法加入' });
        }

        // 检查是否已是成员
        const isMember = team.members.some(m => m.user.toString() === userId);
        if (isMember) {
            return res.status(400).json({ error: '你已经是团队成员' });
        }

        // 添加成员
        team.members.push({
            user: userId,
            role: 'member',
            status: 'active',
            completedNodes: [],
            joinedAt: new Date(),
            lastActiveAt: new Date()
        } as any);

        await team.save();

        const populatedTeam = await Team.findById(team._id)
            .populate('task', 'title coverImage nodes location')
            .populate('members.user', 'username avatarUrl');

        res.json(populatedTeam);
    } catch (error) {
        console.error('Join team error:', error);
        res.status(500).json({ error: '加入团队失败' });
    }
};

// 获取我的团队列表
export const getMyTeams = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const teams = await Team.find({ 'members.user': userId })
            .populate('task', 'title coverImage location')
            .populate('members.user', 'username avatarUrl')
            .sort({ updatedAt: -1 });

        res.json(teams);
    } catch (error) {
        console.error('Get my teams error:', error);
        res.status(500).json({ error: '获取团队列表失败' });
    }
};

// 获取单个团队详情
export const getTeamById = async (req: Request, res: Response) => {
    try {
        const { teamId } = req.params;

        const team = await Team.findById(teamId)
            .populate('task', 'title coverImage nodes location description')
            .populate('members.user', 'username avatarUrl');

        if (!team) {
            return res.status(404).json({ error: '团队不存在' });
        }

        res.json(team);
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ error: '获取团队详情失败' });
    }
};

// 开始团队任务
export const startTeam = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { teamId } = req.params;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: '团队不存在' });
        }

        // 检查是否是队长
        const leader = team.members.find(m => m.role === 'leader');
        if (leader?.user.toString() !== userId) {
            return res.status(403).json({ error: '只有队长可以开始任务' });
        }

        if (team.status !== 'preparing') {
            return res.status(400).json({ error: '团队已开始或已结束' });
        }

        team.status = 'ongoing';
        team.startTime = new Date();
        await team.save();

        const populatedTeam = await Team.findById(team._id)
            .populate('task', 'title coverImage nodes location')
            .populate('members.user', 'username avatarUrl');

        res.json(populatedTeam);
    } catch (error) {
        console.error('Start team error:', error);
        res.status(500).json({ error: '开始任务失败' });
    }
};

// 更新成员状态
export const updateMemberStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { teamId } = req.params;
        const { status, location } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: '团队不存在' });
        }

        const memberIndex = team.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1) {
            return res.status(403).json({ error: '你不是团队成员' });
        }

        if (status) {
            team.members[memberIndex].status = status;
        }
        if (location) {
            team.members[memberIndex].location = location;
        }
        team.members[memberIndex].lastActiveAt = new Date();

        await team.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Update member status error:', error);
        res.status(500).json({ error: '更新状态失败' });
    }
};

// 成员完成节点
export const completeNode = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { teamId } = req.params;
        const { nodeIndex } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: '团队不存在' });
        }

        const memberIndex = team.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1) {
            return res.status(403).json({ error: '你不是团队成员' });
        }

        // 添加到成员完成列表
        if (!team.members[memberIndex].completedNodes.includes(nodeIndex)) {
            team.members[memberIndex].completedNodes.push(nodeIndex);
        }

        // 添加到团队完成列表
        if (!team.completedNodes.includes(nodeIndex)) {
            team.completedNodes.push(nodeIndex);
        }

        // 更新进度
        team.progress = Math.round((team.completedNodes.length / team.totalNodes) * 100);

        // 检查是否全部完成
        if (team.completedNodes.length >= team.totalNodes) {
            team.status = 'completed';
            team.endTime = new Date();
        }

        await team.save();

        const populatedTeam = await Team.findById(team._id)
            .populate('task', 'title coverImage nodes location')
            .populate('members.user', 'username avatarUrl');

        res.json(populatedTeam);
    } catch (error) {
        console.error('Complete node error:', error);
        res.status(500).json({ error: '完成节点失败' });
    }
};

// 离开团队
export const leaveTeam = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { teamId } = req.params;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: '团队不存在' });
        }

        const memberIndex = team.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1) {
            return res.status(403).json({ error: '你不是团队成员' });
        }

        const isLeader = team.members[memberIndex].role === 'leader';

        // 移除成员
        team.members.splice(memberIndex, 1);

        // 如果是队长且还有其他成员，转让队长
        if (isLeader && team.members.length > 0) {
            team.members[0].role = 'leader';
        }

        // 如果没有成员了，解散团队
        if (team.members.length === 0) {
            team.status = 'disbanded';
        }

        await team.save();

        res.json({ success: true, disbanded: team.members.length === 0 });
    } catch (error) {
        console.error('Leave team error:', error);
        res.status(500).json({ error: '离开团队失败' });
    }
};

// 发送拍一拍/提醒
export const nudgeMember = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { teamId, targetUserId } = req.params;
        const { type } = req.body; // 'nudge' 或 'remind'

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: '团队不存在' });
        }

        // 验证双方都是成员
        const isMember = team.members.some(m => m.user.toString() === userId);
        const isTargetMember = team.members.some(m => m.user.toString() === targetUserId);

        if (!isMember || !isTargetMember) {
            return res.status(403).json({ error: '无效的操作' });
        }

        // 这里可以发送通知（使用 Notification 模型）
        // 为简化，这里只返回成功
        res.json({ 
            success: true, 
            message: type === 'nudge' ? '拍一拍已发送' : '提醒已发送' 
        });
    } catch (error) {
        console.error('Nudge member error:', error);
        res.status(500).json({ error: '操作失败' });
    }
};

// 邀请好友（生成邀请链接）
export const getInviteLink = async (req: Request, res: Response) => {
    try {
        const { teamId } = req.params;

        const team = await Team.findById(teamId).select('code name');
        if (!team) {
            return res.status(404).json({ error: '团队不存在' });
        }

        res.json({
            code: team.code,
            inviteLink: `${process.env.FRONTEND_URL || 'https://cityexplorer.app'}/join?code=${team.code}`
        });
    } catch (error) {
        console.error('Get invite link error:', error);
        res.status(500).json({ error: '获取邀请链接失败' });
    }
};
