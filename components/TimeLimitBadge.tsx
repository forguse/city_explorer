import React, { useState, useEffect, useMemo } from 'react';

// 时间限制配置接口
interface TimeLimit {
    type: 'countdown' | 'timeRange' | 'deadline' | 'none';
    countdownMinutes?: number;
    timeRangeStart?: string;
    timeRangeEnd?: string;
    timeRangeDate?: string;
    deadlineTime?: string;
    deadlineType?: 'before' | 'after';
    deadlineDate?: string;
}

interface TimeLimitBadgeProps {
    timeLimit: TimeLimit;
    startTime?: Date | string;  // 用于 countdown 计算剩余时间
    variant?: 'compact' | 'full';  // 紧凑模式/完整模式
    onTimeout?: () => void;  // 超时回调
    className?: string;
}

// 解析 HH:MM 格式时间为今日的 Date 对象
const parseTimeToday = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const today = new Date();
    today.setHours(hours, minutes, 0, 0);
    return today;
};

// 解析 YYYY-MM-DD HH:MM 为 Date 对象
const parseDateTime = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

// 格式化剩余时间
const formatDuration = (totalMs: number, showDays = true): string => {
    if (totalMs <= 0) return '0秒';

    const totalSeconds = Math.floor(totalMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (showDays && days > 0) {
        if (hours > 0) return `${days}天${hours}小时`;
        return `${days}天`;
    }
    if (hours > 0) {
        if (minutes > 0) return `${hours}小时${minutes}分`;
        return `${hours}小时`;
    }
    if (minutes > 0) {
        if (seconds > 0 && minutes < 5) return `${minutes}分${seconds}秒`;
        return `${minutes}分钟`;
    }
    return `${seconds}秒`;
};

// 格式化倒计时显示 MM:SS
const formatCountdown = (totalMs: number): string => {
    if (totalMs <= 0) return '00:00';

    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 格式化日期显示
const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${month}/${day}`;
};

const TimeLimitBadge: React.FC<TimeLimitBadgeProps> = ({
    timeLimit,
    startTime,
    variant = 'full',
    onTimeout,
    className = ''
}) => {
    const [now, setNow] = useState(new Date());
    const [hasTimedOut, setHasTimedOut] = useState(false);

    // 每秒更新时间
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // 计算状态和显示内容
    const displayInfo = useMemo(() => {
        if (!timeLimit || timeLimit.type === 'none') {
            return null;
        }

        const currentTime = now.getTime();

        // ========== COUNTDOWN 类型 ==========
        if (timeLimit.type === 'countdown' && timeLimit.countdownMinutes) {
            const start = startTime ? new Date(startTime).getTime() : currentTime;
            const endTime = start + timeLimit.countdownMinutes * 60 * 1000;
            const remaining = endTime - currentTime;

            if (remaining <= 0) {
                return {
                    status: 'expired',
                    icon: 'timer_off',
                    color: 'red',
                    bgColor: 'bg-red-100 dark:bg-red-900/30',
                    textColor: 'text-red-600 dark:text-red-400',
                    borderColor: 'border-red-200 dark:border-red-700/50',
                    title: '已超时',
                    subtitle: null,
                    countdown: null,
                    urgent: true
                };
            }

            const isUrgent = remaining < 5 * 60 * 1000; // 5分钟内紧急
            return {
                status: 'active',
                icon: 'timer',
                color: isUrgent ? 'red' : 'orange',
                bgColor: isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30',
                textColor: isUrgent ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400',
                borderColor: isUrgent ? 'border-red-200 dark:border-red-700/50' : 'border-orange-200 dark:border-orange-700/50',
                title: '限时挑战',
                subtitle: null,
                countdown: formatCountdown(remaining),
                remaining,
                urgent: isUrgent
            };
        }

        // ========== DEADLINE 类型 ==========
        if (timeLimit.type === 'deadline' && timeLimit.deadlineTime) {
            const hasDate = !!timeLimit.deadlineDate;
            const isBefore = timeLimit.deadlineType === 'before';

            let targetTime: Date;
            if (hasDate) {
                targetTime = parseDateTime(timeLimit.deadlineDate!, timeLimit.deadlineTime);
            } else {
                targetTime = parseTimeToday(timeLimit.deadlineTime);
                // 如果是 after 类型且今日已过，目标时间是今天
                // 如果是 before 类型且今日已过，显示"已过期"（每日重置）
            }

            const targetMs = targetTime.getTime();
            const remaining = targetMs - currentTime;

            if (isBefore) {
                // 必须在某时间点之前完成
                if (remaining <= 0) {
                    // 已过期
                    if (hasDate) {
                        return {
                            status: 'expired',
                            icon: 'event_busy',
                            color: 'red',
                            bgColor: 'bg-red-100 dark:bg-red-900/30',
                            textColor: 'text-red-600 dark:text-red-400',
                            borderColor: 'border-red-200 dark:border-red-700/50',
                            title: '已截止',
                            subtitle: `${formatDate(timeLimit.deadlineDate!)} ${timeLimit.deadlineTime}`,
                            countdown: null,
                            urgent: true
                        };
                    } else {
                        return {
                            status: 'daily-expired',
                            icon: 'schedule',
                            color: 'amber',
                            bgColor: 'bg-amber-100 dark:bg-amber-900/30',
                            textColor: 'text-amber-600 dark:text-amber-400',
                            borderColor: 'border-amber-200 dark:border-amber-700/50',
                            title: `今日已过 ${timeLimit.deadlineTime}`,
                            subtitle: '明日重置',
                            countdown: null,
                            urgent: false
                        };
                    }
                } else {
                    // 未到期
                    const isUrgent = remaining < 30 * 60 * 1000; // 30分钟内紧急
                    const datePrefix = hasDate ? `${formatDate(timeLimit.deadlineDate!)} ` : '每日 ';
                    return {
                        status: 'pending',
                        icon: 'schedule',
                        color: isUrgent ? 'orange' : 'blue',
                        bgColor: isUrgent ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30',
                        textColor: isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400',
                        borderColor: isUrgent ? 'border-orange-200 dark:border-orange-700/50' : 'border-blue-200 dark:border-blue-700/50',
                        title: `需在 ${datePrefix}${timeLimit.deadlineTime} 前完成`,
                        subtitle: `还有 ${formatDuration(remaining, hasDate)}`,
                        countdown: null,
                        remaining,
                        urgent: isUrgent
                    };
                }
            } else {
                // 必须在某时间点之后开始
                if (remaining <= 0) {
                    // 可以开始了
                    const datePrefix = hasDate ? '' : '（每日）';
                    return {
                        status: 'ready',
                        icon: 'check_circle',
                        color: 'green',
                        bgColor: 'bg-green-100 dark:bg-green-900/30',
                        textColor: 'text-green-600 dark:text-green-400',
                        borderColor: 'border-green-200 dark:border-green-700/50',
                        title: '现在可以开始',
                        subtitle: `${timeLimit.deadlineTime} 后${datePrefix}`,
                        countdown: null,
                        urgent: false
                    };
                } else {
                    // 还未到开始时间
                    const datePrefix = hasDate ? `${formatDate(timeLimit.deadlineDate!)} ` : '每日 ';
                    return {
                        status: 'waiting',
                        icon: 'hourglass_empty',
                        color: 'purple',
                        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
                        textColor: 'text-purple-600 dark:text-purple-400',
                        borderColor: 'border-purple-200 dark:border-purple-700/50',
                        title: `需在 ${datePrefix}${timeLimit.deadlineTime} 后开始`,
                        subtitle: `还有 ${formatDuration(remaining, hasDate)}`,
                        countdown: null,
                        remaining,
                        urgent: false
                    };
                }
            }
        }

        // ========== TIMERANGE 类型 ==========
        if (timeLimit.type === 'timeRange' && timeLimit.timeRangeStart && timeLimit.timeRangeEnd) {
            const hasDate = !!timeLimit.timeRangeDate;

            let startTarget: Date;
            let endTarget: Date;

            if (hasDate) {
                startTarget = parseDateTime(timeLimit.timeRangeDate!, timeLimit.timeRangeStart);
                endTarget = parseDateTime(timeLimit.timeRangeDate!, timeLimit.timeRangeEnd);
            } else {
                startTarget = parseTimeToday(timeLimit.timeRangeStart);
                endTarget = parseTimeToday(timeLimit.timeRangeEnd);
                // 处理跨午夜的情况
                if (endTarget <= startTarget) {
                    endTarget.setDate(endTarget.getDate() + 1);
                }
            }

            const startMs = startTarget.getTime();
            const endMs = endTarget.getTime();

            if (currentTime < startMs) {
                // 开始前
                const remaining = startMs - currentTime;
                const datePrefix = hasDate ? `${formatDate(timeLimit.timeRangeDate!)} ` : '每日 ';
                return {
                    status: 'before',
                    icon: 'schedule',
                    color: 'purple',
                    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
                    textColor: 'text-purple-600 dark:text-purple-400',
                    borderColor: 'border-purple-200 dark:border-purple-700/50',
                    title: `${datePrefix}${timeLimit.timeRangeStart}-${timeLimit.timeRangeEnd} 可执行`,
                    subtitle: `还有 ${formatDuration(remaining, hasDate)} 开始`,
                    countdown: null,
                    remaining,
                    urgent: false
                };
            } else if (currentTime >= startMs && currentTime < endMs) {
                // 进行中
                const remaining = endMs - currentTime;
                const isUrgent = remaining < 15 * 60 * 1000; // 15分钟内紧急
                return {
                    status: 'active',
                    icon: 'play_circle',
                    color: isUrgent ? 'orange' : 'green',
                    bgColor: isUrgent ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30',
                    textColor: isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400',
                    borderColor: isUrgent ? 'border-orange-200 dark:border-orange-700/50' : 'border-green-200 dark:border-green-700/50',
                    title: '执行时段内',
                    subtitle: `还有 ${formatDuration(remaining, false)} 截止`,
                    countdown: null,
                    remaining,
                    urgent: isUrgent
                };
            } else {
                // 已结束
                if (hasDate) {
                    return {
                        status: 'expired',
                        icon: 'event_busy',
                        color: 'red',
                        bgColor: 'bg-red-100 dark:bg-red-900/30',
                        textColor: 'text-red-600 dark:text-red-400',
                        borderColor: 'border-red-200 dark:border-red-700/50',
                        title: '时段已结束',
                        subtitle: `${formatDate(timeLimit.timeRangeDate!)} ${timeLimit.timeRangeStart}-${timeLimit.timeRangeEnd}`,
                        countdown: null,
                        urgent: true
                    };
                } else {
                    // 每日重复，计算到明天的开始时间
                    const tomorrow = new Date(startTarget);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const remaining = tomorrow.getTime() - currentTime;
                    return {
                        status: 'daily-wait',
                        icon: 'schedule',
                        color: 'purple',
                        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
                        textColor: 'text-purple-600 dark:text-purple-400',
                        borderColor: 'border-purple-200 dark:border-purple-700/50',
                        title: `每日 ${timeLimit.timeRangeStart}-${timeLimit.timeRangeEnd} 可执行`,
                        subtitle: `还有 ${formatDuration(remaining, false)} 开始`,
                        countdown: null,
                        remaining,
                        urgent: false
                    };
                }
            }
        }

        return null;
    }, [timeLimit, startTime, now]);

    // 超时回调
    useEffect(() => {
        if (displayInfo?.status === 'expired' && !hasTimedOut) {
            setHasTimedOut(true);
            onTimeout?.();
        }
    }, [displayInfo, hasTimedOut, onTimeout]);

    if (!displayInfo) return null;

    // 紧凑模式
    if (variant === 'compact') {
        return (
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${displayInfo.bgColor} ${displayInfo.borderColor} border ${className}`}>
                <span className={`material-symbols-outlined text-sm ${displayInfo.textColor}`} style={{ fontVariationSettings: displayInfo.status === 'active' || displayInfo.status === 'ready' ? "'FILL' 1" : undefined }}>
                    {displayInfo.icon}
                </span>
                {displayInfo.countdown ? (
                    <span className={`text-sm font-mono font-bold ${displayInfo.textColor}`}>
                        {displayInfo.countdown}
                    </span>
                ) : (
                    <span className={`text-xs font-medium ${displayInfo.textColor}`}>
                        {displayInfo.subtitle || displayInfo.title}
                    </span>
                )}
            </div>
        );
    }

    // 完整模式
    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl ${displayInfo.bgColor} ${displayInfo.borderColor} border ${className}`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${displayInfo.bgColor}`}>
                <span className={`material-symbols-outlined text-2xl ${displayInfo.textColor}`} style={{ fontVariationSettings: displayInfo.status === 'active' || displayInfo.status === 'ready' ? "'FILL' 1" : undefined }}>
                    {displayInfo.icon}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${displayInfo.textColor}`}>
                        {displayInfo.title}
                    </span>
                    {displayInfo.countdown && (
                        <span className={`text-lg font-mono font-bold ${displayInfo.textColor} ${displayInfo.urgent ? 'animate-pulse' : ''}`}>
                            {displayInfo.countdown}
                        </span>
                    )}
                </div>
                {displayInfo.subtitle && (
                    <p className={`text-xs ${displayInfo.textColor} opacity-80 mt-0.5`}>
                        {displayInfo.subtitle}
                    </p>
                )}
            </div>
            {displayInfo.urgent && displayInfo.status === 'active' && (
                <div className="shrink-0">
                    <span className="material-symbols-outlined text-xl text-red-500 animate-pulse">
                        warning
                    </span>
                </div>
            )}
        </div>
    );
};

export default TimeLimitBadge;
