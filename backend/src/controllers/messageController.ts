import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import User from '../models/User';

// GET /messages/:targetUserId - Get conversation with a user
export const getConversation = async (req: AuthRequest, res: Response) => {
    try {
        const { targetUserId } = req.params;
        const currentUserId = req.userId;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: targetUserId },
                { sender: targetUserId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 }).populate('sender', 'username avatarUrl');

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// POST /messages - Send a message (DM or group)
export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { receiverId, groupId, content, type = 'text' } = req.body;

        const message = new Message({
            sender: req.userId,
            receiver: receiverId || null,
            groupId: groupId || null,
            content,
            type
        });

        await message.save();

        // Populate sender info for response
        await message.populate('sender', 'username avatarUrl');

        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: 'Failed to send message', details: error });
    }
};

// GET /messages/conversations - Get list of DM conversations
export const getConversations = async (req: AuthRequest, res: Response) => {
    try {
        const currentUserId = req.userId;

        const messages = await Message.aggregate([
            {
                $match: {
                    groupId: null,
                    $or: [
                        { sender: currentUserId },
                        { receiver: currentUserId }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', currentUserId] },
                            '$receiver',
                            '$sender'
                        ]
                    },
                    lastMessage: { $last: '$$ROOT' }
                }
            },
            { $sort: { 'lastMessage.createdAt': -1 } }
        ]);

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

// GET /messages/group/:groupId - Get group messages (e.g., club chat)
export const getGroupMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;

        const messages = await Message.find({ groupId })
            .sort({ createdAt: 1 })
            .populate('sender', 'username avatarUrl');

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch group messages' });
    }
};

// POST /messages/group/:groupId - Send message to group
export const sendGroupMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const { content, type = 'text' } = req.body;

        const message = new Message({
            sender: req.userId,
            receiver: null,
            groupId,
            content,
            type
        });

        await message.save();
        await message.populate('sender', 'username avatarUrl');

        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: 'Failed to send group message', details: error });
    }
};
