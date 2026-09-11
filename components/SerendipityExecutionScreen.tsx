import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { execution as executionApi, encounter as encounterApi, task as taskApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';
import SerendipityPostcard from './SerendipityPostcard';
import ImageUploader from '../src/components/common/ImageUploader';

interface SerendipityExecutionScreenProps {
    onBack: () => void;
    encounterId: string;
    onComplete?: () => void;
    onShare?: () => void;
}

/**
 * 奇遇执行详情页
 * 设计规范：
 * - 无备战清单
 * - 无模式切换
 * - 绚丽视觉效果（紫/橙渐变、星光）
 * - 完成后显示明信片
 */
const SerendipityExecutionScreen: React.FC<SerendipityExecutionScreenProps> = ({
    onBack,
    encounterId,
    onComplete,
    onShare
}) => {
    const [loading, setLoading] = useState(true);
    const [encounterData, setEncounterData] = useState<any>(null);
    const [taskData, setTaskData] = useState<any>(null);
    const [executionData, setExecutionData] = useState<any>(null);

    // QA 状态
    const [showQAModal, setShowQAModal] = useState(false);
    const [qaAnswer, setQaAnswer] = useState('');
    const [qaError, setQaError] = useState('');
    const [qaSubmitting, setQaSubmitting] = useState(false);
    const [pendingNodeIndex, setPendingNodeIndex] = useState<number | null>(null);

    // 完成状态
    const [showPostcard, setShowPostcard] = useState(false);
    const [hasTriggeredCompletion, setHasTriggeredCompletion] = useState(false);

    // 记录瞬间状态
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [recordNodeIndex, setRecordNodeIndex] = useState<number | null>(null);
    const [recordNote, setRecordNote] = useState('');
    const [recordImage, setRecordImage] = useState<string | null>(null);
    const [recordMode, setRecordMode] = useState<'record' | 'view'>('record');

    // 倒计时状态
    const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
    const [isTimeExpired, setIsTimeExpired] = useState(false);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 加载数据
    useEffect(() => {
        const fetchData = async () => {
            if (!encounterId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // 使用 getDetail 获取特定奇遇的详情
                const res = await encounterApi.getDetail(encounterId);

                // 检查是否已过期（后端会返回 expired: true）
                if (res.data?.expired) {
                    alert(res.data.message || '奇遇已失效');
                    onBack();
                    return;
                }

                if (res.data?.encounter && res.data?.task) {
                    setEncounterData(res.data.encounter);
                    setTaskData(res.data.task);
                    console.log('[SerendipityExecution] Task data loaded:', {
                        title: res.data.task.title,
                        coverImageUrl: res.data.task.coverImageUrl,
                        hasCover: !!res.data.task.coverImageUrl
                    });

                    // 无论奇遇状态如何，都创建新的执行记录（支持反复做）
                    const execRes = await executionApi.getOrCreate(res.data.task._id);
                    setExecutionData(execRes.data);
                }
            } catch (err) {
                console.error('Failed to load encounter:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [encounterId, onBack]);

    // 计算节点状态
    const timelineItems = useMemo(() => {
        if (!taskData?.nodes) return [];

        const completedNodes = executionData?.completedNodes || [];
        const activeIndex = taskData.nodes.findIndex((_: any, i: number) => !completedNodes.includes(i));

        return taskData.nodes.map((node: any, index: number) => ({
            id: index,
            // 奇遇只有一个节点，所以只显示"节点"
            title: node.name || node.locationName || '节点',
            description: node.description,
            status: completedNodes.includes(index) ? 'completed' : index === activeIndex ? 'active' : 'pending',
            hasQA: node.qaModule?.enabled,
            referenceImageUrl: node.referenceImageUrl,
            timeLimit: node.timeLimit,
            location: node.location,
            isLocationSpecific: node.isLocationSpecific
        }));
    }, [taskData, executionData]);

    // 检查是否全部完成（基于当前执行记录，而非奇遇状态）
    useEffect(() => {
        if (!taskData || !executionData) return;
        if (hasTriggeredCompletion) return;

        const totalNodes = taskData.nodes?.length || 0;
        const completedCount = executionData.completedNodes?.length || 0;

        if (completedCount === totalNodes && totalNodes > 0 && !showPostcard) {
            // 完成奇遇
            setHasTriggeredCompletion(true);
            handleCompleteEncounter();
        }
    }, [executionData, taskData, showPostcard, hasTriggeredCompletion]);

    // 倒计时逻辑
    useEffect(() => {
        if (!taskData?.nodes || !executionData?.startTime) return;

        // 获取当前活动节点的时间限制
        const completedNodes = executionData?.completedNodes || [];
        const activeIndex = taskData.nodes.findIndex((_: any, i: number) => !completedNodes.includes(i));
        const activeNode = taskData.nodes[activeIndex];
        const timeLimit = activeNode?.timeLimit;

        if (!timeLimit || timeLimit.type !== 'countdown') {
            setCountdownRemaining(null);
            return;
        }

        // 计算剩余时间（从执行开始时间算起）
        const startTime = new Date(executionData.startTime).getTime();
        const totalMs = timeLimit.countdownMinutes * 60 * 1000;
        const endTime = startTime + totalMs;

        const updateCountdown = async () => {
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            setCountdownRemaining(remaining);

            if (remaining <= 0) {
                setIsTimeExpired(true);
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                }
                // 倒计时结束，删除奇遇记录并返回
                try {
                    await encounterApi.delete(encounterId);
                } catch (err) {
                    console.error('Failed to delete expired encounter:', err);
                }
                alert('奇遇倒计时已结束，任务失效');
                onBack();
            }
        };

        // 立即更新一次
        updateCountdown();

        // 每秒更新
        countdownIntervalRef.current = setInterval(updateCountdown, 1000);

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [taskData, executionData, encounterId, onBack]);

    // 格式化倒计时显示
    const formatCountdown = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // 获取当前节点的时间限制信息
    const getCurrentTimeLimit = () => {
        if (!taskData?.nodes || !executionData) return null;

        const completedNodes = executionData?.completedNodes || [];
        const activeIndex = taskData.nodes.findIndex((_: any, i: number) => !completedNodes.includes(i));
        const activeNode = taskData.nodes[activeIndex];
        return activeNode?.timeLimit;
    };

    // 完成奇遇
    const handleCompleteEncounter = async () => {
        try {
            await encounterApi.validate(encounterId);
            setShowPostcard(true);
        } catch (err) {
            console.error('Complete encounter failed:', err);
        }
    };

    // 完成节点
    const handleCompleteNode = async (nodeIndex: number) => {
        if (!executionData?._id || !taskData?._id) {
            alert('数据加载中，请稍后再试');
            return;
        }

        const node = taskData?.nodes?.[nodeIndex];

        // QA 检查
        if (node?.qaModule?.enabled) {
            setPendingNodeIndex(nodeIndex);
            setQaAnswer('');
            setQaError('');
            setShowQAModal(true);
            return;
        }

        try {
            await executionApi.checkNode(executionData._id, String(nodeIndex), 'manual');
            const res = await executionApi.getOrCreate(taskData._id);
            setExecutionData(res.data);
        } catch (err) {
            console.error('Check node failed:', err);
            alert('打卡失败，请重试');
        }
    };

    // 提交问答
    const submitQA = async () => {
        if (!qaAnswer.trim()) {
            setQaError('请输入答案');
            return;
        }
        if (pendingNodeIndex === null || !executionData?._id || !taskData?._id) return;

        setQaSubmitting(true);
        try {
            const res = await executionApi.validateNodeQA(executionData._id, pendingNodeIndex, qaAnswer);
            if (res.data.correct) {
                setShowQAModal(false);
                await executionApi.checkNode(executionData._id, String(pendingNodeIndex), 'qa_pass');
                const execRes = await executionApi.getOrCreate(taskData._id);
                setExecutionData(execRes.data);
                alert('回答正确！');
            } else {
                const maxAttempts = taskData.nodes?.[pendingNodeIndex]?.qaModule?.maxAttempts || 3;
                setQaError(`回答错误，已尝试 ${res.data.attempts} 次`);
                if (res.data.attempts >= maxAttempts) {
                    alert('挑战失败！奇遇任务已失效。');
                    onBack();
                }
            }
        } catch (err) {
            console.error('QA error:', err);
            setQaError('验证失败');
        } finally {
            setQaSubmitting(false);
        }
    };

    // 打开记录模态框
    const openRecordModal = (nodeIndex: number, mode: 'record' | 'view') => {
        setRecordNodeIndex(nodeIndex);
        setRecordMode(mode);
        // 加载已有记录
        const existingRecord = executionData?.nodeRecords?.find((r: any) => r.nodeIndex === nodeIndex);
        if (existingRecord) {
            setRecordNote(existingRecord.note || '');
            setRecordImage(existingRecord.imageUrl || null);
        } else {
            setRecordNote('');
            setRecordImage(null);
        }
        setShowRecordModal(true);
    };

    // 保存记录
    const saveRecord = async () => {
        if (recordNodeIndex === null || !executionData?._id || !taskData?._id) return;
        try {
            await executionApi.saveNodeRecord(executionData._id, recordNodeIndex, {
                note: recordNote,
                imageUrl: recordImage || undefined
            });
            // 刷新 execution 数据
            const res = await executionApi.getOrCreate(taskData._id);
            setExecutionData(res.data);
            setShowRecordModal(false);
        } catch (err) {
            console.error('Save record failed:', err);
            alert('保存失败，请重试');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-orange-700 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full" />
            </div>
        );
    }

    if (!taskData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-orange-700 flex flex-col items-center justify-center p-6 text-white text-center">
                <span className="text-6xl mb-4">🎲</span>
                <h2 className="text-xl font-bold mb-2">奇遇未找到</h2>
                <button onClick={onBack} className="mt-4 px-6 py-2 rounded-full bg-white/20">返回</button>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* 封面图片背景（高斯模糊） */}
            {taskData.coverImageUrl ? (
                <>
                    {/* 模糊背景图层 */}
                    <div
                        className="absolute inset-0 transition-transform hover:scale-105 duration-500"
                        style={{
                            filter: 'blur(30px)',
                            transform: 'scale(1.2)'
                        }}
                    >
                        <CapacitorImage
                            src={getImageUrl(taskData.coverImageUrl)}
                            className="w-full h-full object-cover"
                            alt="Cover Blur"
                        />
                    </div>
                    {/* 半透明渐变叠加层 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-purple-800/50 to-orange-700/60" />
                </>
            ) : (
                /* 无封面图时使用纯渐变背景 */
                <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-800 to-orange-700" />
            )}

            {/* 星光背景 */}
            <div className="absolute inset-0 pointer-events-none opacity-30" style={{
                backgroundImage: `
radial-gradient(2px 2px at 20px 30px, white, transparent),
    radial-gradient(3px 3px at 40px 70px, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 90px 40px, white, transparent),
    radial-gradient(2px 2px at 130px 80px, rgba(255, 255, 255, 0.6), transparent)
        `,
                backgroundSize: '200px 100px'
            }} />

            {/* 光晕效果 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-40 left-0 w-80 h-80 bg-purple-400/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Header */}
            <div className="relative z-10 flex items-center px-4 py-4">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">arrow_back_ios_new</span>
                </button>
                <h1 className="flex-1 text-center text-white font-bold text-lg">🎲 奇遇进行中</h1>
                <div className="w-10" />
            </div>

            {/* 时间限制显示模块 */}
            {(() => {
                const timeLimit = getCurrentTimeLimit();
                if (!timeLimit) return null;

                return (
                    <div className="relative z-10 mx-6 mb-4">
                        <div className={`rounded-2xl p-4 border ${isTimeExpired
                            ? 'bg-red-500/20 border-red-500/50'
                            : 'bg-amber-500/20 border-amber-500/50'
                            }`}>
                            <div className="flex items-center justify-center gap-3">
                                <span className={`material-symbols-outlined text-2xl ${isTimeExpired ? 'text-red-400' : 'text-amber-400'}`}>
                                    {timeLimit.type === 'countdown' ? 'timer' : 'schedule'}
                                </span>
                                <div className="text-center">
                                    {timeLimit.type === 'countdown' && countdownRemaining !== null && (
                                        <>
                                            <div className={`text-3xl font-bold font-mono ${isTimeExpired ? 'text-red-400' : 'text-amber-300'}`}>
                                                {isTimeExpired ? '已超时' : formatCountdown(countdownRemaining)}
                                            </div>
                                            <div className="text-white/60 text-xs mt-1">
                                                {isTimeExpired ? '挑战失败' : `限时 ${timeLimit.countdownMinutes} 分钟`}
                                            </div>
                                        </>
                                    )}
                                    {timeLimit.type === 'timeRange' && (
                                        <>
                                            <div className="text-2xl font-bold text-amber-300">
                                                {timeLimit.timeRangeStart} - {timeLimit.timeRangeEnd}
                                            </div>
                                            <div className="text-white/60 text-xs mt-1">
                                                仅在此时间段内可完成
                                            </div>
                                        </>
                                    )}
                                    {timeLimit.type === 'deadline' && (
                                        <>
                                            <div className="text-2xl font-bold text-amber-300">
                                                {timeLimit.deadlineType === 'before' ? '在' : ''}{timeLimit.deadlineTime}{timeLimit.deadlineType === 'before' ? '前' : '后'}
                                            </div>
                                            <div className="text-white/60 text-xs mt-1">
                                                {timeLimit.deadlineType === 'before' ? '需在此时间前完成' : '需在此时间后完成'}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 任务信息 */}
            <div className="relative z-10 px-6 py-4 text-center">
                <h2 className="text-white text-2xl font-bold mb-2">{taskData.title}</h2>
                <p className="text-white/70 text-sm flex items-center justify-center gap-1 mb-3">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {taskData.targetCities?.join(' / ') || '未知地点'}
                </p>
                {/* 显示第一个节点内容作为任务简介 */}
                {taskData.nodes?.[0]?.description && (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 inline-block max-w-[90%]">
                        <p className="text-white/90 text-sm">{taskData.nodes[0].description}</p>
                    </div>
                )}
            </div>

            {/* 进度指示 */}
            <div className="relative z-10 flex justify-center gap-2 px-6 py-4">
                {timelineItems.map((item: any) => (
                    <div
                        key={item.id}
                        className={`w - 8 h - 8 rounded - full flex items - center justify - center text - sm font - bold transition - all ${item.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : item.status === 'active'
                                ? 'bg-white text-purple-900 ring-4 ring-white/30'
                                : 'bg-white/20 text-white/50'
                            } `}
                    >
                        {item.status === 'completed' ? '✓' : item.id + 1}
                    </div>
                ))}
            </div>

            {/* 当前节点 */}
            <div className="relative z-10 px-6 pb-32">
                {timelineItems.filter((item: any) => item.status === 'active').map((item: any) => (
                    <div
                        key={item.id}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white">explore</span>
                            </div>
                            <div>
                                <h3 className="text-white font-bold">{item.title}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {item.hasQA && (
                                        <span className="text-xs text-orange-300 flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-xs">quiz</span>
                                            含问答挑战
                                        </span>
                                    )}
                                    {item.timeLimit && (
                                        <span className="text-xs text-amber-300 flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-xs">timer</span>
                                            {item.timeLimit.type === 'countdown' && `限时 ${item.timeLimit.countdownMinutes} 分钟`}
                                            {item.timeLimit.type === 'timeRange' && `${item.timeLimit.timeRangeStart}-${item.timeLimit.timeRangeEnd}`}
                                            {item.timeLimit.type === 'deadline' && `${item.timeLimit.deadlineType === 'before' ? '在' : ''}${item.timeLimit.deadlineTime}${item.timeLimit.deadlineType === 'before' ? '前' : '后'}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {item.description && (
                            <p className="text-white/80 text-sm mb-4">{item.description}</p>
                        )}

                        {/* 地点信息 */}
                        {item.isLocationSpecific && item.location?.name && (
                            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10">
                                <span className="material-symbols-outlined text-amber-400 text-lg">location_on</span>
                                <span className="text-white/90 text-sm">{item.location.name}</span>
                            </div>
                        )}

                        {/* 节点参考图 */}
                        {item.referenceImageUrl && (
                            <div className="mb-4 rounded-xl overflow-hidden">
                                <CapacitorImage
                                    src={getImageUrl(item.referenceImageUrl)}
                                    alt="参考图"
                                    className="w-full h-40 object-cover"
                                />
                            </div>
                        )}

                        {/* 按钮区域：记录瞬间 + 完成节点 */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => openRecordModal(item.id, 'record')}
                                className="w-14 h-14 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                                title="记录瞬间"
                            >
                                <span className="material-symbols-outlined text-[20px]">edit_note</span>
                            </button>
                            <button
                                onClick={() => handleCompleteNode(item.id)}
                                className="flex-1 h-14 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                完成节点
                            </button>
                        </div>
                    </div>
                ))}

                {/* 已完成节点列表 */}
                {timelineItems.filter((item: any) => item.status === 'completed').length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h4 className="text-white/60 text-xs font-bold uppercase tracking-wider">已完成节点</h4>
                        {timelineItems.filter((item: any) => item.status === 'completed').map((item: any) => (
                            <div
                                key={item.id}
                                className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">✓</div>
                                    <span className="text-white/80 text-sm font-medium">{item.title}</span>
                                </div>
                                <button
                                    onClick={() => openRecordModal(item.id, 'view')}
                                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/20 transition-colors flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                                    查看记录
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            {/* QA Modal */}
            {showQAModal && pendingNodeIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-600 text-2xl">quiz</span>
                            </div>
                            <h3 className="text-xl font-bold">问答挑战</h3>
                            <p className="text-slate-600 text-sm">
                                {taskData.nodes[pendingNodeIndex]?.qaModule?.question || '请回答问题'}
                            </p>

                            <input
                                value={qaAnswer}
                                onChange={e => { setQaAnswer(e.target.value); setQaError(''); }}
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-center font-bold"
                                placeholder="输入答案..."
                                autoFocus
                            />
                            {qaError && <p className="text-red-500 text-xs">{qaError}</p>}

                            <div className="flex gap-3 w-full">
                                <button onClick={() => setShowQAModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 font-bold">
                                    取消
                                </button>
                                <button
                                    onClick={submitQA}
                                    disabled={qaSubmitting}
                                    className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold disabled:opacity-50"
                                >
                                    {qaSubmitting ? '验证中...' : '提交'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 记录瞬间模态框 */}
            {showRecordModal && recordNodeIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-center mb-1 text-gray-900 dark:text-white">
                            {recordMode === 'view' ? '查看记录' : '记录瞬间'}
                        </h3>
                        <p className="text-center text-gray-500 text-sm mb-6">
                            {recordMode === 'view' ? '回顾你的探索足迹' : '记录此刻的心情与发现'}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">文字记录</label>
                                <textarea
                                    value={recordNote}
                                    onChange={(e) => setRecordNote(e.target.value)}
                                    readOnly={recordMode === 'view'}
                                    placeholder="写点什么..."
                                    className="w-full h-24 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">照片</label>
                                <div className="flex gap-2">
                                    {recordImage ? (
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden group">
                                            <div className="w-full h-full relative">
                                                <CapacitorImage
                                                    src={getImageUrl(recordImage)}
                                                    alt="Record"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            {recordMode === 'record' && (
                                                <button
                                                    onClick={() => setRecordImage(null)}
                                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <span className="material-symbols-outlined text-white text-xl">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : recordMode === 'record' ? (
                                        <ImageUploader
                                            onUploadSuccess={(urls) => urls.length > 0 && setRecordImage(urls[urls.length - 1])}
                                            className="w-20 h-20"
                                        >
                                            <div className="w-20 h-20 rounded-xl bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                                <span className="material-symbols-outlined">add_a_photo</span>
                                            </div>
                                        </ImageUploader>
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400">
                                            <span className="material-symbols-outlined">no_photography</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowRecordModal(false)}
                                className="flex-1 h-12 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold"
                            >
                                {recordMode === 'view' ? '关闭' : '取消'}
                            </button>
                            {recordMode === 'record' && (
                                <button
                                    onClick={saveRecord}
                                    className="flex-1 h-12 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold shadow-lg shadow-purple-500/30"
                                >
                                    保存记录
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 明信片 */}
            {showPostcard && taskData && (
                <SerendipityPostcard
                    title={taskData.title}
                    successMessage={taskData.serendipityConfig?.successMessage || '恭喜完成奇遇！'}
                    nodeDescription={taskData.nodes?.[0]?.description}
                    authorName={taskData.author?.displayName}
                    coverImageUrl={taskData.coverImageUrl}
                    completionImageUrl={taskData.serendipityConfig?.successImageUrl}
                    city={taskData.targetCities?.join(' / ')}
                    completedAt={new Date().toISOString()}
                    onClose={() => { setShowPostcard(false); onComplete?.(); onBack(); }}
                    onShare={onShare}
                />
            )}
        </div>
    );
};

export default SerendipityExecutionScreen;
