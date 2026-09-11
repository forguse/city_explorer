
import { useState } from 'react';
import { utils as utilApi } from '../../services/api';
import { compressImage } from '../utils/imageCompression';

interface UploadResult {
    url: string;
    filename?: string;
}

// 检测是否在 Capacitor 环境中
// @ts-ignore
const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;

// 将文件转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface UploadResponse {
    url: string | null;
    error: string | null;
}

export const useImageUpload = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const upload = async (file: File): Promise<UploadResponse> => {
        setLoading(true);
        setError(null);
        setProgress(0);

        const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
        console.log(`[useImageUpload] Original file: ${file.name}, size: ${originalSizeMB}MB, type: ${file.type}`);

        try {
            // 1. 压缩图片 (放宽到 2MB)
            const compressedFile = await compressImage(file, { maxSizeMB: 2 });
            const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
            console.log(`[useImageUpload] Compressed size: ${compressedSizeMB}MB`);

            // 双重检查大小 (防止压缩后仍过大)
            if (compressedFile.size > 10 * 1024 * 1024) {
                throw new Error(`图片过大 (${compressedSizeMB}MB)，无法上传 (限制10MB)`);
            }

            let response;

            // 2. 根据环境选择上传方式
            if (isCapacitor) {
                // Capacitor 环境：使用 base64 上传
                console.log('[useImageUpload] Using base64 upload for Capacitor');
                const base64 = await fileToBase64(compressedFile);
                console.log(`[useImageUpload] Base64 length: ${base64.length}`);
                response = await utilApi.uploadBase64(base64);
                console.log('[useImageUpload] Base64 upload response:', JSON.stringify(response.data));
            } else {
                // Web 环境：使用 FormData 上传
                console.log('[useImageUpload] Using FormData upload for Web');
                const formData = new FormData();
                formData.append('image', compressedFile);
                response = await utilApi.upload(formData);
                console.log('[useImageUpload] FormData upload response:', JSON.stringify(response.data));
            }

            if (response.data && response.data.url) {
                // 直接返回相对路径，存储到数据库
                // 前端显示时会根据当前主机动态拼接
                return { url: response.data.url, error: null };
            } else {
                throw new Error('服务器未返回图片地址');
            }

        } catch (err: any) {
            console.error('Upload hook error:', err);
            let errorMsg = '上传失败，请重试';

            // 处理特定状态码
            if (err.response?.status === 429) {
                errorMsg = '上传过于频繁，请休息一下再试 (30秒限9张)';
            } else if (err.response?.status === 400) {
                errorMsg = err.response.data?.error || '图片格式不支持';
            } else if (err.response?.data?.error) {
                errorMsg = err.response.data.error;
            } else if (err.message) {
                errorMsg = err.message;
            }

            // 添加原始文件大小信息
            if (!errorMsg.includes('MB')) {
                errorMsg += ` (原图: ${originalSizeMB}MB)`;
            }

            setError(errorMsg);
            return { url: null, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    return { upload, loading, error, progress };
};
