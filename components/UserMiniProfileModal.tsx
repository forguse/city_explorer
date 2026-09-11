
import React, { useState } from 'react';
import { user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface UserMiniProfileModalProps {
  userId: string;
  user: {
    name: string;
    avatar: string;
    level?: number;
    title?: string;
    bio?: string;
    isFollowing?: boolean;
  };
  onClose: () => void;
  onViewProfile: () => void;
  onMessage?: () => void;
}

const UserMiniProfileModal: React.FC<UserMiniProfileModalProps> = ({ userId, user, onClose, onViewProfile, onMessage }) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || !userId) return;

    try {
      setLoading(true);
      const response = await userApi.toggleFollow(userId);
      setIsFollowing(response.data.isFollowing);
    } catch (err: any) {
      console.error('Toggle follow error:', err);
      alert(err.response?.data?.error || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (friendLoading || isFriend || !userId) return;

    try {
      setFriendLoading(true);
      await userApi.sendFriendRequest(userId);
      setIsFriend(true);
      alert('好友申请已发送');
    } catch (err: any) {
      console.error('Add friend error:', err);
      alert(err.response?.data?.error || '添加好友失败，请重试');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMessage) {
      onMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1C1C1E] w-full max-w-xs rounded-3xl p-5 shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          <div
            className="relative w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-[#0ea5e9] to-purple-500 mb-3 cursor-pointer transition-transform active:scale-95"
            onClick={onViewProfile}
          >
            <CapacitorImage
              src={getImageUrl(user.avatar)}
              alt={user.name}
              className="w-full h-full rounded-full object-cover border-2 border-white dark:border-[#1C1C1E]"
            />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{user.name}</h3>

          {user.bio && (
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center mb-6 px-2 line-clamp-2">
              {user.bio}
            </p>
          )}

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleFollow}
              disabled={loading}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${isFollowing
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                : 'bg-[#0ea5e9] text-white shadow-lg shadow-[#0ea5e9]/30 hover:bg-sky-500'
                }`}
            >
              {loading ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              ) : isFollowing ? '已关注' : '关注'}
            </button>

            <button
              onClick={handleAddFriend}
              disabled={isFriend || friendLoading}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {friendLoading ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">{isFriend ? 'check' : 'person_add'}</span>
                  {isFriend ? '已申请' : '加好友'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserMiniProfileModal;
