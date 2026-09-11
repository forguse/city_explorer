import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// CRITICAL: JWT_SECRET must be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is not set in environment variables. Please set it in .env file.');
}

// Extend Express Request interface to include userId
export interface AuthRequest extends Request {
    userId?: string;
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        // Check if user still exists
        // Dynamic import to avoid circular dependency if any (though usually fine here)
        const User = (await import('../models/User')).default;
        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new Error();
        }

        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

// 可选认证中间件：有 token 则解析，无 token 也放行
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

            // Check if user exists
            const User = (await import('../models/User')).default;
            const user = await User.findById(decoded.userId);

            if (user) {
                req.userId = decoded.userId;
            }
        }
    } catch (err) {
        // Token 无效时忽略，继续执行
    }
    next();
};
