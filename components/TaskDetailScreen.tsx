import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { task as taskApi, execution as executionApi, encounter as encounterApi, user as userApi, club as clubApi } from '../services/api';
import { TaskProverbScreen } from './TaskProverbScreen';
import TimeLimitBadge from './TimeLimitBadge';
import SerendipityTriggerModal from './SerendipityTriggerModal';
import ImageUploader from '../src/components/common/ImageUploader';
import { getImageUrl } from '../src/utils/imageUrl';
import FriendSelectionModal from './FriendSelectionModal';
import ParticipantJournalModal from './ParticipantJournalModal';
import { useSocket } from '../src/contexts/SocketContext';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface TaskDetailScreenProps {
    onBack: () => void;
    onCheckIn: () => void;
    onTeamClick?: () => void;
    onNavigate?: () => void;
    encounters?: any[];
    onViewTaskEncounters?: () => void;
    onOpenEncounter?: (encounterId: string) => void;
    clubTask?: any;
    onRegisterClubTask?: () => void;
    taskId?: string | number | null;
    isExecutionView?: boolean;
    onCreatePost?: (taskId: string) => void; // 跳转到帖子发布页并关联任务
}

interface TimelineItem {
    id: number;
    title: string;
    status: 'completed' | 'active' | 'pending';
    icon: string;
    desc?: string;
    time?: string;
    tags: { icon: string; text: string; color: string }[];
    image?: string;
    requiresLocation?: boolean; // Added for location check
    locationName?: string; // 节点指定地点
    actionText?: string;
    timeLimit?: any;  // 节点时间限制配置
    record?: {  // 用户记录
        note?: string;
        imageUrls?: string[];
        imageUrl?: string;
    };
    navigation?: {
        from: string;
        to: string;
        distance: string;
        eta: string;
    };
    taxi?: {
        eta: string;
        price: string;
    };
    hotel?: {
        name: string;
        address: string;
        checkIn: string;
        checkOut: string;
        roomType: string;
    };
    attraction?: {
        openTime: string;
        ticket: string;
    };
}

const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ onBack, onCheckIn, onTeamClick, onNavigate, encounters = [], onViewTaskEncounters, onOpenEncounter, clubTask, onRegisterClubTask, taskId, isExecutionView = false, onCreatePost }) => {
    const [mode, setMode] = useState<'lite' | 'pro'>('pro');
    const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const [taskData, setTaskData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [executionData, setExecutionData] = useState<any>(null);
    const [activeNodeScrollRef, setActiveNodeScrollRef] = useState<HTMLDivElement | null>(null);

    // Socket.io for real-time updates
    const { socket, isConnected } = useSocket();

    // 三个点菜单状态
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // 奇遇触发相关状态
    const [triggeredEncounter, setTriggeredEncounter] = useState<any>(null);
    const [showEncounterModal, setShowEncounterModal] = useState(false);
    const [encounterDeclined, setEncounterDeclined] = useState(false); // 用户已拒绝奇遇

    // 社团活动Host识别
    const [isClubHost, setIsClubHost] = useState(false);

    // 点赞相关状态
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isSaved, setIsSaved] = useState(false);

    // Get Current User
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch (e) {
            return {};
        }
    });

    // 从后端获取任务详情
    useEffect(() => {
        const fetchTaskDetail = async () => {
            // Refresh current user from API for robust ID check
            try {
                const userRes = await userApi.getMe();
                if (userRes.data) {
                    setCurrentUser(userRes.data);
                    localStorage.setItem('user', JSON.stringify(userRes.data));
                }
            } catch (e) {
                console.warn('Failed to refresh user data', e);
            }

            if (!taskId || clubTask) return; // 如果是社团任务，使用 clubTask 数据

            setLoading(true);
            try {
                const response = await taskApi.getById(String(taskId));
                setTaskData(response.data);
                // 初始化点赞状态
                setLikeCount(response.data.likes?.length || 0);
                // 检查当前用户是否已点赞
                // currentUser is now from outer scope
                if (currentUser?._id && response.data.likes) {
                    setIsLiked(response.data.likes.some((uid: string) => uid === currentUser._id));
                }
                if (isExecutionView) {
                    try {
                        const execResponse = await executionApi.getOrCreate(String(taskId));
                        setExecutionData(execResponse.data);
                    } catch (execError) {
                        console.error('Failed to fetch execution:', execError);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch task detail:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTaskDetail();
    }, [taskId, clubTask, isExecutionView]);

    // 社团活动：自动执行检查 & Host识别
    useEffect(() => {
        if (!taskData || !isExecutionView) return;

        // 1. 自动执行检查：如果是社团活动且已到开始时间，自动转为ongoing
        const checkAutoStart = async () => {
            if (!executionData || executionData.status !== 'scheduled') return;

            const eventStartDate = taskData.timeConfig?.eventStartDate;
            if (!eventStartDate) return;

            const now = new Date();
            const startTime = new Date(eventStartDate);

            if (now >= startTime) {
                console.log('[TaskDetailScreen] Auto-starting club activity execution');
                try {
                    const response = await executionApi.start(String(taskId));
                    setExecutionData(response.data);
                } catch (err) {
                    console.error('[TaskDetailScreen] Auto-start failed:', err);
                }
            }
        };

        // 2. Host识别：如果是社团活动，检查当前用户是否是社团团长
        const checkClubHost = async () => {
            const clubId = taskData.clubId?._id || taskData.clubId;
            if (!clubId || !currentUser?._id) {
                setIsClubHost(false);
                return;
            }

            try {
                const response = await clubApi.getDetail(clubId);
                const club = response.data;
                const presidentId = club.president?._id || club.president;
                setIsClubHost(presidentId === currentUser._id);
            } catch (err) {
                console.error('[TaskDetailScreen] Failed to check club host:', err);
                setIsClubHost(false);
            }
        };

        checkAutoStart();
        checkClubHost();
    }, [taskData, executionData?.status, isExecutionView, taskId, currentUser?._id]);

    // Socket.io: Join execution room and listen for updates
    useEffect(() => {
        if (!socket || !isConnected || !executionData?._id || !isExecutionView) return;

        // Determine the room ID (use host execution ID for guests)
        const roomId = executionData.coopContext?.isHost
            ? executionData._id
            : executionData.coopContext?.hostExecutionId || executionData._id;

        console.log('[TaskDetailScreen] Joining execution room:', roomId);
        socket.emit('join-execution', roomId);

        // Listen for execution updates
        const handleExecutionUpdate = (data: any) => {
            console.log('[TaskDetailScreen] Received execution-updated:', data);

            // Refresh execution data
            if (taskId) {
                executionApi.getOrCreate(String(taskId))
                    .then(response => {
                        setExecutionData(response.data);
                        console.log('[TaskDetailScreen] Execution data refreshed');
                    })
                    .catch(error => {
                        console.error('[TaskDetailScreen] Failed to refresh execution:', error);
                    });
            }
        };

        // Listen for participant joined events
        const handleParticipantJoined = (data: any) => {
            console.log('[TaskDetailScreen] Received participant-joined:', data);

            // Update participants list in execution data
            if (data.participants) {
                setExecutionData((prev: any) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        coopContext: {
                            ...prev.coopContext,
                            participants: data.participants
                        }
                    };
                });
            }
        };

        socket.on('execution-updated', handleExecutionUpdate);
        socket.on('participant-joined', handleParticipantJoined);

        // Cleanup
        return () => {
            console.log('[TaskDetailScreen] Leaving execution room:', roomId);
            socket.emit('leave-execution', roomId);
            socket.off('execution-updated', handleExecutionUpdate);
            socket.off('participant-joined', handleParticipantJoined);
        };
    }, [socket, isConnected, executionData?._id, isExecutionView, taskId]);

    // State for Friend Selection Modal
    const [showFriendModal, setShowFriendModal] = useState(false);

    // State for Participant Journal Modal
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [selectedJournalUserId, setSelectedJournalUserId] = useState<string>('');

    const handleInviteFriend = async (friendId: string) => {
        if (!executionData?._id) return;
        try {
            await executionApi.inviteFriend(executionData._id, friendId);
            alert('邀请已发送');
            setShowFriendModal(false);
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.error || '邀请失败，请重试');
        }
    };

    // 奇遇触发检测
    const checkSerendipity = useCallback(async () => {
        if (!executionData?._id) {
            console.log('[Serendipity] Skip: No execution data');
            return;
        }
        if (triggeredEncounter) {
            console.log('[Serendipity] Skip: Already triggered');
            return;
        }
        if (encounterDeclined) {
            console.log('[Serendipity] Skip: User declined encounter');
            return;
        }

        try {
            console.log('[Serendipity] Checking trigger for execution:', executionData._id);
            const response = await encounterApi.checkTrigger(executionData._id);
            console.log('[Serendipity] Response:', response.data);

            if (response.data?.triggered) {
                setTriggeredEncounter(response.data.encounter);
                setShowEncounterModal(true);
            } else {
                console.log('[Serendipity] Not triggered, reason:', response.data?.reason);
            }
        } catch (err) {
            console.error('Serendipity check failed:', err);
        }
    }, [executionData?._id, triggeredEncounter, encounterDeclined]);

    // 触发奇遇检测 - 在执行视图下，当有执行数据时检测
    useEffect(() => {
        if (isExecutionView && executionData?._id && !triggeredEncounter && !encounterDeclined) {
            checkSerendipity();
        }
    }, [isExecutionView, executionData?._id, checkSerendipity, triggeredEncounter, encounterDeclined]);

    // 处理奇遇接受
    const handleAcceptEncounter = async () => {
        if (!triggeredEncounter) return;
        try {
            await encounterApi.accept(triggeredEncounter._id);
            setShowEncounterModal(false);
        } catch (err) {
            console.error('Accept encounter failed:', err);
        }
    };

    // 处理奇遇拒绝
    const handleDeclineEncounter = async () => {
        if (triggeredEncounter?._id) {
            try {
                await encounterApi.abandon(triggeredEncounter._id);
            } catch (err) {
                console.error('Abandon encounter failed:', err);
            }
        }
        setShowEncounterModal(false);
        setTriggeredEncounter(null);
        setEncounterDeclined(true); // 标记用户已拒绝，防止重复触发
    };

    // 处理点赞
    const handleLike = async () => {
        if (!taskId) return;
        try {
            // 乐观更新
            setIsLiked(prev => !prev);
            setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

            const response = await taskApi.like(String(taskId));
            // 使用服务器返回的数据更新状态
            setIsLiked(response.data.isLiked);
            setLikeCount(response.data.likeCount);
        } catch (err) {
            console.error('Like failed:', err);
            // 回滚
            setIsLiked(prev => !prev);
            setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
        }
    };

    // 处理收藏
    const handleSave = async () => {
        if (!taskId) return;
        try {
            setIsSaved(prev => !prev);
            await userApi.toggleSaveTask(String(taskId));
        } catch (err) {
            console.error('Save failed:', err);
            setIsSaved(prev => !prev);
        }
    };

    // Auto-scroll to active node
    useEffect(() => {
        if (activeNodeScrollRef) {
            activeNodeScrollRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeNodeScrollRef]);

    const taskInfo = clubTask ? {
        title: clubTask.title,
        subtitle: `社团活动 · ${clubTask.location}`
    } : taskData ? {
        title: taskData.title,
        subtitle: (taskData.targetCities && taskData.targetCities.length > 0)
            ? `${taskData.targetCities.join(' / ')}`
            : (taskData.location?.name && taskData.location.name !== '未知地点')
                ? taskData.location.name
                : (taskData.description || '探索城市的精彩')
    } : {
        title: '加载中...',
        subtitle: ''
    };

    const isClubTask = Boolean(clubTask);
    const now = Date.now();
    const startAt = clubTask?.startAt ? new Date(clubTask.startAt).getTime() : 0;
    const endAt = clubTask?.endAt ? new Date(clubTask.endAt).getTime() : 0;
    const capacity = typeof clubTask?.capacity === 'number' ? clubTask.capacity : null;
    const joined = typeof clubTask?.joined === 'number' ? clubTask.joined : 0;
    const isFull = capacity !== null && joined >= capacity;
    const canRegister = !isClubTask || ((startAt && endAt ? now >= startAt && now <= endAt : true) && !isFull);

    // Task Overall Countdown Logic
    const hasTaskCountdown = Boolean(
        taskData?.timeConfig?.hasTimeChallenge
        && taskData?.timeConfig?.taskTimeLimit?.type === 'countdown'
        && taskData?.timeConfig?.limit // Assuming 'limit' in minutes exists
        && executionData?.startTime // Must have started
    );

    useEffect(() => {
        if (!hasTaskCountdown || !executionData?.startTime) {
            setRemainingTime(null);
            return;
        }

        const limitSeconds = (taskData.timeConfig.limit || 0) * 60;
        const startTimeCalls = new Date(executionData.startTime).getTime();

        const tick = () => {
            const nowTime = Date.now();
            const elapsed = (nowTime - startTimeCalls) / 1000;
            const left = Math.max(0, limitSeconds - elapsed);
            setRemainingTime(left);
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [hasTaskCountdown, executionData?.startTime, taskData]);

    const formattedTime = useMemo(() => {
        if (remainingTime === null) return null;
        const h = Math.floor(remainingTime / 3600);
        const m = Math.floor((remainingTime % 3600) / 60);
        const s = Math.floor(remainingTime % 60);
        return {
            h: h.toString().padStart(2, '0'),
            m: m.toString().padStart(2, '0'),
            s: s.toString().padStart(2, '0')
        };
    }, [remainingTime]);

    // 从任务数据生成时间线节点
    const timelineItems: TimelineItem[] = useMemo(() => {
        if (!taskData?.nodes || taskData.nodes.length === 0) {
            return [];
        }

        const completedNodes = executionData?.completedNodes || [];
        // executionData.completedNodes stores INDEXES of completed nodes
        const activeIndex = taskData.nodes.findIndex((_: any, index: number) => !completedNodes.includes(index));
        const currentIndex = activeIndex === -1 ? (completedNodes.length === taskData.nodes.length ? -1 : taskData.nodes.length - 1) : activeIndex;

        return taskData.nodes.map((node: any, index: number) => {
            let status: 'completed' | 'active' | 'pending' = 'pending';
            if (completedNodes.includes(index)) status = 'completed';
            else if (index === currentIndex) status = 'active';

            // 获取节点记录
            const nodeRecord = executionData?.nodeRecords?.find((r: any) => r.nodeIndex === index);

            // Node specific info
            const isLocationSpecific = !!node.isLocationSpecific;
            const hasNodeTimeLimit = node.timeLimit && node.timeLimit.type && node.timeLimit.type !== 'none';

            // 根据限时类型显示不同标签
            const getTimeLimitTag = () => {
                if (!hasNodeTimeLimit) return null;
                switch (node.timeLimit.type) {
                    case 'countdown':
                        return { icon: 'timer', text: '限时挑战', color: 'red' };
                    case 'timeRange':
                        return { icon: 'schedule', text: `${node.timeLimit.timeRangeStart}-${node.timeLimit.timeRangeEnd}`, color: 'purple' };
                    case 'deadline':
                        return { icon: 'alarm', text: `${node.timeLimit.deadlineType === 'before' ? '截止' : '开始'} ${node.timeLimit.deadlineTime}`, color: 'orange' };
                    default:
                        return null;
                }
            };
            const timeLimitTag = getTimeLimitTag();

            return {
                id: index, // Use index as ID for API calls
                displayId: index + 1,
                title: node.name || node.locationName || node.description?.split('：')[0] || `节点 ${index + 1}`,
                status,
                icon: isLocationSpecific ? 'location_on' : 'explore',
                desc: node.description,
                // Remove fake time
                tags: [
                    // ...(isLocationSpecific ? [{ icon: 'location_on', text: '定位打卡', color: 'blue' }] : []), // 注释掉定位打卡标签，改用专门的地点展示区域
                    ...(timeLimitTag ? [timeLimitTag] : []),
                    ...(!isLocationSpecific && !hasNodeTimeLimit ? [{ icon: 'explore', text: '自由探索', color: 'orange' }] : [])
                ],
                image: node.referenceImageUrl,
                hasAction: status === 'active',
                actionText: status === 'active' ? (isLocationSpecific ? '检查位置 & 打卡' : '完成打卡') : undefined,
                // Only show location check if specific
                requiresLocation: isLocationSpecific,
                locationName: node.location?.name, // 节点指定地点
                // 节点时间限制
                timeLimit: node.timeLimit,
                // 用户记录
                record: nodeRecord ? {
                    note: nodeRecord.note,
                    imageUrls: nodeRecord.imageUrls,
                    imageUrl: nodeRecord.imageUrl
                } : undefined,

                // Accurate Navigation Info
                navigation: index > 0 ? {
                    from: taskData.nodes[index - 1]?.name || `节点 ${index}`,
                    to: node.name || `节点 ${index + 1}`,
                    // In a real app, calculate distance. Here we remove fake data unless we have coords.
                    distance: '',
                    eta: ''
                } : undefined,

                // Remove fake attraction info
                attraction: undefined
            };
        });
    }, [taskData, executionData]);

    const displayTimelineItems = useMemo(() => {
        if (mode === 'pro') return timelineItems;
        // Lite mode logic (simplified)
        const activeIndex = timelineItems.findIndex((item) => item.status === 'active');
        const nextIndex = activeIndex === -1 ? 0 : activeIndex;
        return timelineItems.slice(nextIndex, nextIndex + 2);
    }, [mode, timelineItems]);

    // Helper styles mapping
    const getStatusStyles = (status: string) => {
        if (status === 'completed') return {
            wrapper: 'opacity-100',
            badge: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
            badgeText: '已打卡',
            iconBg: 'bg-primary text-white shadow-md'
        };
        if (status === 'active') return {
            wrapper: 'opacity-100 ring-2 ring-primary/20',
            badge: 'bg-primary/10 dark:bg-primary/20 text-primary',
            badgeText: '进行中',
            iconBg: 'bg-white dark:bg-slate-800 border-2 border-primary text-primary shadow-sm'
        };
        return {
            wrapper: 'opacity-60 grayscale-[0.5]',
            badge: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
            badgeText: '未开始',
            iconBg: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        };
    };

    const getTagColor = (color: string) => {
        switch (color) {
            case 'blue': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'orange': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'red': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'purple': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    // Modal States
    const [checkInModal, setCheckInModal] = useState<{ visible: boolean; nodeIndex: number | null; requiresLocation: boolean; mode: 'record' | 'view' }>({ visible: false, nodeIndex: null, requiresLocation: false, mode: 'record' });
    const [completionModal, setCompletionModal] = useState<{ visible: boolean; type: 'success' | 'complete' | null }>({ visible: false, type: null });
    const [summaryModal, setSummaryModal] = useState<{ visible: boolean }>({ visible: false });
    const [summaryNote, setSummaryNote] = useState('');
    const [summaryImage, setSummaryImage] = useState<string | null>(null);
    const [checkInComment, setCheckInComment] = useState('');
    const [checkInImages, setCheckInImages] = useState<string[]>([]);
    const [showProverb, setShowProverb] = useState(false);
    const [pendingCompletionType, setPendingCompletionType] = useState<'success' | 'complete'>('complete');

    // QA 状态
    const [showQAModal, setShowQAModal] = useState(false);
    const [qaAnswer, setQaAnswer] = useState('');
    const [qaError, setQaError] = useState('');
    const [qaSubmitting, setQaSubmitting] = useState(false);
    const [pendingQANodeIndex, setPendingQANodeIndex] = useState<number | null>(null);

    // Load existing record when modal opens
    useEffect(() => {
        if (checkInModal.visible && checkInModal.nodeIndex !== null && executionData) {
            const record = executionData.nodeRecords?.find((r: any) => r.nodeIndex === checkInModal.nodeIndex);
            if (record) {
                setCheckInComment(record.note || '');
                // 支持多图片：优先使用 imageUrls 数组，兼容旧的 imageUrl 单图
                const images = record.imageUrls || (record.imageUrl ? [record.imageUrl] : []);
                setCheckInImages(images);
            } else {
                setCheckInComment('');
                setCheckInImages([]);
            }
        }
    }, [checkInModal.visible, checkInModal.nodeIndex, executionData]);

    // Check Completion Logic
    useEffect(() => {
        if (!taskData || !executionData) return;

        const totalNodes = taskData.nodes.length;
        const completedCount = executionData.completedNodes.length;

        console.log('[TaskDetailScreen] Debug Completion:', { totalNodes, completedCount, completedNodes: executionData.completedNodes });

        if (completedCount === totalNodes && !completionModal.visible && !summaryModal.visible && executionData.status !== 'completed') {
            // Intercept with Summary Modal
            setSummaryModal({ visible: true });
        }
    }, [executionData, taskData, completionModal.visible, summaryModal.visible]);

    const handleFinishTask = async () => {
        if (!executionData) return;
        try {
            // Will determine type after API response

            // Debug log
            console.log('[TaskDetailScreen] handleFinishTask - sending to API:', {
                executionId: executionData._id,
                summaryNote: summaryNote,
                summaryNoteLength: summaryNote?.length,
                summaryImageUrl: summaryImage
            });

            // Call API
            const response = await executionApi.complete(executionData._id, {
                summaryNote,
                summaryImageUrl: summaryImage
            });

            // Use backend logic to determine success
            const resultType: 'success' | 'complete' = response.data.isSuccess ? 'success' : 'complete';

            // Update Local State
            setSummaryModal({ visible: false });
            setPendingCompletionType(resultType);
            setShowProverb(true);

            // Update execution data directly from response
            setExecutionData(response.data);

        } catch (err) {
            console.error('Completion failed:', err);
            alert('提交失败，请重试');
        }
    };

    // UI Handlers

    // 1. Open Record Modal (View or Edit)
    const handleRecordAction = (item: TimelineItem, mode: 'record' | 'view') => {
        setCheckInModal({
            visible: true,
            nodeIndex: item.id,
            requiresLocation: false,
            mode
        });
        setCheckInComment('');
        setCheckInImages([]);
    };

    // 2. Save Record (Does NOT complete node)
    const saveRecord = async () => {
        if (checkInModal.nodeIndex === null) return;

        try {
            await executionApi.saveNodeRecord(executionData._id, checkInModal.nodeIndex, {
                note: checkInComment,
                imageUrls: checkInImages.length > 0 ? checkInImages : undefined
            });

            // Refresh local data to show persisted record next time
            const execResponse = await executionApi.getOrCreate(String(taskId));
            setExecutionData(execResponse.data);

            setCheckInModal(prev => ({ ...prev, visible: false }));
        } catch (e) {
            console.error("Failed to save record:", e);
            alert("保存失败，请重试");
        }
    };

    // 3. Complete Node (Direct Action)
    const handleCompleteNode = async (item: TimelineItem) => {
        // Location Check - 已注释，只展示地点不验证
        // if (item.requiresLocation) {
        //     const verified = window.confirm(`[Mock] 正在验证您是否位于 "${item.title}" ...\n(点击确定模拟验证通过)`);
        //     if (!verified) return;
        // }

        // QA Check - 查找对应的 node 数据
        const nodeData = taskData?.nodes?.[item.id];
        if (nodeData?.qaModule?.enabled) {
            setPendingQANodeIndex(item.id);
            setQaAnswer('');
            setQaError('');
            setShowQAModal(true);
            return;
        }

        try {
            await executionApi.checkNode(executionData._id, String(item.id), 'manual');

            const execResponse = await executionApi.getOrCreate(String(taskId));
            setExecutionData(execResponse.data);

            // 节点完成后检查奇遇
            checkSerendipity();
        } catch (e) {
            alert("打卡失败，请重试");
            console.error(e);
        }
    };

    // 问答验证提交
    const submitQA = async () => {
        if (!qaAnswer.trim()) {
            setQaError('请输入答案');
            return;
        }
        if (pendingQANodeIndex === null || !executionData?._id) return;

        setQaSubmitting(true);
        try {
            const res = await executionApi.validateNodeQA(executionData._id, pendingQANodeIndex, qaAnswer);
            if (res.data.correct) {
                setShowQAModal(false);
                await executionApi.checkNode(executionData._id, String(pendingQANodeIndex), 'qa_pass');
                const execResponse = await executionApi.getOrCreate(String(taskId));
                setExecutionData(execResponse.data);
                alert('回答正确！打卡成功！');
                checkSerendipity();
            } else if (res.data.failed_and_skipped) {
                // Auto skip
                setShowQAModal(false);
                const execResponse = await executionApi.getOrCreate(String(taskId));
                setExecutionData(execResponse.data);
                alert(res.data.message || '次数用尽，已自动打卡（未通过挑战）');
            } else {
                const nodeData = taskData?.nodes?.[pendingQANodeIndex];
                const maxAttempts = nodeData?.qaModule?.maxAttempts || 3;
                setQaError(`回答错误，已尝试 ${res.data.attempts} 次`);

                // Refresh data to update attempts counter UI
                const execResponse = await executionApi.getOrCreate(String(taskId));
                setExecutionData(execResponse.data);

                if (taskData?.taskType === 'serendipity' && res.data.attempts >= maxAttempts) {
                    alert('挑战失败！奇遇已消失。');
                    onBack();
                }
            }
        } catch (err: any) {
            console.error('QA Validation error:', err);
            setQaError('验证失败，请重试');
        } finally {
            setQaSubmitting(false);
        }
    };

    const handleRequestReview = async () => {
        if (!taskId) return;
        const confirmed = window.confirm('申请发布将把此任务提交审核，审核通过后将对所有用户可见。\n\n确定要转为公开任务吗？');
        if (!confirmed) return;

        try {
            setLoading(true);
            await taskApi.update(String(taskId), { status: 'pending' });
            alert('已提交审核，请耐心等待。');
            // Refresh
            const response = await taskApi.getById(String(taskId));
            setTaskData(response.data);
        } catch (e) {
            console.error(e);
            alert('提交失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handlePostTaskAction = (action: 'publish' | 'share') => {
        setCompletionModal({ visible: false, type: null });
        if (action === 'share' && onCreatePost && taskId) {
            // 跳转到帖子发布页并关联任务
            onCreatePost(String(taskId));
        } else if (action === 'publish') {
            handleRequestReview();
        } else {
            onBack();
        }
    };

    // 举报任务
    const handleReportTask = async () => {
        if (!taskId) return;
        setShowMoreMenu(false);

        const confirmed = window.confirm('确定要举报此任务吗？恶意举报可能会影响您的账号。');
        if (!confirmed) return;

        try {
            await taskApi.report(String(taskId));
            alert('举报已提交，我们将尽快处理');
        } catch (err: any) {
            console.error('Report task failed:', err);
            alert(err.response?.data?.error || '举报失败，请重试');
        }
    };

    // 分享任务
    const handleShareTask = () => {
        setShowMoreMenu(false);
        if (navigator.share) {
            navigator.share({
                title: taskData?.title || '分享任务',
                text: `来看看这个有趣的任务：${taskData?.title}`,
                url: window.location.href
            }).catch(() => { });
        } else {
            // 复制链接到剪贴板
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('链接已复制到剪贴板');
            }).catch(() => {
                alert('复制失败，请手动复制链接');
            });
        }
    };

    // Loading 状态
    if (loading || !taskData) {
        // ... (Keep existing loading UI)
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">正在加载任务详情...</p>
            </div>
        );
    }

    // Prep Progress Logic
    const prepProgressText = executionData?.prepList
        ? `备战已就绪 ${executionData.prepList.filter((i: any) => i.completed).length}/${executionData.prepList.length}`
        : "点击查看备战清单";

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 font-display text-text-main dark:text-white transition-colors duration-200">

            {/* Header */}
            <div className="flex items-center px-4 py-4 justify-between bg-slate-50 dark:bg-slate-900 sticky top-0 z-20">
                <button
                    onClick={onBack}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                    <span className="material-symbols-outlined text-text-main dark:text-white">arrow_back_ios_new</span>
                </button>
                <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center truncate pr-2">
                    {isExecutionView ? '任务执行' : '任务详情'}
                </h2>
                {/* 点赞和收藏按钮 */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleLike}
                        className="flex h-10 items-center gap-1 px-3 shrink-0 justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all active:scale-90"
                    >
                        <span
                            className={`material-symbols-outlined text-[22px] transition-colors ${isLiked ? 'text-red-500' : 'text-text-muted'}`}
                            style={isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                            favorite
                        </span>
                        {likeCount > 0 && (
                            <span className={`text-sm font-bold ${isLiked ? 'text-red-500' : 'text-text-muted'}`}>
                                {likeCount}
                            </span>
                        )}
                    </button>
                    {/* 社团任务不显示收藏按钮 */}
                    {!taskData?.clubId && (
                        <button
                            onClick={handleSave}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all active:scale-90"
                        >
                            <span
                                className={`material-symbols-outlined text-[22px] transition-colors ${isSaved ? 'text-primary' : 'text-text-muted'}`}
                                style={isSaved ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                                bookmark
                            </span>
                        </button>
                    )}
                    {/* 三个点菜单按钮 */}
                    <button
                        onClick={() => setShowMoreMenu(true)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all active:scale-90"
                    >
                        <span className="material-symbols-outlined text-[22px] text-text-muted">more_vert</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">

                {/* Title Section */}
                <div className="px-6 pt-2 pb-4 text-center">
                    <h1 className="text-text-main dark:text-white tracking-tight text-3xl font-extrabold leading-tight">{taskInfo.title}</h1>
                    <p className="text-text-muted dark:text-slate-400 text-sm mt-1">{taskInfo.subtitle}</p>
                </div>

                {/* Companions Bar (Co-op Mode) */}
                {isExecutionView && (
                    <div className="px-6 pb-2 -mt-2 mb-2 flex justify-center animate-in fade-in slide-in-from-top-1">
                        {((executionData?.coopContext?.participants && executionData.coopContext.participants.length > 0) ||
                            (!executionData?.coopContext || executionData?.coopContext?.isHost || isClubHost)) && (
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm">
                                    {(() => {
                                        const parts = executionData?.coopContext?.participants || [];
                                        console.log('=== TaskDetailScreen Companions Bar Debug ===');
                                        console.log('Raw Participants:', parts);
                                        console.log('Current User:', currentUser);
                                        console.log('Participants Length:', parts.length);

                                        // Filter out current user
                                        const filtered = parts.filter((p: any) => {
                                            const pId = typeof p === 'string' ? p : (p._id || p.userId || p.id);
                                            const currentId = currentUser?._id || currentUser?.id;
                                            const shouldShow = pId && pId !== currentId;
                                            console.log(`Participant ${typeof p === 'string' ? p : p.username}: pId=${pId}, currentId=${currentId}, shouldShow=${shouldShow}`);
                                            return shouldShow;
                                        });

                                        console.log('Filtered Participants:', filtered);
                                        console.log('=============================================');

                                        return filtered.map((p: any) => {
                                            // Handle both populated objects and string IDs
                                            const participantId = typeof p === 'string' ? p : (p._id || p.userId || p.id);
                                            const participantName = typeof p === 'string' ? 'user' : (p.username || p.name || 'user');
                                            const participantAvatar = typeof p === 'string'
                                                ? `https://api.dicebear.com/7.x/notionists/svg?seed=${participantId}`
                                                : (p.avatarUrl ? getImageUrl(p.avatarUrl) : `https://api.dicebear.com/7.x/notionists/svg?seed=${participantName}`);

                                            return (
                                                <CapacitorImage
                                                    key={participantId}
                                                    src={participantAvatar}
                                                    className="w-7 h-7 rounded-full border border-white dark:border-slate-800 bg-slate-200 cursor-pointer hover:scale-110 transition-transform object-cover"
                                                    onClick={() => {
                                                        console.log('Clicked Avatar:', p);
                                                        console.log('Setting selectedJournalUserId:', participantId);
                                                        setSelectedJournalUserId(participantId);
                                                        setShowJournalModal(true);
                                                    }}
                                                />
                                            );
                                        });
                                    })()}

                                    {/* Invite Button - Hidden for club activities (auto-managed through registration) */}
                                    {(executionData?.coopContext?.participants?.length || 0) < 18 && !taskData?.clubId && (
                                        <button
                                            className="h-7 px-3 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                            onClick={() => setShowFriendModal(true)}
                                            title="邀请好友同行"
                                        >
                                            <span className="material-symbols-outlined text-[16px] text-[#257bf4]">add</span>
                                            <span className="text-xs font-bold text-[#257bf4]">好友同行</span>
                                        </button>
                                    )}
                                </div>
                            )}
                    </div>
                )}

                {/* Deleted Warning */}
                {taskData?.isDeleted && (
                    <div className="px-4 mb-4">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                            <span className="material-symbols-outlined text-red-500">warning</span>
                            <p className="text-sm text-red-600 dark:text-red-400 font-bold">此任务已被发布者下架或删除，不再公开显示。</p>
                        </div>
                    </div>
                )}

                {/* Private Task Status Panel */}
                {taskData?.status === 'private' && (
                    <div className="px-4 mb-4 animate-in slide-in-from-top-2">
                        <div className="bg-slate-900 dark:bg-slate-800 border-2 border-slate-800 dark:border-slate-700 rounded-2xl p-4 shadow-xl">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-white text-lg">lock</span>
                                        <h3 className="text-white font-bold text-base">私密任务</h3>
                                    </div>
                                    <p className="text-slate-400 text-xs leading-relaxed">此任务仅您自己可见。想要分享给更多人？您可以申请公开任务。</p>
                                </div>
                                <button
                                    onClick={handleRequestReview}
                                    className="shrink-0 px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors shadow-lg shadow-white/10"
                                >
                                    去审核
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Timer Bar - 整体任务限时 */}
                {taskData?.timeConfig?.taskTimeLimit && taskData.timeConfig.taskTimeLimit.type !== 'none' && (
                    <div className="px-4 mb-4">
                        <TimeLimitBadge
                            timeLimit={taskData.timeConfig.taskTimeLimit}
                            startTime={executionData?.startTime}
                            variant="full"
                        />
                    </div>
                )}

                {/* Mode Toggle */}
                <div className="flex justify-center px-6 py-2 mb-4">
                    <div className="flex h-12 w-full max-w-[300px] items-center justify-center rounded-full bg-[#eef1f3] dark:bg-[#1e2a30] p-1 shadow-inner">
                        <button onClick={() => setMode('lite')} className={`group relative flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-full px-4 transition-all duration-300`}>
                            <span className={`truncate text-sm font-bold z-10 ${mode === 'lite' ? 'text-black dark:text-white' : 'text-gray-400'}`}>极简模式</span>
                            {mode === 'lite' && <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-sm m-1 transition-transform"></div>}
                        </button>
                        <button onClick={() => setMode('pro')} className={`relative flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-full px-4 transition-all duration-300`}>
                            {mode === 'pro' && <div className="absolute inset-0 bg-primary shadow-sm rounded-full m-0.5"></div>}
                            <span className={`relative truncate text-sm font-bold z-10 ${mode === 'pro' ? 'text-white' : 'text-gray-400'}`}>专业模式</span>
                        </button>
                    </div>
                </div>

                {/* Prep Status Card (New Location) */}
                {isExecutionView && (
                    <div className="px-4 mb-6">
                        <button
                            onClick={() => onNavigate?.()}
                            className="w-full bg-emerald-50 dark:bg-emerald-900/20 active:scale-[0.98] transition-all duration-200 p-4 rounded-xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/30"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                                    <span className="material-symbols-outlined">backpack</span>
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">备战清单</h4>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400">{prepProgressText}</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-emerald-400">chevron_right</span>
                        </button>
                    </div>
                )}

                {/* Timeline */}
                <div className="px-4">
                    <div className="flex flex-col gap-4">
                        {displayTimelineItems.map((item) => {
                            const styles = getStatusStyles(item.status);
                            return (
                                <div key={item.id} className="w-full" ref={item.status === 'active' ? setActiveNodeScrollRef : null}>
                                    <div className={`bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all ${styles.wrapper}`}>
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-gray-900 dark:text-white text-lg font-bold">{item.title}</h4>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${styles.badge}`}>{styles.badgeText}</span>
                                        </div>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {item.tags.map((tag, i) => (
                                                <span key={i} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${getTagColor(tag.color)}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{tag.icon}</span>{tag.text}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Location Display - Prominent */}
                                        {item.locationName && (
                                            <div className="mb-4 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-amber-900/30 border-2 border-amber-400 dark:border-amber-600 rounded-xl p-4 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-amber-500 dark:bg-amber-600 rounded-full flex items-center justify-center shadow-md">
                                                        <span className="material-symbols-outlined text-white text-[24px]">location_on</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-1 tracking-wide uppercase">📍 任务地点</p>
                                                        <p className="text-base font-bold text-amber-950 dark:text-amber-50 leading-tight">{item.locationName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Desc */}
                                        {item.desc && <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">{item.desc}</p>}

                                        {/* Reference Image - 参考图 */}
                                        {item.image && (
                                            <div className="mb-3">
                                                <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700">
                                                    <CapacitorImage
                                                        src={getImageUrl(item.image)}
                                                        alt="参考图"
                                                        className="w-full h-48 object-cover"
                                                    />
                                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-white text-[14px]">image</span>
                                                        <span className="text-white text-xs font-medium">参考图</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 节点限时显示 */}
                                        {item.timeLimit && item.timeLimit.type !== 'none' && (
                                            <div className="mb-3">
                                                <TimeLimitBadge
                                                    timeLimit={item.timeLimit}
                                                    startTime={
                                                        // MongoDB Map 序列化后变成对象，用字符串索引访问
                                                        executionData?.nodeStartTimes?.[String(item.id)] ||
                                                        (item.id === 0 ? executionData?.startTime : undefined)
                                                    }
                                                    variant="full"
                                                />
                                            </div>
                                        )}

                                        {/* Active Node: Split Actions (Compact Design) */}
                                        {item.status === 'active' && (
                                            <div className="flex gap-3 mt-3 relative">
                                                {/* Record Button - Always accessible */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRecordAction(item, 'record'); }}
                                                    className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                                                    title="记录瞬间"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                                </button>

                                                {/* Complete Button Logic */}
                                                {executionData?.coopContext && !executionData.coopContext.isHost && !isClubHost ? (
                                                    // For Guests: Show Waiting State
                                                    <button
                                                        className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                                        title="仅队长可操作"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">lock_clock</span>
                                                        等待队长打卡
                                                    </button>
                                                ) : (
                                                    // For Host / Solo: Show Complete Action
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCompleteNode(item); }}
                                                        className="flex-1 h-12 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-sky-200/50 dark:shadow-none flex items-center justify-center gap-2 hover:bg-sky-600 transition-colors active:scale-95"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            check_circle
                                                        </span>
                                                        完成节点
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Completed Node: Show Record Inline */}
                                        {item.status === 'completed' && item.record && (item.record.note || (item.record.imageUrls && item.record.imageUrls.length > 0) || item.record.imageUrl) && (
                                            <div className="mt-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border-l-4 border-[#0ea5e9]">
                                                {/* 显示图片 */}
                                                {(item.record.imageUrls && item.record.imageUrls.length > 0) ? (
                                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                                        {item.record.imageUrls.map((url, imgIdx) => (
                                                            <div
                                                                key={imgIdx}
                                                                className="aspect-square rounded-lg shrink-0 overflow-hidden"
                                                            >
                                                                <CapacitorImage
                                                                    src={getImageUrl(url)}
                                                                    alt={`record-${imgIdx}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : item.record.imageUrl && (
                                                    <div className="w-full h-32 rounded-lg shrink-0 overflow-hidden mb-3">
                                                        <CapacitorImage
                                                            src={getImageUrl(item.record.imageUrl)}
                                                            alt="Record"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                {/* 显示文字 */}
                                                {item.record.note && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                        "{item.record.note}"
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Completed Node: View/Edit Record Button */}
                                        {item.status === 'completed' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRecordAction(item, 'view'); }}
                                                className="w-full mt-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {item.record ? 'edit' : 'add_photo_alternate'}
                                                </span>
                                                {item.record ? '编辑记录' : '添加记录'}
                                            </button>
                                        )}

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="h-20"></div>
            </div>

            {/* Check In / Record Modal */}
            {checkInModal.visible && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white">
                                {checkInModal.mode === 'view' ? '查看记录' : '瞬间记录'}
                            </h3>
                            <p className="text-center text-gray-500 text-xs mt-1">
                                {checkInModal.mode === 'view' ? '回顾你的探索足迹' : '记录此刻的心情与发现'}
                            </p>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* 照片区域 - 放在上面，更显眼 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                    📷 照片记录 <span className="text-xs text-gray-400">(最多9张)</span>
                                </label>
                                {checkInModal.mode === 'view' ? (
                                    checkInImages.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {checkInImages.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <CapacitorImage src={getImageUrl(img)} className="w-full h-full object-cover" alt={`record-${idx}`} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                            <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                                            <p className="text-sm text-gray-400 mt-2">未上传照片</p>
                                        </div>
                                    )
                                ) : (
                                    <ImageUploader
                                        maxCount={9}
                                        defaultImages={checkInImages}
                                        onUploadSuccess={(urls) => setCheckInImages(urls)}
                                    />
                                )}
                            </div>

                            {/* 文字记录 - 放在下面，减小高度 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                    ✍️ 文字记录
                                </label>
                                <textarea
                                    value={checkInComment}
                                    onChange={(e) => setCheckInComment(e.target.value)}
                                    readOnly={checkInModal.mode === 'view'}
                                    placeholder="写下此刻的心情与发现..."
                                    className="w-full h-20 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-gray-900 dark:text-white placeholder:text-gray-400"
                                ></textarea>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            <button
                                onClick={() => setCheckInModal(prev => ({ ...prev, visible: false }))}
                                className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                {checkInModal.mode === 'view' ? '关闭' : '取消'}
                            </button>
                            {checkInModal.mode === 'record' && (
                                <button
                                    onClick={saveRecord}
                                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold shadow-lg shadow-sky-200 dark:shadow-none hover:from-sky-600 hover:to-blue-600 transition-all active:scale-95"
                                >
                                    保存记录
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Proverb Screen */}
            {
                showProverb && (
                    <TaskProverbScreen
                        type={pendingCompletionType}
                        authorMessage={taskData.completionMessage}
                        authorImage={taskData.completionImageUrl}
                        onContinue={() => {
                            setShowProverb(false);
                            setCompletionModal({ visible: true, type: pendingCompletionType });
                        }}
                    />
                )
            }

            {/* Summary Modal */}
            {
                summaryModal.visible && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col border border-white/20 relative overflow-hidden">
                            {/* Decorative Background Bloom */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="text-center mb-6 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20 transform rotate-3">
                                    <span className="material-symbols-outlined text-2xl">rate_review</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">旅程已完成 🎉</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 px-4 leading-relaxed">
                                    恭喜你完成了这次探险！<br />写下此刻的感想，为这段旅程画上完美句号。
                                </p>
                            </div>

                            <div className="flex-1 space-y-4 mb-6 relative z-10">
                                <div className="group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">此刻感想</label>
                                    <textarea
                                        value={summaryNote}
                                        onChange={(e) => setSummaryNote(e.target.value)}
                                        placeholder="这一路上有什么有趣的发现？"
                                        className="w-full h-28 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 p-4 text-sm focus:ring-0 focus:bg-white dark:focus:bg-slate-800 transition-all resize-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400/70"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-auto relative z-10">
                                <button
                                    onClick={handleFinishTask}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    直接完成
                                </button>
                                <button
                                    onClick={handleFinishTask}
                                    className="flex-[1.5] py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-lg">save</span>
                                    保存总结
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Completion Modal */}
            {
                completionModal.visible && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { /* Blocking */ }} />

                        <div className={`w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500 fill-mode-both ${completionModal.type === 'success'
                            ? 'bg-slate-900 border border-yellow-500/30'
                            : 'bg-white dark:bg-slate-900'
                            }`}>

                            {/* Dynamic Background for Success */}
                            {completionModal.type === 'success' && (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0" />
                                    {/* Glow Effects */}
                                    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-yellow-500/20 to-transparent blur-2xl opacity-60 pointer-events-none" />
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />
                                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

                                    {/* Confetti / Particles (Simulated with simple dots) */}
                                    <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-400 rounded-full opacity-60 animate-bounce delay-100" />
                                    <div className="absolute top-20 right-20 w-3 h-3 bg-red-400 rounded-full opacity-60 animate-bounce delay-300" />
                                    <div className="absolute bottom-20 left-1/3 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-bounce delay-700" />

                                    {/* Ribbon Stripe Top */}
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                </>
                            )}

                            {/* Decorative Config for Complete (Original) */}
                            {completionModal.type === 'complete' && (
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                            )}

                            <div className="relative z-10">
                                <div className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center mb-6 shadow-xl transform transition-transform hover:scale-110 duration-500 ${completionModal.type === 'success'
                                    ? 'bg-gradient-to-br from-amber-300 to-yellow-600 shadow-yellow-500/30 ring-4 ring-yellow-500/20'
                                    : 'bg-green-100 text-green-600'
                                    }`}>
                                    <span className={`material-symbols-outlined text-6xl ${completionModal.type === 'success' ? 'text-white drop-shadow-md animate-bounce' : ''}`}>
                                        {completionModal.type === 'success' ? 'emoji_events' : 'check_circle'}
                                    </span>
                                </div>

                                <h2 className={`text-3xl font-black mb-3 tracking-tight ${completionModal.type === 'success'
                                    ? 'text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-100 to-amber-200 drop-shadow-sm'
                                    : 'text-gray-900 dark:text-white'
                                    }`}>
                                    {completionModal.type === 'success' ? '挑战成功！' : '任务完成'}
                                </h2>

                                <p className={`text-sm mb-10 leading-relaxed max-w-[260px] mx-auto ${completionModal.type === 'success' ? 'text-amber-100/70 font-medium' : 'text-gray-500'
                                    }`}>
                                    {completionModal.type === 'success' ?
                                        '你不仅完成了所有的探索节点，还成功通过了极速限时挑战！太棒了！' :
                                        '恭喜你完成了所有探索节点，这段旅程感觉如何？'
                                    }
                                </p>

                                {/* Co-op Records Entry (New) */}
                                {executionData?.coopContext?.participants && executionData.coopContext.participants.length > 1 && (
                                    <div className="mb-8 animate-in slide-in-from-bottom-2 fade-in">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">同行记录</p>
                                        <div className="flex items-center justify-center gap-2">
                                            {executionData.coopContext.participants
                                                .filter((p: any) => p._id !== currentUser?._id) // Filter out self usually, or keep self too? User said "teammates". Let's show all or just others. Let's show others.
                                                .map((p: any) => (
                                                    <div key={p._id} className="flex flex-col items-center gap-1 group cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedJournalUserId(p._id);
                                                            setShowJournalModal(true);
                                                        }}
                                                    >
                                                        <CapacitorImage
                                                            src={getImageUrl(p.avatarUrl)}
                                                            className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-md group-hover:scale-110 transition-transform object-cover bg-gray-200"
                                                        />
                                                        <span className="text-[10px] text-gray-500 dark:text-slate-400 max-w-[60px] truncate">{p.username}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <button
                                        onClick={() => handlePostTaskAction(taskData.status === 'private' ? 'publish' : 'share')}
                                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${completionModal.type === 'success'
                                            ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 shadow-amber-500/40 ring-1 ring-white/20'
                                            : 'bg-[#0ea5e9] hover:bg-sky-500 shadow-sky-500/30'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined">{taskData.status === 'private' ? 'public' : 'share'}</span>
                                        {taskData.status === 'private' ? '公开任务' : '分享成就'}
                                    </button>

                                    <button
                                        onClick={() => onBack()}
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${completionModal.type === 'success'
                                            ? 'text-slate-400 hover:text-white hover:bg-white/5'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        返回列表
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 奇遇触发弹窗 */}
            {
                showEncounterModal && triggeredEncounter && (
                    <SerendipityTriggerModal
                        encounter={triggeredEncounter}
                        onAccept={handleAcceptEncounter}
                        onDecline={handleDeclineEncounter}
                    />
                )
            }

            {/* QA Modal */}
            {
                showQAModal && pendingQANodeIndex !== null && taskData?.nodes?.[pendingQANodeIndex]?.qaModule && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-[#1a2c35] rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="size-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <span className="material-symbols-outlined text-2xl">quiz</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">问答挑战</h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {taskData.nodes[pendingQANodeIndex].qaModule.question || "请回答问题以完成打卡"}
                                </p>

                                {/* Attempts Indicator */}
                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-full">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">剩余机会</span>
                                    <span className={`text-xs font-bold ${(taskData.nodes[pendingQANodeIndex].qaModule.maxAttempts || 3) - ((executionData?.nodeRecords?.find((r: any) => r.nodeIndex === pendingQANodeIndex)?.qaResult?.attempts) || 0) <= 1
                                        ? 'text-red-500'
                                        : 'text-slate-700 dark:text-slate-200'
                                        }`}>
                                        {Math.max(0, (taskData.nodes[pendingQANodeIndex].qaModule.maxAttempts || 3) - ((executionData?.nodeRecords?.find((r: any) => r.nodeIndex === pendingQANodeIndex)?.qaResult?.attempts) || 0))}
                                    </span>
                                </div>

                                <div className="w-full">
                                    <input
                                        value={qaAnswer}
                                        onChange={e => { setQaAnswer(e.target.value); setQaError(''); }}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-purple-500 outline-none text-center font-bold text-slate-900 dark:text-white"
                                        placeholder="在此输入答案..."
                                        autoFocus
                                    />
                                    {qaError && <p className="text-red-500 text-xs mt-2 font-bold">{qaError}</p>}
                                </div>

                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={() => setShowQAModal(false)}
                                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        暂不打卡
                                    </button>
                                    <button
                                        onClick={submitQA}
                                        disabled={qaSubmitting}
                                        className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        {qaSubmitting ? '验证中...' : '提交答案'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">
                                    {taskData?.taskType === 'serendipity' ? '注意：奇遇任务回答错误次数有限！' : '提示：次数用尽将自动跳过（不视为成功挑战）'}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 三个点菜单弹窗 */}
            {showMoreMenu && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMoreMenu(false)}>
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6"></div>
                        <div className="space-y-2">
                            {/* 分享任务 */}
                            <button
                                onClick={handleShareTask}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">share</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 dark:text-white">分享任务</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">分享给好友一起探索</p>
                                </div>
                            </button>
                            {/* 举报任务 */}
                            <button
                                onClick={handleReportTask}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">flag</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 dark:text-white">举报任务</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">举报不当内容</p>
                                </div>
                            </button>
                        </div>
                        {/* 取消按钮 */}
                        <button
                            onClick={() => setShowMoreMenu(false)}
                            className="w-full mt-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}


            {/* Friend Selection Modal */}
            <FriendSelectionModal
                visible={showFriendModal}
                onClose={() => setShowFriendModal(false)}
                onSelect={handleInviteFriend}
                currentParticipants={executionData?.coopContext?.participants || []}
                onParticipantClick={(pid) => {
                    // Close selection modal first? Or keep it open?
                    // User might want to explore journals. Let's keep modal open behavior?
                    // Actually, stacking modals might be messy. Let's close selection modal.
                    setShowFriendModal(false);
                    setSelectedJournalUserId(pid);
                    setShowJournalModal(true);
                }}
            />

            {/* Participant Journal Modal */}
            <ParticipantJournalModal
                visible={showJournalModal}
                onClose={() => setShowJournalModal(false)}
                targetUserId={selectedJournalUserId}
                executionId={executionData?._id || ''}
                taskNodes={taskData?.nodes}
                isCoop={!!executionData?.coopContext}
            />
        </div >
    );
};

export default TaskDetailScreen;
