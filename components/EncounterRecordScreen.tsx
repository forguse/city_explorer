import React, { useState, useEffect } from 'react';
import { encounter as encounterApi } from '../services/api';
import SerendipityPostcard from './SerendipityPostcard';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface EncounterRecordScreenProps {
    encounterId: string;
    onBack: () => void;
    onDelete?: () => void;
    onShare?: () => void;
}

/**
 * 奇遇详情记录页
 * 显示已完成/进行中奇遇的详细信息、节点记录和明信片
 */
const EncounterRecordScreen: React.FC<EncounterRecordScreenProps> = ({
    encounterId,
    onBack,
    onDelete,
    onShare
}) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [showPostcard, setShowPostcard] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const res = await encounterApi.getDetail(encounterId);
                setData(res.data);
            } catch (err) {
                console.error('Failed to load encounter detail:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [encounterId]);

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await encounterApi.delete(encounterId);
            onDelete?.();
            onBack();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('删除失败，请重试');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return { text: '已完成', color: 'bg-green-500/20 text-green-400' };
            case 'active': return { text: '进行中', color: 'bg-blue-500/20 text-blue-400' };
            case 'abandoned': return { text: '已放弃', color: 'bg-gray-500/20 text-gray-400' };
            case 'expired': return { text: '已过期', color: 'bg-red-500/20 text-red-400' };
            default: return { text: '未知', color: 'bg-gray-500/20 text-gray-400' };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-orange-700 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-orange-700 flex flex-col items-center justify-center p-6 text-white text-center">
                <span className="text-6xl mb-4">🎲</span>
                <h2 className="text-xl font-bold mb-2">奇遇未找到</h2>
                <button onClick={onBack} className="mt-4 px-6 py-2 rounded-full bg-white/20">返回</button>
            </div>
        );
    }

    const { encounter, task, execution } = data;
    const statusInfo = getStatusLabel(encounter.status);

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-orange-700 overflow-hidden">
            {/* 星光背景 */}
            <div className="absolute inset-0 pointer-events-none opacity-40" style={{
                backgroundImage: `
                    radial-gradient(2px 2px at 20px 30px, white, transparent),
                    radial-gradient(3px 3px at 40px 70px, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 90px 40px, white, transparent)
                `,
                backgroundSize: '200px 100px'
            }} />

            {/* 光晕效果 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-40 left-0 w-80 h-80 bg-purple-400/20 rounded-full blur-[100px]" />

            {/* Header */}
            <div className="relative z-10 flex items-center px-4 py-4 justify-between">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">arrow_back_ios_new</span>
                </button>
                <h1 className="text-white font-bold text-lg">🎲 奇遇记录</h1>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                >
                    <span className="material-symbols-outlined text-white">delete</span>
                </button>
            </div>

            {/* 封面图 */}
            {task.coverImageUrl && (
                <div className="relative z-10 mx-6 mb-4 rounded-2xl overflow-hidden aspect-video">
                    <CapacitorImage src={getImageUrl(task.coverImageUrl)} alt={task.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
            )}

            {/* 主内容 */}
            <div className="relative z-10 px-6 pb-8 space-y-6">
                {/* 标题和状态 */}
                <div className="text-center">
                    <h2 className="text-white text-2xl font-bold mb-2">{task.title}</h2>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                        {statusInfo.text}
                    </span>
                </div>

                {/* 任务简介 */}
                {task.description && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <h3 className="text-white/80 text-sm font-bold mb-2">奇遇简介</h3>
                        <p className="text-white/90 text-sm leading-relaxed">{task.description}</p>
                    </div>
                )}

                {/* 时间信息 */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">接收时间</span>
                        <span className="text-white text-sm font-medium">{formatDate(encounter.triggeredAt)}</span>
                    </div>
                    {encounter.completedAt && (
                        <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm">完成时间</span>
                            <span className="text-white text-sm font-medium">{formatDate(encounter.completedAt)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">目标城市</span>
                        <span className="text-white text-sm font-medium">{task.targetCities?.join(' / ') || '全国'}</span>
                    </div>
                </div>

                {/* 节点记录 */}
                {execution?.nodeRecords && execution.nodeRecords.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-white/80 text-sm font-bold">探索记录</h3>
                        {execution.nodeRecords.map((record: any, idx: number) => (
                            <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                {record.note && (
                                    <p className="text-white/90 text-sm mb-3">{record.note}</p>
                                )}
                                {!record.note && !record.imageUrl && (
                                    <p className="text-white/50 text-sm">无记录内容</p>
                                )}
                                {record.imageUrl && (
                                    <div
                                        onClick={() => setPreviewImage(getImageUrl(record.imageUrl))}
                                        className="w-full aspect-video rounded-lg relative overflow-hidden"
                                    >
                                        <CapacitorImage
                                            src={getImageUrl(record.imageUrl)}
                                            alt="瞬间记录"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* 明信片按钮（仅已完成） */}
                {encounter.status === 'completed' && (
                    <div className="space-y-3">
                        <button
                            onClick={() => setShowPostcard(true)}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">mail</span>
                            查看奇遇明信片
                        </button>

                        {onShare && (
                            <button
                                onClick={onShare}
                                className="w-full py-4 rounded-xl bg-white/10 text-white font-bold border border-white/20 flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                            >
                                <span className="material-symbols-outlined">share</span>
                                分享到社区
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 明信片 */}
            {showPostcard && task && (
                <SerendipityPostcard
                    title={task.title}
                    successMessage={task.serendipityConfig?.successMessage || '恭喜完成奇遇！'}
                    nodeDescription={task.nodes?.[0]?.description}
                    authorName={task.author?.displayName}
                    coverImageUrl={task.coverImageUrl}
                    completionImageUrl={task.serendipityConfig?.successImageUrl}
                    city={task.targetCities?.join(' / ')}
                    completedAt={encounter.completedAt}
                    onClose={() => setShowPostcard(false)}
                    onShare={onShare}
                />
            )}

            {/* 删除确认 */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-500 text-2xl">delete_forever</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">确认删除</h3>
                        <p className="text-gray-500 text-sm mb-6">删除后将无法恢复此奇遇记录</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-50"
                            >
                                {deleting ? '删除中...' : '确认删除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 图片预览 */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <CapacitorImage
                        src={previewImage}
                        alt="预览"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default EncounterRecordScreen;
