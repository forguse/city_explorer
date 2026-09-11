
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Proverb from '../models/Proverb';
import User from '../models/User';

// GET /proverbs/my
export const getMyProverbs = async (req: AuthRequest, res: Response) => {
    try {
        const { type } = req.query; // 'received' | 'sent' | 'gift'
        const filter: any = {};

        if (type === 'sent') {
            filter.author = req.userId;
        } else {
            // Default to received
            filter.recipient = req.userId;
        }

        const proverbs = await Proverb.find(filter)
            .populate('author', 'username avatarUrl')
            .populate('recipient', 'username avatarUrl')
            .sort({ createdAt: -1 });

        res.json(proverbs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch proverbs' });
    }
};

// POST /proverbs
// Used for return gifts primarily
export const createProverb = async (req: AuthRequest, res: Response) => {
    try {
        const { content, recipientId, isReturnGift, originId, originType } = req.body;

        const proverb = new Proverb({
            content,
            author: req.userId,
            recipient: recipientId,
            originType: originType || 'direct_gift',
            originId,
            isReturnGift: !!isReturnGift
        });

        await proverb.save();
        res.status(201).json(proverb);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create proverb' });
    }
};

// DELETE /proverbs/:id
export const deleteProverb = async (req: AuthRequest, res: Response) => {
    try {
        const proverb = await Proverb.findOneAndDelete({
            _id: req.params.id,
            recipient: req.userId // Only recipient can delete received messages
        });

        if (!proverb) return res.status(404).json({ error: 'Proverb not found or unauthorized' });
        res.json({ message: 'Proverb deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete proverb' });
    }
};

// POST /proverbs/:id/report
export const reportProverb = async (req: AuthRequest, res: Response) => {
    try {
        const proverb = await Proverb.findByIdAndUpdate(
            req.params.id,
            { $inc: { reports: 1 } },
            { new: true }
        );
        res.json({ message: 'Reported successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to report' });
    }
};

// GET /proverbs/lbs
// Get random proverb at location
export const getLBSProverb = async (req: AuthRequest, res: Response) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: 'Location required' });

        // Logic to find proverbs dropped near this location
        // For now, simpler implementation: find any proverb with LBS origin near here
        // In real app, use $near sphere
        // Simulating probability: 30% chance to find one if exists

        if (Math.random() > 0.3) {
            return res.json({ found: false }); // Not lucky enough
        }

        // Mock finding one for now since we don't have many LBS proverbs yet
        // In fully implemented version:
        /*
        const nearby = await Proverb.findOne({
            originType: 'lbs_discovery',
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                    $maxDistance: 100
                }
            }
        });
        */

        // Return a mock LBS proverb or empty
        res.json({ found: false });
    } catch (error) {
        res.status(500).json({ error: 'LBS error' });
    }
};
