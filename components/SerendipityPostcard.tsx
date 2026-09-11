import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface SerendipityPostcardProps {
    title: string;
    successMessage: string;  // 发布者赠言（必填）
    nodeDescription?: string;  // 第一个节点内容
    authorName?: string;
    coverImageUrl?: string;
    completionImageUrl?: string;  // 赠言图片（优先使用）
    city?: string;
    completedAt?: string;
    onSave?: () => void;
    onShare?: () => void;
    onClose?: () => void;
}

/**
 * 奇遇明信片组件
 * 用于展示奇遇完成后的赠言
 * 支持保存为图片（使用 html2canvas）
 */
const SerendipityPostcard: React.FC<SerendipityPostcardProps> = ({
    title,
    successMessage,
    nodeDescription,
    authorName,
    coverImageUrl,
    completionImageUrl,
    city,
    completedAt,
    onSave,
    onShare,
    onClose
}) => {
    const postcardRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);

    // 优先使用赠言图片，否则使用封面图
    const backgroundImageUrl = completionImageUrl || coverImageUrl;

    // 预加载图片
    const preloadImage = (url: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    };

    // 保存明信片为图片
    const handleSave = async () => {
        if (!postcardRef.current || isSaving) return;

        setIsSaving(true);
        try {
            // 预加载背景图片
            if (backgroundImageUrl) {
                try {
                    await preloadImage(getImageUrl(backgroundImageUrl));
                } catch (e) {
                    console.warn('Image preload failed, continuing anyway:', e);
                }
            }

            // 动态导入 html2canvas
            const html2canvas = (await import('html2canvas')).default;

            // 克隆节点并预加载图片
            const element = postcardRef.current;

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: false,  // 改为 false 避免 canvas 被污染
                backgroundColor: '#1a1a2e',
                logging: true,  // 开启日志便于调试
                imageTimeout: 30000,
                onclone: (clonedDoc) => {
                    // 确保克隆的元素中图片可见
                    const images = clonedDoc.querySelectorAll('img');
                    images.forEach(img => {
                        img.crossOrigin = 'anonymous';
                    });
                }
            });

            // 转换为 blob 并下载
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `奇遇明信片-${Date.now()}.png`;
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    onSave?.();
                } else {
                    // 备用方案：使用 toDataURL
                    const dataUrl = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `奇遇明信片-${Date.now()}.png`;
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    onSave?.();
                }
            }, 'image/png', 1.0);
        } catch (err) {
            console.error('Save postcard failed:', err);
            // 尝试备用方案：截取不含图片的版本
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(postcardRef.current!, {
                    scale: 2,
                    useCORS: false,
                    allowTaint: true,
                    backgroundColor: '#1a1a2e',
                    ignoreElements: (element) => element.tagName === 'IMG'
                });
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `奇遇明信片-${Date.now()}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                onSave?.();
            } catch (fallbackErr) {
                console.error('Fallback save also failed:', fallbackErr);
                alert('保存失败，请截图保存');
            }
        } finally {
            setIsSaving(false);
        }
    };

    // 格式化日期
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return new Date().toLocaleDateString('zh-CN');
        return new Date(dateStr).toLocaleDateString('zh-CN');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            {/* 明信片主体 */}
            <div className="flex flex-col items-center gap-6 max-w-sm w-full">
                {/* 可保存区域 */}
                <div
                    ref={postcardRef}
                    className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* 背景层 */}
                    {backgroundImageUrl ? (
                        <CapacitorImage
                            src={getImageUrl(backgroundImageUrl)}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        /* 📍 DEFAULT_BACKGROUND_PLACEHOLDER
                         * TODO: 后续替换为实际图片 URL
                         * 当前使用 CSS 渐变模拟神秘温暖背景
                         */
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-800 to-orange-700">
                            {/* 星光点缀 */}
                            <div className="absolute inset-0 opacity-30" style={{
                                backgroundImage: `
                                    radial-gradient(2px 2px at 20px 30px, white, transparent),
                                    radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
                                    radial-gradient(1px 1px at 90px 40px, white, transparent),
                                    radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.6), transparent),
                                    radial-gradient(1px 1px at 160px 20px, white, transparent),
                                    radial-gradient(2px 2px at 200px 60px, rgba(255,255,255,0.7), transparent),
                                    radial-gradient(1px 1px at 60px 100px, white, transparent),
                                    radial-gradient(2px 2px at 180px 120px, rgba(255,255,255,0.5), transparent)
                                `,
                                backgroundSize: '250px 150px'
                            }} />
                            {/* 光晕效果 */}
                            <div className="absolute top-10 left-10 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl" />
                            <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl" />
                        </div>
                    )}

                    {/* 遮罩层 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                    {/* 内容层 */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                        {/* 奇遇标签 */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🎲</span>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/80 to-amber-500/80 text-white backdrop-blur-sm">
                                奇遇完成
                            </span>
                        </div>

                        {/* 奇遇标题 */}
                        <h2 className="text-white text-xl font-bold mb-2">{title}</h2>

                        {/* 节点内容 */}
                        {nodeDescription && (
                            <p className="text-white/80 text-sm mb-3 line-clamp-2">{nodeDescription}</p>
                        )}

                        {/* 赠言卡片 */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-4">
                            <p className="text-white text-base font-medium leading-relaxed italic">
                                "{successMessage}"
                            </p>
                            {authorName && (
                                <p className="text-white/70 text-sm mt-2 text-right">
                                    —— {authorName}
                                </p>
                            )}
                        </div>

                        {/* 底部信息 */}
                        <div className="flex items-center justify-between text-white/70 text-xs">
                            {city && (
                                <span className="flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-xs">location_on</span>
                                    {city}
                                </span>
                            )}
                            <span>{formatDate(completedAt)}</span>
                        </div>
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 w-full">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold backdrop-blur-sm hover:bg-white/20 transition-colors"
                        >
                            返回
                        </button>
                    )}
                    {onShare && (
                        <button
                            onClick={onShare}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 hover:from-orange-600 hover:to-amber-600 transition-colors whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-lg">share</span>
                            分享
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SerendipityPostcard;
