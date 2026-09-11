
import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface SerendipityTaskCardProps {
    serendipityTask: {
        _id: string;
        title: string;
        description?: string;
        coverImageUrl?: string;
        qaModule?: {
            enabled?: boolean;
            question?: string;
        };
        serendipityConfig?: {
            successMessage?: string;
        };
    };
    completedAt: string;
}

const SerendipityTaskCard: React.FC<SerendipityTaskCardProps> = ({ serendipityTask, completedAt }) => {
    // 格式化时间
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days < 1) return '今天';
        if (days < 7) return `${days} 天前`;
        return date.toLocaleDateString('zh-CN');
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 via-purple-900 to-orange-600 shadow-xl">
            {/* 神秘光效背景 */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-0 -right-10 w-40 h-40 bg-white/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-300/40 rounded-full blur-2xl" />
            </div>

            {/* 封面图（如果有） */}
            {serendipityTask.coverImageUrl && (
                <div className="absolute inset-0 opacity-20">
                    <CapacitorImage
                        src={getImageUrl(serendipityTask.coverImageUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            <div className="relative z-10 p-5">
                {/* 标签 */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        🎲 奇遇任务
                    </span>
                    <span className="text-xs text-white/70">
                        {formatTime(completedAt)} 完成
                    </span>
                </div>

                {/* 标题 */}
                <h3 className="font-bold text-lg text-white mb-2">{serendipityTask.title}</h3>

                {/* 描述 */}
                {serendipityTask.description && (
                    <p className="text-sm text-white/80 line-clamp-2 mb-3">{serendipityTask.description}</p>
                )}

                {/* 问答回顾 */}
                {serendipityTask.qaModule?.enabled && serendipityTask.qaModule?.question && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 mb-3">
                        <p className="text-xs text-white/60 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">quiz</span>
                            挑战问答
                        </p>
                        <p className="text-sm text-white font-medium">{serendipityTask.qaModule.question}</p>
                    </div>
                )}

                {/* 赠言 */}
                {serendipityTask.serendipityConfig?.successMessage && (
                    <div className="pt-3 border-t border-white/20">
                        <p className="text-sm text-white/90 italic">
                            "{serendipityTask.serendipityConfig.successMessage}"
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SerendipityTaskCard;
