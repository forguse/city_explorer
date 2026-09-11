import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Report from '../models/Report';
import Task from '../models/Task';
import Post from '../models/Post';
import User from '../models/User';
import { createNotificationInternal } from './notificationController';

// 管理员权限检查中间件
const checkAdmin = async (userId: string): Promise<boolean> => {
    const user = await User.findById(userId);
    return user?.isAdmin === true;
};

// GET /reports - 获取所有待处理的举报（仅管理员）
export const getReports = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        console.log('getReports called by userId:', userId);

        // 检查管理员权限
        const isAdmin = await checkAdmin(userId as string);
        console.log('isAdmin:', isAdmin);
        if (!isAdmin) {
            return res.status(403).json({ error: '无权访问，仅管理员可用' });
        }

        const requestedStatus = typeof req.query.status === 'string' ? req.query.status : 'pending';
        const allowedStatuses = ['pending', 'approved', 'rejected'] as const;
        if (!allowedStatuses.includes(requestedStatus as typeof allowedStatuses[number])) {
            return res.status(400).json({ error: '无效的举报状态' });
        }
        const status = requestedStatus as typeof allowedStatuses[number];
        console.log('Fetching reports with status:', status);

        const reports = await Report.find({ status })
            .populate('reporter', 'username avatarUrl')
            .populate('processedBy', 'username')
            .sort({ createdAt: -1 });

        console.log('Found reports count:', reports.length);

        // 获取被举报内容的详细信息
        const reportsWithDetails = await Promise.all(reports.map(async (report) => {
            let targetDetails = null;

            if (report.targetType === 'task') {
                targetDetails = await Task.findById(report.targetId)
                    .populate('author', 'username avatarUrl')
                    .select('title description coverImageUrl author reportCount status isDeleted');
            } else if (report.targetType === 'post') {
                targetDetails = await Post.findById(report.targetId)
                    .populate('author', 'username avatarUrl')
                    .select('content imageUrls author reportCount status');
            }

            return {
                ...report.toObject(),
                targetDetails
            };
        }));

        console.log('Returning reports with details:', reportsWithDetails.length);
        res.json(reportsWithDetails);
    } catch (error) {
        console.error('getReports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

// POST /reports/:id/approve - 接受举报，下架内容（仅管理员）
export const approveReport = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        // 检查管理员权限
        if (!await checkAdmin(userId as string)) {
            return res.status(403).json({ error: '无权访问，仅管理员可用' });
        }

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({ error: '举报记录不存在' });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ error: '该举报已被处理' });
        }

        // 下架被举报的内容
        let authorId: string | null = null;
        let contentTitle = '';

        if (report.targetType === 'task') {
            const task = await Task.findById(report.targetId);
            if (task) {
                task.isDeleted = true;
                task.status = 'rejected';
                await task.save();
                authorId = task.author.toString();
                contentTitle = task.title;
            }
        } else if (report.targetType === 'post') {
            const post = await Post.findById(report.targetId);
            if (post) {
                post.status = 'rejected';
                await post.save();
                authorId = post.author.toString();
                contentTitle = post.content.substring(0, 20) + '...';
            }
        }

        // 更新举报状态
        report.status = 'approved';
        report.processedBy = userId as any;
        report.processedAt = new Date();
        await report.save();

        // 通知内容作者
        if (authorId) {
            await createNotificationInternal(
                authorId,
                report.targetType === 'task' ? 'task_removed' : 'post_removed',
                undefined,
                report.targetId.toString(),
                `您的${report.targetType === 'task' ? '任务' : '帖子'}「${contentTitle}」因被举报已被下架`
            );
        }

        // 通知举报者
        await createNotificationInternal(
            report.reporter.toString(),
            'report_approved',
            undefined,
            report.targetId.toString(),
            `您举报的${report.targetType === 'task' ? '任务' : '帖子'}已被处理`
        );

        res.json({ message: '举报已处理，内容已下架', report });
    } catch (error) {
        console.error('approveReport error:', error);
        res.status(500).json({ error: 'Failed to approve report' });
    }
};

// POST /reports/:id/reject - 驳回举报（仅管理员）
export const rejectReport = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { reason } = req.body;

        // 检查管理员权限
        if (!await checkAdmin(userId as string)) {
            return res.status(403).json({ error: '无权访问，仅管理员可用' });
        }

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({ error: '举报记录不存在' });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ error: '该举报已被处理' });
        }

        // 更新举报状态
        report.status = 'rejected';
        report.adminNote = reason || '举报内容不违规';
        report.processedBy = userId as any;
        report.processedAt = new Date();
        await report.save();

        // 通知举报者
        await createNotificationInternal(
            report.reporter.toString(),
            'report_rejected',
            undefined,
            report.targetId.toString(),
            `您举报的${report.targetType === 'task' ? '任务' : '帖子'}经审核未违规`
        );

        res.json({ message: '举报已驳回', report });
    } catch (error) {
        console.error('rejectReport error:', error);
        res.status(500).json({ error: 'Failed to reject report' });
    }
};

// GET /reports/stats - 获取举报统计（仅管理员）
export const getReportStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;

        // 检查管理员权限
        if (!await checkAdmin(userId as string)) {
            return res.status(403).json({ error: '无权访问，仅管理员可用' });
        }

        const pendingCount = await Report.countDocuments({ status: 'pending' });
        const approvedCount = await Report.countDocuments({ status: 'approved' });
        const rejectedCount = await Report.countDocuments({ status: 'rejected' });

        res.json({
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
            total: pendingCount + approvedCount + rejectedCount
        });
    } catch (error) {
        console.error('getReportStats error:', error);
        res.status(500).json({ error: 'Failed to fetch report stats' });
    }
};
