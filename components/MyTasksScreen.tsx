import React, { useState, useEffect, useMemo } from 'react';
import TaskPrepProgressBar from './TaskPrepBadge';
import { execution, user as userApi, encounter as encounterApi, task as taskApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import TaskPrepBadge from './TaskPrepBadge';
import EncounterMiniCard from './EncounterMiniCard';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface MyTasksScreenProps {
    onBack: () => void;
    onTaskDetail?: (taskId: string, context?: any) => void;
    onStartTask?: (taskId: string) => void;
    onCreateTask?: () => void;
    onTaskPrep?: (task: any, options?: { autoStart?: boolean }) => void;
    onNavigation?: (taskId: string) => void;
    onSerendipityExecution?: (encounterId: string) => void;
    initialTab?: 'ongoing' | 'scheduled' | 'completed' | 'favorites';
    onTabChange?: (tab: 'ongoing' | 'scheduled' | 'completed' | 'favorites') => void;
}

interface TaskItem {
    id: string;
    executionId?: string;
    title: string;
    description: string;
    location: string;
    type: string;
    status: 'ongoing' | 'scheduled' | 'completed' | 'favorites';
    progress: number;
    totalNodes: number;
    completedNodes: number;
    lastCheckIn: string;
    coverImage?: string;
    scheduledTime?: string;
    eventStartTime?: string; // 社团活动开始时间
    isClubActivity?: boolean; // 是否为社团活动
    prepProgress?: any[];
    prepListConfig?: any[]; // Added
    prepList?: any[]; // Added
    _raw?: any;
    startTime?: string; // Added for filtering
    isSuccess?: boolean; // 新增：是否成功完成（满足限时）
    reviewStatus?: 'pending' | 'approved' | 'rejected' | 'private'; // 审核状态
    isSerendipity?: boolean; // 新增：是否为奇遇任务
    encounterId?: string; // 新增：奇遇记录ID
    expiresAt?: string; // 新增：奇遇过期时间
}

const MyTasksScreen: React.FC<MyTasksScreenProps> = ({
    onBack,
    onTaskDetail,
    onStartTask,
    onCreateTask,
    onTaskPrep,
    onNavigation,
    onSerendipityExecution,
    initialTab,
    onTabChange
}) => {
    const [activeTab, setActiveTab] = useState<'ongoing' | 'scheduled' | 'completed' | 'favorites'>(initialTab || 'ongoing');
    const [showPrepConfirm, setShowPrepConfirm] = useState(false);
    const [pendingStartTask, setPendingStartTask] = useState<TaskItem | null>(null);

    // Sync validation: update internal state if prop changes
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    const handleTabChange = (tab: 'ongoing' | 'scheduled' | 'completed' | 'favorites') => {
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
    };
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [savedTasks, setSavedTasks] = useState<TaskItem[]>([]);
    const [showStartModal, setShowStartModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
    const [, forceUpdate] = useState(0); // 用于强制刷新倒计时显示
    const [encounterTasks, setEncounterTasks] = useState<TaskItem[]>([]); // 奇遇任务列表

    // 计算距离预约时间的倒计时文本
    const getCountdownText = (scheduledTime: string | undefined, eventStartTime?: string, isClubActivity?: boolean) => {
        // 社团活动使用活动开始时间
        const targetTime = isClubActivity && eventStartTime ? eventStartTime : scheduledTime;
        if (!targetTime) return null;

        const now = new Date().getTime();
        const scheduled = new Date(targetTime).getTime();
        const diff = scheduled - now;

        if (diff <= 0) {
            return { text: isClubActivity ? '活动进行中' : '预约时间已到', isOverdue: true };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return { text: `距离开始还有 ${days}天${hours}小时`, isOverdue: false };
        } else if (hours > 0) {
            return { text: `距离开始还有 ${hours}小时${minutes}分钟`, isOverdue: false };
        } else {
            return { text: `距离开始还有 ${minutes}分钟`, isOverdue: false };
        }
    };

    // Fetch executions and saved tasks from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch execution records
                const execRes = await execution.getMyExecutions();
                const executions = execRes.data;

                const transformedTasks: TaskItem[] = executions.map((exec: any) => {
                    // Note: Backend populates 'task' field, not 'taskId'
                    const task = exec.task || {};
                    const totalNodes = task.nodes?.length || 0;
                    const completedNodes = exec.completedNodes?.length || 0;
                    const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

                    let status: TaskItem['status'] = 'ongoing';
                    if (exec.status === 'completed') {
                        status = 'completed';
                    } else if (exec.status === 'scheduled') {
                        status = 'scheduled';
                    }

                    return {
                        id: task._id || exec.task?._id || exec.task,
                        executionId: exec._id,
                        title: task.title || 'Untitled Task',
                        description: task.description || '',
                        location: task.location?.name || 'Unknown',
                        type: task.isOfficial ? '官方推荐' : (task.isAI ? 'AI生成' : (task.clubId ? '社团活动' : '用户创建')),
                        status,
                        progress,
                        totalNodes,
                        completedNodes,
                        lastCheckIn: completedNodes > 0 ? `节点 ${exec.completedNodes[exec.completedNodes.length - 1] + 1} ` : '未开始',
                        coverImage: task.coverImageUrl || task.coverImage,
                        startTime: exec.startTime, // Map start time
                        scheduledTime: exec.scheduledStartTime,
                        eventStartTime: task.timeConfig?.eventStartDate, // 社团活动开始时间
                        isClubActivity: !!task.clubId, // 是否为社团活动
                        prepProgress: exec.prepProgress?.map((p: any) => ({
                            itemId: p.prepItemId || p.configId,
                            title: p.title,
                            isCompleted: !!p.isCompleted,
                            note: p.note || '',
                        })) || [],
                        prepListConfig: task.prepListConfig, // Populate
                        prepList: task.prepList, // Populate
                        isSuccess: !!exec.isSuccess, // Map Success status
                        _raw: exec.task || {}, // Fix: Use Task object instead of Execution object to match Favorites behavior
                    };
                });

                setTasks(transformedTasks);

                // Fetch active encounters (奇遇任务)
                try {
                    const encounterRes = await encounterApi.getActive();
                    if (encounterRes.data?.hasActive && encounterRes.data.encounter) {
                        const enc = encounterRes.data.encounter;
                        const serendipityTask = enc.serendipityTask;

                        const encounterTaskItem: TaskItem = {
                            id: serendipityTask._id || serendipityTask.id,
                            encounterId: enc._id,
                            title: serendipityTask.title || '神秘奇遇',
                            description: serendipityTask.description || '一场意想不到的奇遇等待着你...',
                            location: serendipityTask.targetCities?.join(' / ') || '未知地点',
                            type: '奇遇任务',
                            status: 'ongoing' as const,
                            progress: 0,
                            totalNodes: serendipityTask.nodes?.length || 1,
                            completedNodes: 0,
                            lastCheckIn: '待探索',
                            coverImage: getImageUrl(serendipityTask.coverImageUrl),
                            isSerendipity: true,
                            expiresAt: enc.expiresAt,
                            _raw: serendipityTask,
                        };
                        setEncounterTasks([encounterTaskItem]);
                    } else {
                        setEncounterTasks([]);
                    }
                } catch (error) {
                    console.error('Failed to fetch encounters:', error);
                    setEncounterTasks([]);
                }

                // Fetch saved/favorited tasks
                try {
                    const savedRes = await userApi.getSavedTasks();
                    const saved = savedRes.data || [];

                    const transformedSaved: TaskItem[] = saved.map((task: any) => {
                        // Find matching execution to get prep status
                        // Note: Backend populates 'task' field (not 'taskId')
                        const taskExecutions = executions.filter((e: any) => {
                            const tId = e.task?._id || e.task;
                            return String(tId) === String(task._id || task.id);
                        });

                        // Prioritize the MOST RECENT execution regardless of status.
                        // This ensures that if the user just updated a prep list (modifying the execution),
                        // we show that specific status immediately.
                        if (taskExecutions.length > 0) {
                            taskExecutions.sort((a: any, b: any) =>
                                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                            );
                        }
                        const activeExec = taskExecutions[0];

                        return {
                            id: task._id || task.id,
                            executionId: activeExec?._id || '', // Link execution ID if exists
                            title: task.title || 'Untitled Task',
                            description: task.description || '',
                            // Prioritize targetCities, fallback to location name
                            location: (task.targetCities && task.targetCities.length > 0)
                                ? `${task.targetCities[0]}${task.targetCities.length > 1 ? ` 等${task.targetCities.length}城` : ''} `
                                : (task.location?.name || task.location?.address || 'Unknown'),
                            type: task.isOfficial ? '官方推荐' : (task.isAI ? 'AI生成' : '用户创建'),
                            status: 'favorites' as const,
                            progress: 0,
                            totalNodes: task.nodes?.length || 0,
                            completedNodes: 0,
                            lastCheckIn: '未开始',
                            coverImage: task.coverImageUrl || task.coverImage,
                            startTime: undefined,
                            scheduledTime: undefined,
                            prepListConfig: task.prepListConfig, // Populate
                            prepList: task.prepList, // Populate
                            prepProgress: activeExec?.prepProgress?.map((p: any) => ({
                                itemId: p.prepItemId || p.configId,
                                title: p.title,
                                isCompleted: !!p.isCompleted,
                                note: p.note || '',
                            })) || [],
                            _raw: task,
                            reviewStatus: task.status, // 审核状态: pending/approved/rejected
                        };
                    });

                    setSavedTasks(transformedSaved);
                } catch (error) {
                    console.error('Failed to fetch saved tasks:', error);
                }
            } catch (error) {
                console.error('Failed to fetch tasks:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [forceUpdate]);

    // 定时器：每分钟检查预约任务是否到期 + 刷新倒计时显示
    useEffect(() => {
        const checkScheduledTasks = async () => {
            const now = new Date().getTime();

            // 找出已到期的预约任务（状态是 scheduled 且时间已过）
            // 添加60秒的缓冲，避免时间边界问题
            const overdueTasks = tasks.filter(task => {
                if (task.status !== 'scheduled') return false;

                // 社团活动使用活动开始时间，普通任务使用预约时间
                const targetTime = task.isClubActivity && task.eventStartTime
                    ? task.eventStartTime
                    : task.scheduledTime;

                if (!targetTime) return false;

                const scheduledTime = new Date(targetTime).getTime();
                // 只有当当前时间比预约时间晚至少1分钟时才自动开始
                return now - scheduledTime >= 60 * 1000;
            });

            // 自动开始到期的预约任务
            let hasStartedAny = false;
            for (const task of overdueTasks) {
                try {
                    console.log(`[AutoStart] Starting task "${task.title}" (${task.id})`);
                    await execution.start(task.id);
                    console.log(`[AutoStart] Successfully started task "${task.title}"`);
                    hasStartedAny = true;
                } catch (err) {
                    console.error(`[AutoStart] Failed to start task "${task.title}": `, err);
                }
            }

            // 如果有任务被启动，重新获取数据以确保状态同步
            if (hasStartedAny) {
                console.log('[AutoStart] Refreshing task list after auto-start');
                forceUpdate(n => n + 1);
            } else {
                // 没有任务启动，只刷新倒计时显示
                forceUpdate(n => n + 1);
            }
        };

        // 只有当有 scheduled 任务时才启动定时器
        const hasScheduledTasks = tasks.some(t => t.status === 'scheduled');
        if (!hasScheduledTasks) return;

        // 每分钟检查一次（不再立即检查，避免新预约任务被误判）
        const interval = setInterval(checkScheduledTasks, 60 * 1000);
        return () => clearInterval(interval);
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        if (activeTab === 'favorites') {
            return savedTasks;
        }
        if (activeTab === 'ongoing') {
            // 进行中合并奇遇任务（奇遇任务置顶显示）
            const ongoingTasks = tasks.filter(task => task.status === 'ongoing');
            return [...encounterTasks, ...ongoingTasks];
        }
        return tasks.filter(task => {
            return task.status === activeTab;
        });
    }, [tasks, savedTasks, encounterTasks, activeTab]);

    const handleTaskClick = (task: TaskItem) => {
        // 奇遇任务跳转到奇遇执行页
        if (task.isSerendipity && task.encounterId) {
            onSerendipityExecution?.(task.encounterId);
            return;
        }

        if (task.status === 'ongoing') {
            // Change: Ongoing tasks card click goes to detail too (not execution)
            onTaskDetail?.(task.id, { from: 'ongoing' });
        } else if (task.status === 'scheduled') {
            // 从已预约进入，传递 fromScheduled 上下文
            onTaskDetail?.(task.id, { from: 'scheduled' });
        } else if (task.status === 'favorites') {
            onTaskDetail?.(task.id, { from: 'favorites' });
        } else {
            onTaskDetail?.(task.id);
        }
    };

    const handleStartClick = (task: TaskItem, e: React.MouseEvent) => {
        e.stopPropagation();

        // If ongoing, resume directly (skip prep confirm)
        if (task.status === 'ongoing') {
            startAndNavigate(task);
            return;
        }

        // Check for prep list
        if (task.prepListConfig && task.prepListConfig.length > 0) {
            setPendingStartTask(task);
            setShowPrepConfirm(true);
        } else {
            // No prep needed, start directly
            startAndNavigate(task);
        }
    };

    const startAndNavigate = async (task: TaskItem) => {
        if (task.status !== 'ongoing') {
            try {
                await execution.start(task.executionId || task.id);
            } catch (error) {
                console.error('Failed to start task:', error);
            }
        }
        onStartTask?.(task.id);
    };

    const handleConfirmPrep = () => {
        if (pendingStartTask) {
            onTaskPrep?.(pendingStartTask._raw, { autoStart: true });
            setShowPrepConfirm(false);
            setPendingStartTask(null);
        }
    };

    const handleConfirmDirectStart = () => {
        if (pendingStartTask) {
            startAndNavigate(pendingStartTask);
            setShowPrepConfirm(false);
            setPendingStartTask(null);
        }
    };

    const handlePrepClick = (task: TaskItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onTaskPrep && task._raw) {
            onTaskPrep({
                ...task._raw,
                taskId: task.id,
                executionId: task.executionId,
            });
        }
    };

    const handleNavigationClick = (task: TaskItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onNavigation) {
            onNavigation(task.id);
        }
    };

    const handleDeleteExecution = async (task: TaskItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!task.executionId) return;

        if (!confirm('确定要删除这个任务执行记录吗？这将无法恢复。')) return;

        try {
            await execution.delete(task.executionId);
            setTasks(prev => prev.filter(t => t.executionId !== task.executionId));
        } catch (err) {
            console.error('Failed to delete execution:', err);
            alert('删除失败，请重试');
        }
    };

    const handleAbandonEncounter = async (task: TaskItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!task.encounterId) return;

        if (!confirm('确定要放弃这个奇遇任务吗？放弃后可以再次触发新的奇遇。')) return;

        try {
            await encounterApi.abandon(task.encounterId);
            setEncounterTasks([]);
        } catch (err) {
            console.error('Failed to abandon encounter:', err);
            alert('放弃失败，请重试');
        }
    };

    const handleRemoveFavorite = async (task: TaskItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('确定要取消收藏这个任务吗？')) return;

        try {
            await userApi.toggleSaveTask(task.id);
            setSavedTasks(prev => prev.filter(t => t.id !== task.id));
        } catch (err) {
            console.error('Failed to remove favorite:', err);
            alert('取消收藏失败，请重试');
        }
    };

    const handleRequestReview = async (task: TaskItem, e: React.MouseEvent) => {
        e.stopPropagation();
        // Check local status first
        if (task.reviewStatus !== 'private') return;

        const confirmed = window.confirm('申请发布将把此任务提交审核，审核通过后将对所有用户可见。\n\n确定要转为公开任务吗？');
        if (!confirmed) return;

        try {
            await taskApi.update(task.id, { status: 'pending' });

            // Optimistic update
            setSavedTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, reviewStatus: 'pending' } : t
            ));

            alert('已提交审核，请耐心等待。');
        } catch (err) {
            console.error('Failed to request review:', err);
            alert('提交失败，请重试');
        }
    };


    const tabs = [
        { key: 'ongoing', label: '进行中', icon: 'play_arrow' },
        { key: 'scheduled', label: '已预约', icon: 'schedule' },
        { key: 'completed', label: '已完成', icon: 'check_circle' },
        { key: 'favorites', label: '收藏', icon: 'bookmark' },
    ];

    const getProgressColor = (progress: number) => {
        if (progress >= 80) return 'bg-green-500';
        if (progress >= 50) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 pt-safe bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <h1 className="text-xl font-bold">我的任务</h1>
                <button
                    onClick={onCreateTask}
                    className="flex items-center gap-1 px-4 py-2 bg-[#0ea5e9] text-white rounded-full text-sm font-bold shadow-lg shadow-[#0ea5e9]/30 hover:bg-sky-500 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    创建任务
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key as typeof activeTab)}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium rounded-lg transition-all duration-200 ${activeTab === tab.key
                                ? 'bg-white dark:bg-slate-600 text-[#0ea5e9] shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <span className="material-symbols-outlined text-4xl text-[#0ea5e9] animate-spin">progress_activity</span>
                        <p className="mt-4 text-slate-500">加载中...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <span className="material-symbols-outlined text-[64px] text-slate-300 dark:text-slate-600 mb-4">
                            {activeTab === 'ongoing' ? 'directions_run' :
                                activeTab === 'scheduled' ? 'event' :
                                    activeTab === 'completed' ? 'emoji_events' : 'bookmark'}
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 text-center">
                            {activeTab === 'ongoing' && '暂无进行中的任务'}
                            {activeTab === 'scheduled' && '暂无预约的任务'}
                            {activeTab === 'completed' && '暂无已完成的任务'}
                            {activeTab === 'favorites' && '暂无收藏的任务'}
                        </p>
                        {(activeTab === 'ongoing' || activeTab === 'favorites') && (
                            <button
                                onClick={onCreateTask}
                                className="mt-4 px-6 py-2 bg-[#0ea5e9] text-white rounded-full text-sm font-bold"
                            >
                                去探索
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 pb-16">
                        {filteredTasks.map(task => (
                            task.isSerendipity ? (
                                /* 奇遇任务使用迷你卡片 */
                                <div key={task.encounterId || task.id} className="relative">
                                    <EncounterMiniCard
                                        title={task.title}
                                        city={task.location}
                                        expiresAt={task.expiresAt}
                                        status="active"
                                        onClick={() => handleTaskClick(task)}
                                    />
                                    {/* 奇遇删除按钮 */}
                                    <button
                                        onClick={(e) => handleAbandonEncounter(task, e)}
                                        className="absolute top-1/2 -translate-y-1/2 right-10 text-slate-300 hover:text-red-500 transition-colors z-10"
                                        title="放弃奇遇"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">do_not_disturb_on</span>
                                    </button>
                                </div>
                            ) : (
                                <div
                                    key={task.executionId || task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer relative"
                                >
                                    {/* Top Right Action (Delete/Remove) */}
                                    <div className="absolute top-4 right-4 z-10">
                                        <button
                                            onClick={(e) => {
                                                if (task.isSerendipity) {
                                                    handleAbandonEncounter(task, e);
                                                } else if (task.status === 'favorites') {
                                                    handleRemoveFavorite(task, e);
                                                } else {
                                                    handleDeleteExecution(task, e);
                                                }
                                            }}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                            title={task.isSerendipity ? '放弃奇遇' : '删除'}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">
                                                {task.isSerendipity ? 'do_not_disturb_on' : task.status === 'favorites' ? 'bookmark_remove' : 'delete'}
                                            </span>
                                        </button>
                                    </div>

                                    <div className="flex gap-4">
                                        {/* Left Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Prep Badge - Clickable */}
                                            {(task.status === 'ongoing' || task.status === 'scheduled' || task.status === 'favorites') && (
                                                <div onClick={(e) => handlePrepClick(task, e)} className="cursor-pointer transition-opacity hover:opacity-80 active:opacity-60 inline-block">
                                                    <TaskPrepBadge
                                                        prepListConfig={task.prepListConfig}
                                                        prepList={task.prepList}
                                                        prepProgress={task.prepProgress}
                                                    />
                                                </div>
                                            )}

                                            {/* Tags & Location */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                {/* 审核状态标签 - pending 时显示 */}
                                                {task.reviewStatus === 'pending' && (
                                                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold rounded flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[12px]">pending</span>
                                                        正在审核中
                                                    </span>
                                                )}
                                                {task.reviewStatus === 'private' && (
                                                    <span
                                                        onClick={(e) => handleRequestReview(task, e)}
                                                        className="px-2 py-0.5 bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-200 text-[10px] font-bold rounded flex items-center gap-0.5 border border-slate-600 hover:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer transition-colors"
                                                        title="点击申请公开任务"
                                                    >
                                                        <span className="material-symbols-outlined text-[12px]">lock</span>
                                                        私密任务
                                                    </span>
                                                )}
                                                {task.isSerendipity ? (
                                                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                                                        奇遇任务
                                                    </span>
                                                ) : task.type === '官方推荐' ? (
                                                    <span className="px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-500 text-[10px] font-bold rounded">
                                                        官方推荐
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded">
                                                        {task.type}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-0.5 text-xs text-slate-400">
                                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                    {task.location}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 pr-6">
                                                {task.title}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">
                                                {task.description || '探索未知的旅程即将开始，请做好准备...'}
                                            </p>
                                        </div>

                                        {/* Success Tag (Absolute or Absolute in Image?) - Let's put it on top of image for "cool" effect or next to title? 
                                       User said "cool tag". Let's put a Gold Ribbon on the image. 
                                    */}
                                        {/* Right Image */}
                                        <div className="w-24 h-24 rounded-xl bg-slate-200 flex-shrink-0 relative overflow-hidden">
                                            {task.coverImage ? (
                                                <CapacitorImage
                                                    src={getImageUrl(task.coverImage)}
                                                    alt={task.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-display font-bold text-xl">
                                                    Task
                                                </div>
                                            )}

                                            {/* Success Tag */}
                                            {task.status === 'completed' && task.isSuccess && (
                                                <div className="absolute top-0 right-0 bg-gradient-to-bl from-yellow-400 to-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[12px]">emoji_events</span>
                                                    达成
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom Button */}
                                    {task.status === 'scheduled' && (
                                        (() => {
                                            const countdown = getCountdownText(task.scheduledTime, task.eventStartTime, task.isClubActivity);

                                            // 社团活动：只显示倒计时，不能提前开始
                                            if (task.isClubActivity) {
                                                return (
                                                    <div className="w-full mt-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                                                        <span>{countdown?.text || '等待活动开始'}</span>
                                                    </div>
                                                );
                                            }

                                            // 普通任务：显示倒计时 + 立即开始按钮
                                            return (
                                                <div className="mt-4 flex flex-col gap-2">
                                                    {/* 倒计时显示 */}
                                                    {countdown && !countdown.isOverdue && (
                                                        <div className="flex items-center justify-center gap-1.5 text-sm text-orange-600 dark:text-orange-400">
                                                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                            <span>{countdown.text}</span>
                                                        </div>
                                                    )}
                                                    {/* 立即开始按钮 - 始终显示 */}
                                                    <button
                                                        onClick={(e) => handleStartClick(task, e)}
                                                        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md bg-[#0ea5e9] hover:bg-sky-500 text-white shadow-blue-500/20"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                                        <span>立即开始</span>
                                                    </button>
                                                </div>
                                            );
                                        })()
                                    )}
                                    {task.status === 'ongoing' && (
                                        <button
                                            onClick={(e) => handleStartClick(task, e)}
                                            className={`w-full mt-4 py-3 rounded-xl font-bold flex items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-md ${task.isSerendipity
                                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-purple-500/20 hover:from-purple-600 hover:to-indigo-700'
                                                : 'bg-[#0ea5e9] text-white shadow-blue-500/20 hover:bg-sky-500'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {task.isSerendipity ? 'explore' : 'arrow_forward'}
                                            </span>
                                            <span>{task.isSerendipity ? '探索奇遇' : '继续探险'}</span>
                                            {task.isSerendipity && task.expiresAt && (
                                                <span className="text-xs opacity-75 ml-1">
                                                    ({Math.ceil((new Date(task.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}天后过期)
                                                </span>
                                            )}
                                        </button>
                                    )}
                                    {task.status === 'completed' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle Review
                                                onTaskDetail?.(task.id, { from: 'completed', executionId: task.executionId });
                                            }}
                                            className="w-full mt-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-[0.98] transition-all border border-slate-200 dark:border-slate-700"
                                        >
                                            <span className="material-symbols-outlined text-[18px] text-amber-500">history_edu</span>
                                            <span>回顾旅程</span>
                                        </button>
                                    )}
                                </div>
                            )
                        ))}
                    </div>
                )}

                {/* Prep Confirm Modal */}
                {showPrepConfirm && pendingStartTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 w-80 rounded-2xl p-6 shadow-2xl">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-orange-500 text-3xl">inventory_2</span>
                                </div>
                                <h3 className="text-lg font-bold mb-2">是否先进行备战？</h3>
                                <p className="text-sm text-slate-500 font-medium">该任务包含备战清单</p>
                                <p className="text-xs text-slate-400 mt-1">做好准备能让体验更完美哦</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleConfirmDirectStart}
                                    className="flex-1 py-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-sm"
                                >
                                    直接出发
                                </button>
                                <button
                                    onClick={handleConfirmPrep}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white font-bold hover:shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all"
                                >
                                    去备战
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTasksScreen;
