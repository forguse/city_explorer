import React, { useMemo } from 'react';

interface TaskPrepBadgeProps {
    prepListConfig?: any[]; // The generic config from the task
    prepList?: any[];      // User custom list items (legacy or specific)
    prepProgress?: {       // The actual progress from execution
        itemId?: string;
        configId?: string;
        title?: string;
        isCompleted: boolean;
        note?: string;
    }[];
    executionId?: string;
    className?: string;
}

const TaskPrepBadge: React.FC<TaskPrepBadgeProps> = ({
    prepListConfig = [],
    prepList = [],
    prepProgress = [],
    executionId = "",
    className = ""
}) => {

    const { isPrepared, completedCount, totalItems, isCustom } = useMemo(() => {
        const configList = prepListConfig || prepList || [];
        const hasCustomConfig = configList.length > 0;

        // 如果有 prepProgress，以 prepProgress 为准（因为它是后端存储的实际备战项）
        // prepProgress 中的每个项都应该被计入，无论是否完成
        const total = prepProgress.length;
        const completed = prepProgress.filter(p => p.isCompleted).length;

        // 判断是否完成：
        // 1. 必须有备战项（total > 0）
        // 2. 所有备战项都必须完成（completed === total）
        const prepared = total > 0 && completed === total;

        return {
            isPrepared: prepared,
            completedCount: completed,
            totalItems: total,
            isCustom: hasCustomConfig
        };
    }, [prepListConfig, prepList, prepProgress]);

    if (isPrepared) {
        return (
            <div className={`inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md ${className}`}>
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span className="text-[10px] font-bold">已完成备战</span>
            </div>
        );
    }

    if (isCustom) {
        // 有自定义备战清单
        return (
            <div className={`inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-md ${className}`}>
                <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                <span className="text-[10px] font-bold">备战清单</span>
            </div>
        );
    }

    // 默认清单
    return (
        <div className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md ${className}`}>
            <span className="material-symbols-outlined text-[14px]">inventory_2</span>
            <span className="text-[10px] font-bold">去备战</span>
        </div>
    );
};

export default TaskPrepBadge;
