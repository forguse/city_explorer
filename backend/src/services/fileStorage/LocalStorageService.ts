
import fs from 'fs';
import path from 'path';
import { IFileStorageService, IUploadResult } from './IFileStorage';

export class LocalStorageService implements IFileStorageService {
    private uploadDir: string;
    private baseUrl: string;

    constructor() {
        this.uploadDir = 'uploads';
        // 优先使用 CDN_URL，否则回落到 APP_BASE_URL
        this.baseUrl = process.env.CDN_URL || process.env.APP_BASE_URL || 'http://localhost:5000';

        // Ensure base upload dir exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async upload(file: Express.Multer.File, folder: string = 'common'): Promise<IUploadResult> {
        // 1. Construct path: uploads/{folder}/{timestamp}-{random}-{filename}
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const uniqueFilename = `${timestamp}-${random}-${safeFilename}`;

        // 2. Create nested directory
        const targetDir = path.join(this.uploadDir, folder);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 3. Write file
        const filePath = path.join(targetDir, uniqueFilename);
        fs.writeFileSync(filePath, file.buffer);

        // 4. Construct Public URL
        // 返回相对路径，让前端根据所访问的主机自动构建完整 URL
        // 这解决了手机通过局域网访问时 localhost 无法解析的问题
        const relativePath = `${folder}/${uniqueFilename}`;
        // Normalize slashes for URL
        const urlPath = relativePath.replace(/\\/g, '/');

        // 只返回路径，前端会使用当前访问的主机
        const fullUrl = `/uploads/${urlPath}`;

        return {
            url: fullUrl,
            path: `uploads/${relativePath}`, // Key for storage
            filename: uniqueFilename,
            mimetype: file.mimetype,
            size: file.size
        };
    }

    async delete(filePath: string): Promise<void> {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
}
