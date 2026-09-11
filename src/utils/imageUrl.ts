/**
 * 图片URL处理工具
 * 将存储的相对路径转换为可访问的完整URL
 */

// 获取 API URL (与 api.ts 保持一致)
function getApiUrl(): string {
    // @ts-ignore - Vite env types
    if (import.meta.env.VITE_API_URL) {
        // @ts-ignore
        return import.meta.env.VITE_API_URL.replace(/\/$/, '');
    }

    // 检测是否在 Capacitor/Android 环境中运行
    // @ts-ignore
    const isCapacitor = window.Capacitor !== undefined;
    const isLocalFile = window.location.protocol === 'file:' || window.location.protocol === 'capacitor:';

    if (isCapacitor || isLocalFile) {
        // Capacitor 生产构建必须通过 VITE_API_URL 指定服务地址。
        return 'http://localhost:5000';
    }

    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
        return `http://${window.location.hostname}:5000`;
    }

    // 生产环境使用 /api 前缀
    return '/api';
}

const API_URL = getApiUrl();

/**
 * 将图片URL转换为可访问的完整URL
 * @param url 存储在数据库中的URL（可能是相对路径或完整URL）
 * @returns 可访问的完整URL，如果输入为空则返回空字符串
 */
export const getImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';

    // 如果已经是完整URL（http/https开头）
    if (url.startsWith('http://') || url.startsWith('https://')) {
        // 处理历史遗留的任何 :5000/uploads/ 路径 - 提取相对路径并使用当前主机
        const uploadsMatch = url.match(/\/uploads\/(.+)$/);
        if (uploadsMatch) {
            // 提取 /uploads/... 部分，用当前 API_URL 拼接
            return `${API_URL}/uploads/${uploadsMatch[1]}`;
        }
        // 不是 uploads 路径，直接返回（如外部CDN图片）
        return url;
    }

    // 相对路径，拼接当前的 API_URL
    if (url.startsWith('/')) {
        return `${API_URL}${url}`;
    }

    // 其他情况（可能是外部图片URL等），直接返回
    return url;
};

export default getImageUrl;
