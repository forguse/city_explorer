import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Feedback from '../models/Feedback';
import User from '../models/User';
import { createNotificationInternal } from './notificationController';

// POST /feedback - 提交反馈/申诉
export const createFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { type, relatedId, content } = req.body;
        const userId = req.userId;

        if (!content || content.trim().length < 10) {
            return res.status(400).json({ error: '反馈内容至少需要10个字符' });
        }

        if (!type || !['task_report', 'post_report', 'task_rejection', 'post_deletion', 'other'].includes(type)) {
            return res.status(400).json({ error: '无效的反馈类型' });
        }

        const feedback = await Feedback.create({
            user: userId,
            type,
            relatedId,
            content: content.trim(),
            status: 'pending'
        });

        res.status(201).json({
            message: '反馈提交成功，管理员会尽快处理',
            feedback
        });
    } catch (error) {
        console.error('createFeedback error:', error);
        res.status(400).json({ error: '提交反馈失败' });
    }
};

// GET /feedback - 获取用户自己的反馈列表
export const getMyFeedbacks = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;

        const feedbacks = await Feedback.find({ user: userId })
            .populate('processedBy', 'username')
            .sort({ createdAt: -1 });

        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ error: '获取反馈列表失败' });
    }
};

// GET /feedback/admin - 管理员获取所有待处理反馈
export const getAllFeedbacks = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const currentUser = await User.findById(userId);

        if (!currentUser || !currentUser.isAdmin) {
            return res.status(403).json({ error: '只有管理员可以查看所有反馈' });
        }

        const { status } = req.query;
        const query: any = {};
        if (status) query.status = status;

        const feedbacks = await Feedback.find(query)
            .populate('user', 'username avatarUrl')
            .populate('processedBy', 'username')
            .sort({ createdAt: -1 });

        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ error: '获取反馈列表失败' });
    }
};

// PUT /feedback/:id/process - 管理员处理反馈
export const processFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, adminNote, compensation } = req.body;
        const userId = req.userId;

        const currentUser = await User.findById(userId);
        if (!currentUser || !currentUser.isAdmin) {
            return res.status(403).json({ error: '只有管理员可以处理反馈' });
        }

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: '无效的处理状态' });
        }

        const feedback = await Feedback.findById(id);
        if (!feedback) {
            return res.status(404).json({ error: '反馈不存在' });
        }

        if (feedback.status !== 'pending') {
            return res.status(400).json({ error: '该反馈已经处理过了' });
        }

        // 更新反馈状态
        feedback.status = status;
        feedback.processedBy = userId as any;
        feedback.processedAt = new Date();
        feedback.adminNote = adminNote;

        // 处理补偿
        if (status === 'approved' && compensation) {
            feedback.compensation = compensation;

            // 给用户发放补偿（这里是一个简单示例，可以根据需要扩展）
            const userToCompensate = await User.findById(feedback.user);
            if (userToCompensate && compensation.type === 'points') {
                // 假设用户有points字段，如果没有可以根据实际情况调整
                userToCompensate.points = (userToCompensate.points || 0) + (compensation.amount || 0);
                await userToCompensate.save();
            }

            // 通知用户补偿结果
            await createNotificationInternal(
                feedback.user.toString(),
                'system',
                undefined,
                undefined,
                `您的反馈已被管理员采纳，${compensation.type === 'points' ? `获得${compensation.amount}积分补偿` : '已收到补偿'}。${adminNote ? '管理员留言：' + adminNote : ''}`
            );
        } else if (status === 'rejected') {
            // 通知用户反馈被拒绝
            await createNotificationInternal(
                feedback.user.toString(),
                'system',
                undefined,
                undefined,
                `您的反馈已被处理，未通过审核。${adminNote ? '原因：' + adminNote : ''}`
            );
        } else {
            // 通过但无补偿
            await createNotificationInternal(
                feedback.user.toString(),
                'system',
                undefined,
                undefined,
                `您的反馈已被管理员采纳处理。${adminNote ? '管理员留言：' + adminNote : ''}`
            );
        }

        await feedback.save();

        res.json({
            message: '反馈处理成功',
            feedback
        });
    } catch (error) {
        console.error('processFeedback error:', error);
        res.status(400).json({ error: '处理反馈失败' });
    }
};
