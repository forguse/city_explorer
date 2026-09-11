import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await Notification.find({ recipient: req.userId })
            .sort({ createdAt: -1 })
            .populate('sender', 'username avatarUrl')
            .limit(50); // Limit to last 50

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (id === 'all') {
            await Notification.updateMany(
                { recipient: req.userId, isRead: false },
                { $set: { isRead: true } }
            );
        } else {
            await Notification.updateOne(
                { _id: id, recipient: req.userId },
                { $set: { isRead: true } }
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

import User from '../models/User';

// ... existing imports ...

// ... existing code ...

// Helper for other controllers
export const createNotificationInternal = async (
    recipientId: string,
    type: 'like' | 'comment' | 'invite' | 'friend_request' | 'task_invite' |
          'task_approved' | 'task_rejected' | 'task_removed' | 'task_milestone' |
          'post_approved' | 'post_rejected' | 'post_removed' |
          'report_approved' | 'report_rejected' |
          'self_task_completed' | 'friend_accepted' | 'system',
    senderId?: string,
    referenceId?: string,
    content?: string
) => {
    try {
        // Check user preferences
        const recipient = await User.findById(recipientId);
        if (!recipient) return;

        // If notificationSettings exists and the specific type is disabled, skip
        if (recipient.preferences?.notificationSettings) {
            if (recipient.preferences.notificationSettings[type] === false) {
                return;
            }
        } else if (recipient.preferences?.notifications === false) {
            // Fallback to global setting if specific settings don't exist yet (backward compatibility)
            return;
        }

        // Avoid duplicate likes
        if (type === 'like' && senderId && referenceId) {
            const existing = await Notification.findOne({
                recipient: recipientId,
                sender: senderId,
                type: 'like',
                referenceId: referenceId
            });
            if (existing) return;
        }

        const notification = new Notification({
            recipient: recipientId,
            sender: senderId,
            type,
            referenceId,
            content
        });
        await notification.save();
    } catch (e) {
        console.error('Failed to create notification', e);
    }
};
