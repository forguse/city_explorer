import React from 'react';

interface EncounterMiniCardProps {
    title: string;
    city?: string;
    expiresAt?: string;
    status?: 'active' | 'completed' | 'expired';
    onClick?: () => void;
}

/**
 * 迷你奇遇卡片组件
 * 高度为普通任务卡片的50%，用于：
 * 1. MyTasksScreen 进行中列表
 * 2. 社区帖子关联显示
 */
const EncounterMiniCard: React.FC<EncounterMiniCardProps> = ({
    title,
    city,
    expiresAt,
    status = 'active',
    onClick
}) => {
    // 计算过期天数
    const getExpiryText = () => {
        if (!expiresAt) return null;
        if (status === 'completed') return '已完成';
        if (status === 'expired') return '已过期';

        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0) return '已过期';
        if (daysLeft === 1) return '今天到期';
        return `${daysLeft}天到期`;
    };

    const expiryText = getExpiryText();
    const isExpired = status === 'expired' || (expiryText === '已过期');

    return (
        <div
            onClick={onClick}
            className={`
                h-16 flex items-center gap-3 px-4 rounded-xl cursor-pointer
                transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                ${isExpired
                    ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60'
                    : status === 'completed'
                        ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-300/50 dark:border-green-700/50'
                        : 'bg-gradient-to-r from-purple-500/10 to-orange-500/10 border border-purple-300/50 dark:border-purple-700/50'
                }
            `}
        >
            {/* 奇遇图标 */}
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-xl
                ${isExpired
                    ? 'bg-slate-200 dark:bg-slate-700'
                    : status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gradient-to-br from-purple-500/20 to-orange-500/20'
                }
            `}>
                {status === 'completed' ? '✅' : '🎲'}
            </div>

            {/* 标题 */}
            <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm truncate ${isExpired ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                    {title}
                </h4>
                {city && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {city}
                    </p>
                )}
            </div>

            {/* 状态标签 */}
            {expiryText && (
                <span className={`
                    text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap
                    ${isExpired
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        : status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    }
                `}>
                    {expiryText}
                </span>
            )}

            {/* 箭头 */}
            <span className="material-symbols-outlined text-slate-400 text-lg">
                chevron_right
            </span>
        </div>
    );
};

export default EncounterMiniCard;
