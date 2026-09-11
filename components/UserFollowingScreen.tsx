import React, { useState, useEffect } from 'react';
import { user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';
import LoadingScreen from './LoadingScreen';

interface UserFollowingScreenProps {
  onBack: () => void;
  userId?: string;
  userName?: string;
  onUserProfile?: (userId: string) => void;
  onMessage?: (user: any) => void;
}

interface FollowingUser {
  id: string;
  name: string;
  avatar: string;
  level: number;
  title: string;
  bio: string;
  isFollowing: boolean;
}

const UserFollowingScreen: React.FC<UserFollowingScreenProps> = ({
  onBack,
  userId,
  userName = '用户',
  onUserProfile,
  onMessage
}) => {
  const [followingList, setFollowingList] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!userId) {
        setError('用户ID不存在');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await userApi.getFollowing(userId);
        setFollowingList(response.data);
      } catch (err: any) {
        console.error('Fetch following error:', err);
        setError(err.response?.data?.error || '获取关注列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId]);

  const handleToggleFollow = async (id: string) => {
    if (togglingIds.has(id)) return;

    try {
      setTogglingIds(prev => new Set(prev).add(id));
      const response = await userApi.toggleFollow(id);

      setFollowingList(prev => prev.map(user =>
        user.id === id ? { ...user, isFollowing: response.data.isFollowing } : user
      ));
    } catch (err: any) {
      console.error('Toggle follow error:', err);
    } finally {
      setTogglingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-[#2d241c] border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center px-4 py-3 gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold flex-1">{userName}的关注</h1>
          <span className="text-sm text-gray-500">{followingList.length}人</span>
        </div>
      </header>

      {/* List */}
      <main className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#0ea5e9] text-white rounded-full text-sm font-bold"
            >
              重试
            </button>
          </div>
        ) : followingList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-4">person_off</span>
            <p className="text-gray-500 dark:text-gray-400">还没有关注任何人</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {followingList.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 bg-white dark:bg-[#2d241c] hover:bg-gray-50 dark:hover:bg-[#3d342c] transition-colors"
              >
                <div
                  onClick={() => onUserProfile?.(user.id)}
                  className="size-14 rounded-full bg-gray-200 cursor-pointer flex-shrink-0 ring-2 ring-white dark:ring-gray-800 overflow-hidden"
                >
                  <CapacitorImage
                    src={getImageUrl(user.avatar)}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onUserProfile?.(user.id)}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold truncate">{user.name}</h3>
                    {/* <span className="px-1.5 py-0.5 bg-[#0ea5e9]/10 text-[#0ea5e9] text-[10px] font-bold rounded">
                      Lv.{user.level}
                    </span> */}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{user.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{user.bio}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">

                  <button
                    onClick={() => handleToggleFollow(user.id)}
                    disabled={togglingIds.has(user.id)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 ${user.isFollowing
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      : 'bg-[#0ea5e9] text-white shadow-lg shadow-[#0ea5e9]/30'
                      }`}
                  >
                    {togglingIds.has(user.id) ? (
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    ) : user.isFollowing ? '已关注' : '关注'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserFollowingScreen;