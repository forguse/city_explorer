import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// CRITICAL: JWT_SECRET must be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is not set in environment variables. Please set it in .env file.');
}

import InviteCode from '../models/InviteCode';

export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password, inviteCode } = req.body;

        // 1. Validate Invite Code
        if (!inviteCode) {
            return res.status(403).json({ error: '邀请码不能为空 (Invite Code required)' });
        }

        const codeDoc = await InviteCode.findOne({ code: inviteCode });
        if (!codeDoc) {
            return res.status(403).json({ error: '无效的邀请码 (Invalid Invite Code)' });
        }

        if (codeDoc.isUsed) {
            return res.status(403).json({ error: '此邀请码已被使用 (Invite Code Used)' });
        }

        // 2. Check if user exists (by email)
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // 3. Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // 4. Create user
        const user = new User({
            username: username || email.split('@')[0], // Default username from email if not provided
            email,
            passwordHash
        });
        await user.save();

        // 5. Mark code as used
        codeDoc.isUsed = true;
        codeDoc.usedBy = user._id;
        codeDoc.usedAt = new Date();
        await codeDoc.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            error: 'Registration failed',
            ...(process.env.NODE_ENV === 'development' && { details: error })
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user._id, username: user.username, email: user.email, level: user.level, isAdmin: user.isAdmin } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};
