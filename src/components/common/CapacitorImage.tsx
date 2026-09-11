import React, { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { CapacitorHttp } from '@capacitor/core';
import { getImageUrl } from '../../utils/imageUrl';

// 检测是否在 Capacitor 环境中
// @ts-ignore
const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;

// 简单的内存缓存，避免重复请求同一张图片
const imageCache = new Map<string, string>();

interface CapacitorImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string | undefined | null;
    fallback?: string; // 加载失败时的备用图片
}

/**
 * 智能图片组件
 * - Web 环境：使用普通 <img> 标签
 * - Capacitor 环境：使用 CapacitorHttp 获取图片后转为 base64 显示
 *
 * 这样可以绕过 Capacitor WebView 中的 CORS 限制
 */
const CapacitorImage: React.FC<CapacitorImageProps> = ({
    src,
    fallback,
    alt = '',
    className,
    style,
    onError,
    onLoad,
    ...rest
}) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const blobUrlRef = useRef<string | null>(null);

    // 处理后的完整 URL
    const fullUrl = getImageUrl(src);

    useEffect(() => {
        // 清理之前的 blob URL
        if (blobUrlRef.current && !imageCache.has(fullUrl)) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        if (!fullUrl) {
            setImageSrc(fallback || '');
            setLoading(false);
            return;
        }

        // Web 环境：直接使用原始 URL
        if (!isCapacitor) {
            setImageSrc(fullUrl);
            setLoading(false);
            return;
        }

        // Capacitor 环境：检查缓存
        if (imageCache.has(fullUrl)) {
            setImageSrc(imageCache.get(fullUrl)!);
            setLoading(false);
            return;
        }

        // Capacitor 环境：使用 CapacitorHttp 获取图片
        setLoading(true);
        setError(false);

        const loadImage = async () => {
            try {
                // 获取 token（如果需要认证）
                const token = localStorage.getItem('token');
                const headers: Record<string, string> = {
                    'Accept': 'image/*,*/*'
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await CapacitorHttp.get({
                    url: fullUrl,
                    headers,
                    responseType: 'blob',
                    connectTimeout: 30000,
                    readTimeout: 30000
                });

                if (response.status === 200 && response.data) {
                    // 将 base64 数据转为 data URL
                    let dataUrl: string;

                    if (typeof response.data === 'string') {
                        // CapacitorHttp 以 base64 字符串返回 blob 数据
                        const contentType = response.headers?.['content-type'] || response.headers?.['Content-Type'] || 'image/jpeg';
                        dataUrl = `data:${contentType};base64,${response.data}`;
                    } else {
                        // 如果是 Blob 对象
                        dataUrl = URL.createObjectURL(response.data);
                        blobUrlRef.current = dataUrl;
                    }

                    // 缓存结果
                    imageCache.set(fullUrl, dataUrl);
                    setImageSrc(dataUrl);
                    setLoading(false);
                    setError(false);
                } else {
                    console.warn(`[CapacitorImage] Failed to load image: ${response.status}`);
                    setError(true);
                    setImageSrc(fullUrl);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error('[CapacitorImage] Error loading image:', err);
                setError(true);
                setLoading(false);
                setImageSrc(fallback || fullUrl);
            }
        };

        loadImage();

        return () => {
            // 清理函数 - 不在这里清理 blob URL，因为可能被缓存使用
        };
    }, [fullUrl, fallback]);

    // 组件卸载时清理非缓存的 blob URL
    useEffect(() => {
        return () => {
            if (blobUrlRef.current && !imageCache.has(fullUrl)) {
                URL.revokeObjectURL(blobUrlRef.current);
            }
        };
    }, []);

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setError(true);
        if (fallback && imageSrc !== fallback) {
            setImageSrc(fallback);
        }
        onError?.(e);
    };

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setLoading(false);
        onLoad?.(e);
    };

    // 如果没有有效 src，显示占位符
    const displaySrc = imageSrc || fallback || '';

    if (!displaySrc && !loading) {
        return (
            <div
                className={className}
                style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                {...rest as any}
            >
                {alt && <span style={{ fontSize: '10px', color: '#999', textAlign: 'center' }}>{alt}</span>}
            </div>
        );
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={className}
            style={style}
            onError={handleError}
            onLoad={handleLoad}
            {...rest}
        />
    );
};

// 清除图片缓存的工具函数
export const clearImageCache = () => {
    imageCache.forEach((blobUrl) => {
        if (blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl);
        }
    });
    imageCache.clear();
};

export default CapacitorImage;

