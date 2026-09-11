import React, { useState, useEffect } from 'react';
import { report as reportApi, user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ReportManagementScreenProps {
    onBack: () => void;
}

interface ReportItem {
    _id: string;
    reporter: {
        _id: string;
        username: string;
        avatarUrl?: string;
    };
    targetType: 'task' | 'post';
    targetId: string;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string;
    processedBy?: {
        username: string;
    };
    processedAt?: string;
    createdAt: string;
    targetDetails?: {
        title?: string;
        content?: string;
        description?: string;
        coverImageUrl?: string;
        imageUrls?: string[];
        author?: {
            _id: string;
            username: string;
            avatarUrl?: string;
        };
        reportCount?: number;
        status?: string;
        isDeleted?: boolean;
    };
}

const ReportManagementScreen: React.FC<ReportManagementScreenProps> = ({ onBack }) => {
    const [reports, setReports] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // 验证管理员权限
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await userApi.getMe();
                if (res.data?.isAdmin) {
                    setIsAdmin(true);
                    fetchReports();
                    fetchStats();
                } else {
                    setIsAdmin(false);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to check admin status:', err);
                setIsAdmin(false);
                setLoading(false);
            }
        };
        checkAdmin();
    }, []);

    const fetchReports = async (status: string = 'pending') => {
        setLoading(true);
        try {
            const res = await reportApi.getAll(status);
            setReports(res.data);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await reportApi.getStats();
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchReports(activeTab);
        }
    }, [activeTab, isAdmin]);

    const handleApprove = async (report: ReportItem) => {
        if (!window.confirm('确定要接受此举报吗？被举报的内容将被下架。')) return;

        setProcessing(true);
        try {
            await reportApi.approve(report._id);
            await fetchReports(activeTab);
            await fetchStats();
            alert('举报已处理，内容已下架');
        } catch (err: any) {
            console.error('Failed to approve report:', err);
            alert(err.response?.data?.error || '操作失败，请重试');
        } finally {
            setProcessing(false);
        }
    };

    const handleRejectClick = (report: ReportItem) => {
        setSelectedReport(report);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!selectedReport) return;

        setProcessing(true);
        try {
            await reportApi.reject(selectedReport._id, rejectReason);
            setShowRejectModal(false);
            setSelectedReport(null);
            await fetchReports(activeTab);
            await fetchStats();
            alert('举报已驳回');
        } catch (err: any) {
            console.error('Failed to reject report:', err);
            alert(err.response?.data?.error || '操作失败，请重试');
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 非管理员显示无权限页面
    if (!loading && !isAdmin) {
        return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-text-main dark:text-white">arrow_back_ios_new</span>
                    </button>
                    <h1 className="flex-1 text-center text-lg font-bold text-text-main dark:text-white">举报管理</h1>
                    <div className="w-10"></div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-4xl text-red-500">block</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">无权限访问</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center">只有管理员才能访问举报管理空间</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                    <span className="material-symbols-outlined text-text-main dark:text-white">arrow_back_ios_new</span>
                </button>
                <h1 className="flex-1 text-center text-lg font-bold text-text-main dark:text-white">举报管理</h1>
                <button onClick={() => { fetchReports(activeTab); fetchStats(); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                    <span className="material-symbols-outlined text-text-main dark:text-white">refresh</span>
                </button>
            </div>

            {/* 统计卡片 */}
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                        <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                        <p className="text-xs text-orange-600/70">待处理</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                        <p className="text-xs text-green-600/70">已接受</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.rejected}</p>
                        <p className="text-xs text-gray-500">已驳回</p>
                    </div>
                </div>
            </div>

            {/* Tab切换 */}
            <div className="flex bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                {(['pending', 'approved', 'rejected'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {tab === 'pending' ? '待处理' : tab === 'approved' ? '已接受' : '已驳回'}
                        {activeTab === tab && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full"></div>}
                    </button>
                ))}
            </div>

            {/* 内容列表 */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-green-500">check_circle</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            {activeTab === 'pending' ? '暂无待处理的举报' : activeTab === 'approved' ? '暂无已接受的举报' : '暂无已驳回的举报'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div key={report._id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
                                {/* 举报者信息 */}
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                                    <CapacitorImage
                                        src={getImageUrl(report.reporter?.avatarUrl) || '/default-avatar.png'}
                                        alt=""
                                        className="w-6 h-6 rounded-full object-cover"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-bold text-gray-900 dark:text-white">{report.reporter?.username}</span> 举报了
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${report.targetType === 'task' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'}`}>
                                        {report.targetType === 'task' ? '任务' : '帖子'}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-auto">{formatDate(report.createdAt)}</span>
                                </div>

                                {/* 被举报内容 */}
                                {report.targetDetails ? (
                                    <div className="mb-3">
                                        <div className="flex items-start gap-3">
                                            {(report.targetDetails.coverImageUrl || (report.targetDetails.imageUrls && report.targetDetails.imageUrls[0])) && (
                                                <CapacitorImage
                                                    src={getImageUrl(report.targetDetails.coverImageUrl || report.targetDetails.imageUrls?.[0])}
                                                    alt=""
                                                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                {report.targetType === 'task' ? (
                                                    <>
                                                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">{report.targetDetails.title}</h3>
                                                        <p className="text-xs text-gray-500 line-clamp-2">{report.targetDetails.description}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{report.targetDetails.content}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <CapacitorImage
                                                        src={getImageUrl(report.targetDetails.author?.avatarUrl) || '/default-avatar.png'}
                                                        alt=""
                                                        className="w-4 h-4 rounded-full"
                                                    />
                                                    <span className="text-xs text-gray-500">作者: {report.targetDetails.author?.username}</span>
                                                    <span className="text-xs text-red-500 ml-auto">
                                                        <span className="material-symbols-outlined text-xs align-middle">flag</span>
                                                        {report.targetDetails.reportCount}次举报
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl text-center">
                                        <span className="text-gray-400">内容已被删除</span>
                                    </div>
                                )}

                                {/* 处理状态 */}
                                {report.status !== 'pending' && (
                                    <div className={`mb-3 p-3 rounded-xl ${report.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-sm ${report.status === 'approved' ? 'text-green-500' : 'text-gray-500'}`}>
                                                {report.status === 'approved' ? 'check_circle' : 'cancel'}
                                            </span>
                                            <span className={`text-sm font-bold ${report.status === 'approved' ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {report.status === 'approved' ? '已接受举报，内容已下架' : '举报已驳回'}
                                            </span>
                                        </div>
                                        {report.adminNote && (
                                            <p className="text-xs text-gray-500 mt-1">原因: {report.adminNote}</p>
                                        )}
                                        {report.processedBy && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                处理人: {report.processedBy.username} · {report.processedAt && formatDate(report.processedAt)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* 操作按钮 - 仅待处理状态显示 */}
                                {report.status === 'pending' && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleRejectClick(report)}
                                            disabled={processing}
                                            className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                        >
                                            驳回举报
                                        </button>
                                        <button
                                            onClick={() => handleApprove(report)}
                                            disabled={processing}
                                            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                                        >
                                            接受举报
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 驳回原因弹窗 */}
            {showRejectModal && selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowRejectModal(false)}>
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-2xl text-gray-500">cancel</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">驳回举报</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">请输入驳回原因（可选）</p>
                        </div>

                        <div className="mb-6">
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="例如：内容不违规、举报理由不充分..."
                                className="w-full h-24 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-primary outline-none text-sm text-gray-900 dark:text-white resize-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                disabled={processing}
                                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={processing}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {processing ? '处理中...' : '确认驳回'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportManagementScreen;
