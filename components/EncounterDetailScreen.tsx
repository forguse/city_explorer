import React, { useState, useEffect } from 'react';
import { encounter as encounterApi, execution as executionApi } from '../services/api';
import SerendipityPostcard from './SerendipityPostcard';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface EncounterDetailScreenProps {
    onBack: () => void;
    encounterId: string;
    onShare?: () => void;
}

/**
 * 奇遇历史详情页
 * 展示已完成奇遇的详细信息和明信片
 */
const EncounterDetailScreen: React.FC<EncounterDetailScreenProps> = ({
    onBack,
    encounterId,
    onShare
}) => {
    const [loading, setLoading] = useState(true);
    const [encounter, setEncounter] = useState<any>(null);
    const [executionData, setExecutionData] = useState<any>(null);
    const [showPostcard, setShowPostcard] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await encounterApi.getHistory();
                const found = res.data?.find((e: any) => e._id === encounterId);
                if (found) {
                    setEncounter(found);
                    // 获取执行记录（包含瞬间记录）
                    if (found.serendipityTask?._id) {
                        try {
                            const execRes = await executionApi.getOrCreate(found.serendipityTask._id);
                            setExecutionData(execRes.data);
                        } catch (err) {
                            console.error('Failed to load execution data:', err);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load encounter:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [encounterId]);

    // 格式化日期
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full" />
            </div>
        );
    }

    if (!encounter) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
                <span className="text-6xl mb-4">🔍</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">奇遇未找到</h2>
                <button onClick={onBack} className="mt-4 px-6 py-2 rounded-full bg-purple-500 text-white font-bold">
                    返回
                </button>
            </div>
        );
    }

    const task = encounter.serendipityTask;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <button onClick={onBack} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back_ios_new</span>
                </button>
                <h1 className="flex-1 text-center text-slate-900 dark:text-white font-bold text-lg">奇遇详情</h1>
                <div className="w-10" />
            </div>

            <div className="p-6 space-y-6">
                {/* 封面图 */}
                {task?.coverImageUrl && (
                    <div className="aspect-video rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800">
                        <CapacitorImage src={getImageUrl(task.coverImageUrl)} alt="" className="w-full h-full object-cover" />
                    </div>
                )}

                {/* 基本信息卡片 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    {/* 标签 */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🎲</span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${encounter.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                            : encounter.status === 'failed'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
                            }`}>
                            {encounter.status === 'completed' ? '已完成' :
                                encounter.status === 'failed' ? '挑战失败' :
                                    encounter.status === 'expired' ? '已过期' : '进行中'}
                        </span>
                    </div>

                    {/* 标题 */}
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {task?.title || '神秘奇遇'}
                    </h2>

                    {/* 描述 */}
                    {task?.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                            {task.description}
                        </p>
                    )}

                    {/* 信息列表 */}
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 text-sm">
                            <span className="material-symbols-outlined text-purple-500">location_on</span>
                            <span className="text-slate-600 dark:text-slate-400">目标城市</span>
                            <span className="ml-auto font-bold text-slate-900 dark:text-white">
                                {task?.targetCities?.join(' / ') || '未知'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="material-symbols-outlined text-orange-500">bolt</span>
                            <span className="text-slate-600 dark:text-slate-400">触发时间</span>
                            <span className="ml-auto font-bold text-slate-900 dark:text-white">
                                {formatDate(encounter.triggeredAt)}
                            </span>
                        </div>
                        {encounter.completedAt && (
                            <div className="flex items-center gap-3 text-sm">
                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                                <span className="text-slate-600 dark:text-slate-400">完成时间</span>
                                <span className="ml-auto font-bold text-slate-900 dark:text-white">
                                    {formatDate(encounter.completedAt)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 查看明信片按钮 */}
                {encounter.status === 'completed' && task?.serendipityConfig?.successMessage && (
                    <button
                        onClick={() => setShowPostcard(true)}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-orange-500 text-white font-bold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">mail</span>
                        查看奇遇明信片
                    </button>
                )}

                {/* 瞬间记录 */}
                {executionData?.nodeRecords && executionData.nodeRecords.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-500">photo_camera</span>
                            我的瞬间记录
                        </h3>
                        <div className="space-y-4">
                            {executionData.nodeRecords.map((record: any, index: number) => (
                                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                                    {record.note && (
                                        <p className="text-slate-700 dark:text-slate-300 text-sm mb-3">{record.note}</p>
                                    )}
                                    {record.imageUrl && (
                                        <div className="rounded-lg overflow-hidden">
                                            <CapacitorImage
                                                src={getImageUrl(record.imageUrl)}
                                                alt="瞬间记录"
                                                className="w-full h-48 object-cover"
                                            />
                                        </div>
                                    )}
                                    {record.createdAt && (
                                        <p className="text-xs text-slate-400 mt-2">{formatDate(record.createdAt)}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 分享按钮 */}
                {onShare && encounter.status === 'completed' && (
                    <button
                        onClick={onShare}
                        className="w-full py-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                    >
                        <span className="material-symbols-outlined">share</span>
                        分享到社区
                    </button>
                )}
            </div>

            {/* 明信片弹窗 */}
            {showPostcard && task && (
                <SerendipityPostcard
                    title={task.title}
                    successMessage={task.serendipityConfig?.successMessage || '恭喜完成奇遇！'}
                    nodeDescription={task.nodes?.[0]?.description || task.description}
                    authorName={task.author?.displayName}
                    coverImageUrl={getImageUrl(task.coverImageUrl)}
                    completionImageUrl={task.serendipityConfig?.successImageUrl ? getImageUrl(task.serendipityConfig.successImageUrl) : undefined}
                    city={task.targetCities?.join(' / ')}
                    completedAt={encounter.completedAt}
                    onClose={() => setShowPostcard(false)}
                    onShare={onShare}
                />
            )}
        </div>
    );
};

export default EncounterDetailScreen;
