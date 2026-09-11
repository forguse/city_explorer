import { useState, useEffect, useRef } from 'react';
import { CapacitorHttp } from '@capacitor/core';
import { getImageUrl } from '../utils/imageUrl';

// 检测是否在 Capacitor 环境中
// @ts-ignore
const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;

// 全局图片缓存
const imageCache = new Map<string, string>();

/**
 * Hook: 在 Capacitor 环境中将图片 URL 转换为可用的 blob/data URL
 * 用于 backgroundImage 等无法使用 <img> 组件的场景
 *
 * @param url 原始图片 URL
 * @returns 处理后的 URL（Web 环境返回原 URL，Capacitor 环境返回 blob/data URL）
 */
export function useCapacitorImageUrl(url: string | undefined | null): string {
    const fullUrl = getImageUrl(url);
    const [imageUrl, setImageUrl] = useState<string>(() => {
        // 初始值：Web 环境直接返回，Capacitor 环境检查缓存
        if (!fullUrl) return '';
        if (!isCapacitor) return fullUrl;
        return imageCache.get(fullUrl) || '';
    });
    const blobUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (!fullUrl) {
            setImageUrl('');
            return;
        }

        // Web 环境：直接使用原始 URL
        if (!isCapacitor) {
            setImageUrl(fullUrl);
            return;
        }

        // Capacitor 环境：检查缓存
        if (imageCache.has(fullUrl)) {
            setImageUrl(imageCache.get(fullUrl)!);
            return;
        }

        // Capacitor 环境：加载图片
        const loadImage = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers: Record<string, string> = {};
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
                    let resultUrl: string;

                    // Handle case-insensitive headers
                    const responseHeaders = response.headers || {};
                    const contentType = responseHeaders['Content-Type'] || responseHeaders['content-type'] || 'image/jpeg';

                    if (typeof response.data === 'string') {
                        resultUrl = `data:${contentType};base64,${response.data}`;
                    } else {
                        resultUrl = URL.createObjectURL(response.data);
                        blobUrlRef.current = resultUrl;
                    }

                    imageCache.set(fullUrl, resultUrl);
                    setImageUrl(resultUrl);
                } else {
                    console.warn(`[useCapacitorImageUrl] Failed to load ${fullUrl}, status: ${response.status}`);
                    setImageUrl(fullUrl);
                }
            } catch (err) {
                console.error('[useCapacitorImageUrl] Error loading image:', err);
                // 失败时返回原始 URL，让浏览器尝试加载
                setImageUrl(fullUrl);
            }
        };

        loadImage();

        return () => {
            // 清理非缓存的 blob URL
            if (blobUrlRef.current && !imageCache.has(fullUrl)) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, [fullUrl]);

    return imageUrl;
}

/**
 * Hook: 批量处理多个图片 URL
 * 用于图片列表等场景
 */
export function useCapacitorImageUrls(urls: (string | undefined | null)[]): string[] {
    const [imageUrls, setImageUrls] = useState<string[]>([]);

    useEffect(() => {
        if (!urls || urls.length === 0) {
            setImageUrls([]);
            return;
        }

        // Web 环境：直接返回处理后的 URL
        if (!isCapacitor) {
            setImageUrls(urls.map(url => getImageUrl(url)));
            return;
        }

        // Capacitor 环境：逐个加载
        const loadImages = async () => {
            const results: string[] = [];

            for (const url of urls) {
                const fullUrl = getImageUrl(url);
                if (!fullUrl) {
                    results.push('');
                    continue;
                }

                // 检查缓存
                if (imageCache.has(fullUrl)) {
                    results.push(imageCache.get(fullUrl)!);
                    continue;
                }

                try {
                    const token = localStorage.getItem('token');
                    const headers: Record<string, string> = {};
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
                        let resultUrl: string;
                        // Handle case-insensitive headers
                        const responseHeaders = response.headers || {};
                        const contentType = responseHeaders['Content-Type'] || responseHeaders['content-type'] || 'image/jpeg';

                        if (typeof response.data === 'string') {
                            resultUrl = `data:${contentType};base64,${response.data}`;
                        } else {
                            // Fallback for real blob objects (web or native file)
                            resultUrl = URL.createObjectURL(response.data);
                        }
                        imageCache.set(fullUrl, resultUrl);
                        results.push(resultUrl);
                    } else {
                        // Request failed (e.g. 404), allow fallback to Original URL
                        console.warn(`[useCapacitorImageUrls] Failed to load ${fullUrl}, status: ${response.status}`);
                        results.push(fullUrl);
                    }
                } catch (err) {
                    console.error('[useCapacitorImageUrls] Error loading image:', err);
                    results.push(fullUrl);
                }
            }

            setImageUrls(results);
        };

        loadImages();
    }, [JSON.stringify(urls)]);

    return imageUrls;
}

// 清除缓存
export const clearCapacitorImageCache = () => {
    imageCache.forEach((url) => {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    imageCache.clear();
};

export default useCapacitorImageUrl;
