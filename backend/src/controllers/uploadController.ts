
import { Request, Response } from 'express';
import multer from 'multer';
import { StorageFactory } from '../services/fileStorage/StorageFactory';
import { AuthRequest } from '../middleware/auth';

import sharp from 'sharp';

// 允许的图片扩展名白名单
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 图片文件头魔数（用于验证真实文件类型）
const IMAGE_SIGNATURES: { [key: string]: number[][] } = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP starts with RIFF)
};

// 验证文件头魔数
const validateFileSignature = (buffer: Buffer, mimetype: string): boolean => {
    const signatures = IMAGE_SIGNATURES[mimetype];
    if (!signatures) return false;

    return signatures.some(signature => {
        for (let i = 0; i < signature.length; i++) {
            if (buffer[i] !== signature[i]) return false;
        }
        return true;
    });
};

// 文件过滤
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // 1. 检查 MIME 类型
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'));
    }

    // 2. 检查文件扩展名
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error(`File extension ${ext} is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }

    cb(null, true);
};

// 使用 MemoryStorage，这样 Controller 可以拿到 Buffer
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit (Strict user requirement)
    }
});

export const uploadMiddleware = upload.single('image');

export const uploadImage = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }

        // 3. 验证文件头魔数（防止伪造扩展名）
        if (!validateFileSignature(req.file.buffer, req.file.mimetype)) {
            return res.status(400).json({
                error: 'Invalid file: file content does not match declared type'
            });
        }

        // Image Compression (Defense in Depth)
        try {
            const sharpInstance = sharp(req.file.buffer)
                .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true });

            // Preserve format: PNG for transparency, JPEG for photos
            let compressedBuffer: Buffer;
            let outputMimetype: string;

            if (req.file.mimetype === 'image/png') {
                // PNG: Preserve transparency
                compressedBuffer = await sharpInstance
                    .png({ quality: 80, compressionLevel: 9 })
                    .toBuffer();
                outputMimetype = 'image/png';
            } else {
                // JPEG/WebP/Others: Convert to JPEG for better compression
                compressedBuffer = await sharpInstance
                    .jpeg({ quality: 80, mozjpeg: true })
                    .toBuffer();
                outputMimetype = 'image/jpeg';
            }

            // Check size limit (1MB)
            if (compressedBuffer.length > 1 * 1024 * 1024) {
                return res.status(400).json({ error: 'Image too large (max 1MB after compression)' });
            }

            // Update file object
            req.file.buffer = compressedBuffer;
            req.file.size = compressedBuffer.length;
            req.file.mimetype = outputMimetype;
        } catch (err) {
            console.error('Compression error:', err);
            return res.status(500).json({ error: 'Image processing failed' });
        }

        const userId = req.userId ? String(req.userId) : 'anonymous';

        // 使用工厂获取服务（Local or OSS）
        const storageService = StorageFactory.getService();

        // 上传到 images/{userId} 目录
        const result = await storageService.upload(req.file, `images/${userId}`);

        // 返回相对路径，前端会根据 API_URL 拼接完整 URL
        res.status(200).json({
            message: 'Upload successful',
            ...result  // result.url 是相对路径 /uploads/...
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            ...(process.env.NODE_ENV === 'development' && {
                details: error instanceof Error ? error.message : String(error)
            })
        });
    }
};

/**
 * Base64 图片上传（用于 Capacitor 环境，绕过 CORS）
 * 接受 JSON 格式：{ image: "data:image/jpeg;base64,..." } 或 { image: "base64字符串" }
 */
export const uploadBase64Image = async (req: AuthRequest, res: Response) => {
    try {
        const { image } = req.body;

        if (!image || typeof image !== 'string') {
            return res.status(400).json({ error: 'Please provide a base64 image' });
        }

        // 解析 base64 数据
        let base64Data: string;
        let mimetype: string = 'image/jpeg';

        if (image.startsWith('data:')) {
            // 格式: data:image/jpeg;base64,/9j/4AAQ...
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                return res.status(400).json({ error: 'Invalid base64 format' });
            }
            mimetype = matches[1];
            base64Data = matches[2];
        } else {
            // 纯 base64 字符串
            base64Data = image;
        }

        // 转换为 Buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // 验证文件大小（10MB 限制）
        if (buffer.length > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large (max 10MB)' });
        }

        // 验证文件头魔数
        if (!validateFileSignature(buffer, mimetype)) {
            // 尝试检测实际类型
            const detectedType = Object.keys(IMAGE_SIGNATURES).find(type =>
                validateFileSignature(buffer, type)
            );
            if (detectedType) {
                mimetype = detectedType;
            } else {
                return res.status(400).json({ error: 'Invalid image format' });
            }
        }

        // 图片压缩
        const sharpInstance = sharp(buffer)
            .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true });

        let compressedBuffer: Buffer;
        let outputMimetype: string;

        if (mimetype === 'image/png') {
            compressedBuffer = await sharpInstance
                .png({ quality: 80, compressionLevel: 9 })
                .toBuffer();
            outputMimetype = 'image/png';
        } else {
            compressedBuffer = await sharpInstance
                .jpeg({ quality: 80, mozjpeg: true })
                .toBuffer();
            outputMimetype = 'image/jpeg';
        }

        // 检查压缩后大小
        if (compressedBuffer.length > 1 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large (max 1MB after compression)' });
        }

        const userId = req.userId ? String(req.userId) : 'anonymous';
        const storageService = StorageFactory.getService();

        // 创建一个模拟的 file 对象
        const ext = outputMimetype === 'image/png' ? '.png' : '.jpg';
        const fakeFile: Express.Multer.File = {
            fieldname: 'image',
            originalname: `upload${ext}`,
            encoding: '7bit',
            mimetype: outputMimetype,
            buffer: compressedBuffer,
            size: compressedBuffer.length,
            destination: '',
            filename: '',
            path: '',
            stream: null as any
        };

        const result = await storageService.upload(fakeFile, `images/${userId}`);
        console.log('[uploadBase64Image] Upload result:', JSON.stringify(result));

        res.status(200).json({
            message: 'Upload successful',
            ...result
        });
    } catch (error) {
        console.error('Base64 upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            ...(process.env.NODE_ENV === 'development' && {
                details: error instanceof Error ? error.message : String(error)
            })
        });
    }
};
