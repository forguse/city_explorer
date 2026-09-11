
import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
}

/**
 * 压缩图片
 * 默认配置：最大2MB，最大宽/高2560px
 */
export const compressImage = async (file: File, options?: CompressionOptions): Promise<File> => {
    // 如果不是图片，直接返回
    if (!file.type.startsWith('image/')) {
        return file;
    }

    const defaultOptions = {
        maxSizeMB: 2, // 放宽到 2MB
        maxWidthOrHeight: 2560, // 放宽尺寸限制
        useWebWorker: false, // 禁用 Web Worker 以避免 CSP 冲突
        fileType: file.type // 保持原有格式
    };

    const config = { ...defaultOptions, ...options };

    try {
        const compressedFile = await imageCompression(file, config);

        // 总是使用原始文件名创建新的 File 对象
        // 修复移动端和某些浏览器压缩后文件名丢失或变成 'blob' 的问题
        return new File([compressedFile], file.name, {
            type: compressedFile.type || file.type,
            lastModified: Date.now()
        });
    } catch (error) {
        console.error('Image compression failed:', error);
        // 压缩失败时抛出错误，包含更多信息
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        throw new Error(`图片压缩失败 (原始大小: ${fileSizeMB}MB)，请尝试选择较小的图片`);
    }
};
