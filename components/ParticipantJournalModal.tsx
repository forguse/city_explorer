import React, { useState, useEffect } from 'react';
import { execution as executionApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ParticipantJournalModalProps {
    visible: boolean;
    onClose: () => void;
    executionId: string; // Changed from taskId to executionId
    targetUserId: string;
    taskNodes?: any[]; // Pass task nodes to render timeline structure
    isCoop?: boolean;
}

const ParticipantJournalModal: React.FC<ParticipantJournalModalProps> = ({ visible, onClose, executionId, targetUserId, taskNodes, isCoop = false }) => {
    const [journal, setJournal] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        console.log('ParticipantJournalModal useEffect:', { visible, executionId, targetUserId });
        if (visible && executionId && targetUserId) {
            fetchJournal();
        } else {
            console.log('Skipping fetchJournal due to missing props');
            setJournal(null);
            setError('');
        }
    }, [visible, executionId, targetUserId]);

    const fetchJournal = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await executionApi.getJournal(executionId, targetUserId);
            setJournal(res.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || '无法获取手帐数据');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in transition-all" onClick={onClose}>
            <div
                className="bg-[#fdfbf7] dark:bg-slate-900 w-full max-w-lg h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Pattern */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-orange-50/80 to-transparent dark:from-slate-800/50 pointer-events-none z-0"></div>

                {/* Navbar */}
                <div className="relative z-10 flex items-center justify-between px-6 py-4">
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 transition-colors">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">close</span>
                    </button>
                    <h2 className="text-lg font-bold font-serif text-slate-800 dark:text-slate-100 tracking-wide">旅行手帐</h2>
                    <div className="w-10"></div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-400 font-serif">读取记忆中...</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">sentiment_dissatisfied</span>
                        <p className="text-gray-500">{error}</p>
                    </div>
                ) : journal && (
                    <div className="flex-1 overflow-y-auto w-full px-0 pb-10">
                        {/* Profile Card */}
                        <div className="flex flex-col items-center mb-8 px-6 relative z-10">
                            <div className="relative mb-3">
                                <CapacitorImage
                                    src={getImageUrl(journal.user.avatarUrl)}
                                    className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-lg object-cover bg-gray-200"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-orange-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white dark:border-slate-800 shadow-sm">
                                    LV.{journal.user.level}
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{journal.user.username}</h3>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    已记录 {journal.nodeRecords?.length || 0} 个瞬间
                                </span>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="px-6 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[44px] top-4 bottom-10 w-0.5 bg-gray-200 dark:bg-slate-700 border-l border-dashed"></div>

                            {taskNodes?.map((node, index) => {
                                const record = journal.nodeRecords?.find((r: any) => r.nodeIndex === index);
                                const isHostPassed = (journal.hostCompletedNodesCount || 0) > index;
                                const isSelfPassed = (journal.completedNodesCount || 0) > index;
                                const isPassed = isHostPassed || isSelfPassed; // Logic: if host passed, we consider passed (for "Following" status)

                                return (
                                    <div key={index} className="relative flex gap-5 mb-10 group">
                                        {/* Node Number/Icon */}
                                        <div className={`relative z-10 shrink-0 w-9 h-9 flex items-center justify-center rounded-full border-2 transition-colors duration-300
                                            ${record ? 'bg-orange-500 border-orange-500 text-white shadow-orange-200 shadow-lg' :
                                                isPassed ? 'bg-white dark:bg-slate-800 border-orange-300 text-orange-300' :
                                                    'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-300'
                                            }`}>
                                            {record ? <span className="material-symbols-outlined text-[18px]">photo_camera</span> :
                                                isPassed ? <span className="material-symbols-outlined text-[18px]">check</span> :
                                                    <span className="font-bold text-sm font-serif">{index + 1}</span>}
                                        </div>

                                        {/* Content Card */}
                                        <div className="flex-1 min-w-0">
                                            <div className="mb-2">
                                                <h4 className={`text-sm font-bold ${isPassed ? 'text-slate-800 dark:text-slate-200' : 'text-gray-400'}`}>
                                                    {node.title}
                                                </h4>
                                                {isPassed && !record && (
                                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                                                        {isCoop ? '跟随队伍已抵达' : '已抵达此地'}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Record Content */}
                                            {record && (
                                                <>
                                                    {/* Check if record has any visual content or note */}
                                                    {Boolean(record.imageUrls?.length || record.imageUrl || record.note) ? (
                                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm rotate-1 transition-transform hover:rotate-0 duration-300 cursor-pointer">

                                                            {/* Multiple Images Grid */}
                                                            {record.imageUrls && record.imageUrls.length > 0 ? (
                                                                <div className={`grid gap-1 mb-3 ${record.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                                    {record.imageUrls.map((url: string, idx: number) => (
                                                                        <div
                                                                            key={idx}
                                                                            className={`rounded-lg overflow-hidden bg-gray-100 ${record.imageUrls.length === 3 && idx === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`}
                                                                            onClick={(e) => { e.stopPropagation(); setPreviewImage(url); }}
                                                                        >
                                                                            <CapacitorImage src={getImageUrl(url)} className="w-full h-full object-cover transition-transform hover:scale-105" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : record.imageUrl && (
                                                                // Fallback for legacy single image
                                                                <div
                                                                    className="aspect-[4/3] rounded-lg overflow-hidden mb-3 bg-gray-100"
                                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(record.imageUrl); }}
                                                                >
                                                                    <CapacitorImage src={getImageUrl(record.imageUrl)} className="w-full h-full object-cover transition-transform hover:scale-105" />
                                                                </div>
                                                            )}

                                                            {record.note && (
                                                                <p className="text-sm text-gray-600 dark:text-gray-300 font-serif leading-relaxed px-1">
                                                                    “{record.note}”
                                                                </p>
                                                            )}
                                                            <div className="mt-2 flex justify-end">
                                                                <span className="text-[10px] text-gray-300 font-mono">
                                                                    {new Date(record.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Fallback for empty/QA-only records (hide bubble, show minimal status)
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                                已完成挑战
                                                            </span>
                                                            <span className="text-[10px] text-gray-300 font-mono">
                                                                {new Date(record.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Final Summary */}
                            {journal.summary && (journal.summary.note || journal.summary.imageUrl) && (
                                <div className="relative flex gap-5 mb-6 animate-in slide-in-from-bottom-4">
                                    <div className="relative z-10 shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-yellow-400 text-white shadow-lg">
                                        <span className="material-symbols-outlined text-[20px]">emoji_events</span>
                                    </div>
                                    <div className="flex-1 bg-[#fffbe6] dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
                                        <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-2 uppercase tracking-wider">最终感想</h4>
                                        {journal.summary.imageUrl && (
                                            <div className="rounded-xl overflow-hidden mb-3 shadow-md">
                                                <CapacitorImage src={getImageUrl(journal.summary.imageUrl)} className="w-full h-auto object-cover" />
                                            </div>
                                        )}
                                        {journal.summary.note && (
                                            <p className="text-sm text-slate-700 dark:text-slate-300 font-serif whitespace-pre-line leading-relaxed">
                                                {journal.summary.note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Fullscreen Image Viewer */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        onClick={() => setPreviewImage(null)}
                    >
                        <span className="material-symbols-outlined text-white">close</span>
                    </button>
                    <CapacitorImage
                        src={getImageUrl(previewImage)}
                        className="max-w-full max-h-full object-contain p-4 animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default ParticipantJournalModal;
