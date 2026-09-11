
import React, { useState, useEffect } from 'react';
import { community as communityApi, user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface AdminPostReviewScreenProps {
    onBack: () => void;
}

interface PendingPost {
    _id: string;
    content: string;
    imageUrls: string[];
    author: {
        _id: string;
        username: string;
        avatarUrl?: string;
    };
    reportCount: number;
    createdAt: string;
    relatedTask?: { title: string };
}

const AdminPostReviewScreen: React.FC<AdminPostReviewScreenProps> = ({ onBack }) => {
    const [posts, setPosts] = useState<PendingPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Check Admin
                const meRes = await userApi.getMe();
                if (!meRes.data?.isAdmin) {
                    setError('无权限访问此页面');
                    setIsAdmin(false);
                    return;
                }
                setIsAdmin(true);

                // Fetch Pending Posts
                const res = await communityApi.getPendingPosts();
                setPosts(res.data || []);
            } catch (err: any) {
                console.error('Failed to fetch pending posts:', err);
                if (err.response?.status === 403) {
                    setError('无权限访问');
                } else {
                    setError('加载失败');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleReview = async (postId: string, action: 'approve' | 'reject') => {
        if (action === 'reject' && !confirm('确定要拒绝此帖子吗？')) return;

        try {
            setActionLoading(postId);
            await communityApi.reviewPost(postId, action);
            setPosts(prev => prev.filter(p => p._id !== postId));
        } catch (err: any) {
            console.error('Failed to review post:', err);
            alert(err.response?.data?.error || '操作失败');
        } finally {
            setActionLoading(null);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return '刚刚';
        if (hours < 24) return `${hours}小时前`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}天前`;
        return date.toLocaleDateString();
    };

    return (
        <div className="bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white min-h-screen font-display">
            {/* Header - Consistent with TaskReviewSpace */}
            <header className="sticky top-0 z-50 bg-[#f8fafc]/90 dark:bg-[#0f172a]/90 backdrop-blur-md px-4 pt-10 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">帖子审核</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            管理员模式 · 内容风控
                        </p>
                    </div>
                    {isAdmin && (
                        <span className="px-2 py-1 bg-emerald-500 text-white text-xs rounded-full font-bold">
                            管理员
                        </span>
                    )}
                </div>
            </header>

            <main className="px-4 pb-8">
                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 dark:text-slate-400">加载中...</p>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="material-symbols-outlined text-5xl text-slate-400 mb-4">gpp_bad</span>
                        <p className="text-slate-500 dark:text-slate-400">{error}</p>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && posts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="material-symbols-outlined text-5xl text-emerald-500 mb-4">verified</span>
                        <p className="text-slate-500 dark:text-slate-400">暂无待审核帖子</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">社区内容很健康</p>
                    </div>
                )}

                {/* Content List */}
                {!loading && !error && posts.length > 0 && (
                    <div className="space-y-4">
                        {/* Stats Board */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                            <div className="text-center flex-1">
                                <p className="text-2xl font-bold text-emerald-500">{posts.length}</p>
                                <p className="text-xs text-slate-500">待审核</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="text-center flex-1">
                                <p className="text-2xl font-bold text-orange-500">
                                    {posts.filter(p => p.reportCount > 0).length}
                                </p>
                                <p className="text-xs text-slate-500">有举报</p>
                            </div>
                        </div>

                        {/* Posts List */}
                        {posts.map((post) => {
                            const isLoading = actionLoading === post._id;

                            return (
                                <div key={post._id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                    {/* Author & Meta */}
                                    <div className="p-4 pb-2 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                            {post.author?.avatarUrl && (
                                                <CapacitorImage
                                                    src={getImageUrl(post.author.avatarUrl)}
                                                    className="w-full h-full object-cover"
                                                    alt={post.author.username}
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm">{post.author?.username || '未知用户'}</p>
                                                {post.reportCount > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] rounded flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[10px]">flag</span>
                                                        {post.reportCount}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400">{formatTime(post.createdAt)}</p>
                                        </div>
                                    </div>

                                    {/* Post Body */}
                                    <div className="px-4 pb-4">
                                        <p className="text-sm text-slate-800 dark:text-slate-200 mb-3 whitespace-pre-wrap leading-relaxed">
                                            {post.content}
                                        </p>

                                        {/* Images Grid */}
                                        {post.imageUrls && post.imageUrls.length > 0 && (
                                            <div className={`grid ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 rounded-xl overflow-hidden`}>
                                                {post.imageUrls.map((img, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="aspect-[4/3] bg-slate-100 dark:bg-slate-700 overflow-hidden"
                                                    >
                                                        <CapacitorImage
                                                            src={img}
                                                            className="w-full h-full object-cover"
                                                            alt="Content"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Task Link Context */}
                                        {post.relatedTask && (
                                            <div className="mt-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 flex items-center gap-2 border border-gray-100 dark:border-slate-700">
                                                <span className="material-symbols-outlined text-sm text-blue-500">link</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    关联任务：{post.relatedTask.title}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 flex gap-3">
                                        <button
                                            onClick={() => handleReview(post._id, 'reject')}
                                            disabled={isLoading}
                                            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {isLoading ? (
                                                <span className="material-symbols-outlined animate-spin text-sm">rotate_right</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            )}
                                            拒绝发布
                                        </button>
                                        <button
                                            onClick={() => handleReview(post._id, 'approve')}
                                            disabled={isLoading}
                                            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20"
                                        >
                                            {isLoading ? (
                                                <span className="material-symbols-outlined animate-spin text-sm">rotate_right</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-sm">check</span>
                                            )}
                                            通过审核
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPostReviewScreen;
