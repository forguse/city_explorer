import React, { useState, useEffect } from 'react';
import { user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface MyFriendsScreenProps {
    onBack: () => void;
    onUserProfile?: (userId: string) => void;
}

const MyFriendsScreen: React.FC<MyFriendsScreenProps> = ({ onBack, onUserProfile }) => {
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Load friends
    useEffect(() => {
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        try {
            setLoading(true);
            const res = await userApi.getMyFriends();
            setFriends(res.data);
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            setSearchLoading(true);
            setSearchResult(null);
            const res = await userApi.searchUser(searchQuery);
            if (res.data.found && res.data.users) {
                setSearchResult(res.data.users);
            } else {
                setSearchResult([]);
                alert('未找到该用户');
            }
        } catch (error: any) {
            console.error('Search failed:', error);
            alert(error.response?.data?.error || '搜索失败');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAddFriend = async (targetId: string) => {
        if (actionLoading) return;
        try {
            setActionLoading(true);
            await userApi.sendFriendRequest(targetId);
            alert('好友申请已发送');
            // Optimistic update: mark as sent/friend?
            // For now, simple reload or just alert is fine.
            // Ideally update searchResult state to reflect 'isFriend' or 'sent'
        } catch (error: any) {
            console.error('Failed to add friend:', error);
            alert(error.response?.data?.error || '发送申请失败');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteFriend = async (friendId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('确定要删除这位好友吗？此操作将双向解除好友关系。')) return;

        try {
            await userApi.deleteFriend(friendId);
            setFriends(prev => prev.filter(f => f.id !== friendId));
            alert('好友已删除');
        } catch (error: any) {
            console.error('Delete friend failed:', error);
            alert(error.response?.data?.error || '删除失败');
        }
    };

    return (
        <div className="bg-[#f5f7f8] dark:bg-[#101722] min-h-screen flex flex-col font-display text-[#1b130d] dark:text-[#f3ece7]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#1e293b] flex items-center justify-between px-4 py-3 shadow-sm">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <span className="text-lg font-bold">我的好友</span>
                <div className="w-10"></div>
            </div>

            <div className="p-4 flex flex-col gap-6">
                {/* Search Section */}
                <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">添加好友</label>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="输入用户ID或昵称搜索"
                                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 focus:border-[#257bf4] focus:ring-1 focus:ring-[#257bf4] outline-none transition-all"
                                onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searchLoading || !searchQuery.trim()}
                            className="px-5 h-12 bg-[#257bf4] text-white font-bold rounded-xl hover:bg-[#1e6ad4] disabled:opacity-50 transition-colors"
                        >
                            {searchLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : '搜索'}
                        </button>
                    </div>

                    {/* Search Result */}
                    {searchResult && (Array.isArray(searchResult) ? searchResult : [searchResult]).map((user: any) => (
                        <div key={user.id} className="mt-2 p-4 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                            <div
                                className="flex items-center gap-3 cursor-pointer"
                                onClick={() => onUserProfile?.(user.id)}
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                    <CapacitorImage
                                        src={getImageUrl(user.avatar)}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        {user.name}
                                        {/* <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Lv.{user.level}</span> */}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{user.bio || '暂无介绍'}</div>
                                </div>
                            </div>

                            {user.isSelf ? (
                                <span className="text-xs text-gray-400 font-medium px-3">你自己</span>
                            ) : user.isFriend ? (
                                <span className="text-xs text-green-500 font-medium px-3 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                    已添加
                                </span>
                            ) : (
                                <button
                                    onClick={() => handleAddFriend(user.id)}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1 px-4 py-2 bg-[#257bf4] text-white text-sm font-bold rounded-lg hover:bg-[#1e6ad4] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? '发送中...' : '加好友'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* My Friends List */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">全部好友 ({friends.length})</label>
                        <span className="text-xs text-gray-400">上限 100</span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col gap-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-white dark:bg-[#1e293b] rounded-xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : friends.length === 0 ? (
                        <div className="py-10 text-center text-gray-400">
                            <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">group_off</span>
                            <p>暂无好友，快去搜索添加吧</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {friends.map(friend => (
                                <div
                                    key={friend.id}
                                    className="p-3 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-[#257bf4]/30 group transition-all"
                                >
                                    <div
                                        className="flex items-center gap-3 cursor-pointer flex-1"
                                        onClick={() => onUserProfile?.(friend.id)}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                            <CapacitorImage
                                                src={getImageUrl(friend.avatar)}
                                                alt={friend.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1b130d] dark:text-[#f3ece7]">{friend.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                                <span className="bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-[10px]">{friend.title}</span>
                                                {/* <span>Lv.{friend.level}</span> */}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDeleteFriend(friend.id, e)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                                            title="删除好友"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                        </button>
                                        <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                                    </div>
                                </div>
                            ))}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyFriendsScreen;
