
import express from 'express';
import rateLimit from 'express-rate-limit';
import { uploadMiddleware, uploadImage, uploadBase64Image } from '../controllers/uploadController';
import { auth } from '../middleware/auth';

const router = express.Router();

// 速率限制: 30秒内最多 9 次请求
const uploadLimiter = rateLimit({
    windowMs: 30 * 1000,
    max: 9,
    message: '上传过于频繁，每30秒最多允许上传9张图片。',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }, // 禁用 trust proxy 验证
});

// 上传图片 - 需要登录 + 速率限制
router.post('/', auth, uploadLimiter, uploadMiddleware, uploadImage);

// Base64 上传（用于 Capacitor 环境）
router.post('/base64', auth, uploadLimiter, uploadBase64Image);

export default router;
