
import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface SerendipityTriggerModalProps {
    encounter: {
        _id: string;
        serendipityTask: {
            _id: string;
            title: string;
            description?: string;
            coverImageUrl?: string;
            serendipityConfig?: {
                executionWindow?: {
                    enabled: boolean;
                    startTime?: string;
                    endTime?: string;
                };
                successMessage?: string;
            };
            qaModule?: {
                enabled: boolean;
                question?: string;
            };
        };
        expiresAt: string;
        hasTimeWindow?: boolean;
        hasQA?: boolean;
    };
    onAccept: () => void;
    onDecline: () => void;
}

const SerendipityTriggerModal: React.FC<SerendipityTriggerModalProps> = ({
    encounter,
    onAccept,
    onDecline
}) => {
    const task = encounter.serendipityTask;

    const handleAccept = () => {
        onAccept();
        // 显示提示
        alert('奇遇任务已添加到"进行中"列表，请在3天内完成，否则将失效！');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-[85vw] max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                {/* 封面图背景 */}
                {/* 封面图背景 or 默认炫酷背景 */}
                {task.coverImageUrl ? (
                    <CapacitorImage
                        src={getImageUrl(task.coverImageUrl)}
                        alt={task.title}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-orange-600">
                        {/* 噪点纹理叠加 */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                    </div>
                )}
                {/* 渐变遮罩 (仅在有图片时需要更重) */}
                <div className={`absolute inset - 0 bg - gradient - to - t ${task.coverImageUrl ? 'from-black/80 via-black/40' : 'from-black/60 via-transparent'} to - transparent`} />

                {/* 神秘光效 */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 -right-10 w-40 h-40 bg-orange-400/30 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>

                {/* 内容叠加层 */}
                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                    {/* 奇遇标签 */}
                    <span className="w-fit text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white mb-3 shadow-lg shadow-orange-500/30">
                        🎲 奇遇任务
                    </span>

                    {/* 标题 */}
                    <h3 className="text-white font-bold text-xl mb-1 drop-shadow-lg">{task.title}</h3>

                    {/* 描述 */}
                    {task.description && (
                        <p className="text-white/80 text-sm line-clamp-2 mb-3">{task.description}</p>
                    )}

                    {/* 限时/问答标签 */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {(encounter.hasTimeWindow || task.serendipityConfig?.executionWindow?.enabled) && (
                            <span className="text-xs px-2 py-1 rounded bg-white/20 text-white backdrop-blur-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                有时间限制
                            </span>
                        )}
                        {(encounter.hasQA || task.qaModule?.enabled) && (
                            <span className="text-xs px-2 py-1 rounded bg-white/20 text-white backdrop-blur-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">quiz</span>
                                含问答挑战
                            </span>
                        )}
                        <span className="text-xs px-2 py-1 rounded bg-white/20 text-white backdrop-blur-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">timer</span>
                            3天有效期
                        </span>
                    </div>

                    {/* 按钮 */}
                    <div className="flex gap-3">
                        <button
                            onClick={onDecline}
                            className="flex-1 py-3 rounded-xl bg-white/20 text-white font-bold backdrop-blur-sm hover:bg-white/30 transition-colors active:scale-[0.98]"
                        >
                            下次再说
                        </button>
                        <button
                            onClick={handleAccept}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-amber-600 transition-all active:scale-[0.98]"
                        >
                            接受委托
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SerendipityTriggerModal;
