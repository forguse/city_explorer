import React, { useState, useEffect } from 'react';
import { club as clubApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ClubMyScreenProps {
  onBack: () => void;
  onClubDetail?: (club: any) => void;
  onReviewRequests?: (club: any) => void;  // 审核入社申请
}

const ClubMyScreen: React.FC<ClubMyScreenProps> = ({ onBack, onClubDetail, onReviewRequests }) => {
  const [createdClubs, setCreatedClubs] = useState<any[]>([]);
  const [joinedClubs, setJoinedClubs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch my clubs (created and joined)
  useEffect(() => {
    const fetchMyClubs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await clubApi.getMyClubs();
        setCreatedClubs(response.data.created || []);
        setJoinedClubs(response.data.joined || []);
        setTotalCount(response.data.totalCount || 0);
      } catch (err: any) {
        console.error('Failed to fetch my clubs:', err);
        setError('加载失败，请重试');
      } finally {
        setLoading(false);
      }
    };
    fetchMyClubs();
  }, [currentUser.id]);

  // Fetch pending request counts for created clubs
  useEffect(() => {
    const fetchPendingCounts = async () => {
      if (createdClubs.length === 0) return;

      try {
        const counts: Record<string, number> = {};
        await Promise.all(
          createdClubs.map(async (club) => {
            const response = await clubApi.getJoinRequests(club._id, 'pending');
            counts[club._id] = response.data.length;
          })
        );
        setPendingCounts(counts);
      } catch (err) {
        console.error('Failed to fetch pending counts:', err);
      }
    };
    fetchPendingCounts();
  }, [createdClubs]);

  const renderClubCard = (club: any, isCreated: boolean = false) => (
    <div
      key={club._id}
      className="bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm"
    >
      <button
        onClick={() => onClubDetail?.(club)}
        className="text-left w-full"
      >
        <div className="h-24 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
          {club.coverUrl ? (
            <CapacitorImage
              src={getImageUrl(club.coverUrl)}
              className="w-full h-full object-cover"
              alt={club.name}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400 text-4xl">groups</span>
            </div>
          )}
          {isCreated && (
            <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full z-10">
              团长
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">{club.name}</h3>
            <span className="text-xs text-gray-500">{club.city || ''}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {club.description || '暂无介绍'}
          </p>
          <div className="mt-2 text-xs text-gray-400">
            {club.members?.length || 0} 位成员
          </div>
        </div>
      </button>
      {/* 团长审核入口 */}
      {isCreated && (
        <div className="px-3 pb-3 pt-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReviewRequests?.(club);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">how_to_reg</span>
            审核入社申请
            {pendingCounts[club._id] > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingCounts[club._id]}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 dark:text-slate-400">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen w-full">
      <div className="relative flex flex-col min-h-screen w-full bg-white dark:bg-[#2d241c] overflow-hidden">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#2d241c]/90 backdrop-blur border-b border-gray-100 dark:border-gray-800 w-full">
          <div className="flex items-center px-4 py-3 gap-3 w-full">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold flex-1">我的社团</h1>
            <span className="text-xs text-gray-500">{totalCount}/8</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6 w-full">
          {error && (
            <div className="text-center text-red-500 py-4">
              {error}
              <button
                onClick={() => window.location.reload()}
                className="ml-2 text-[#0ea5e9] underline"
              >
                重试
              </button>
            </div>
          )}

          {/* 我创建的社团 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-lg">workspace_premium</span>
                我创建的
              </h2>
              <span className="text-xs text-gray-400">{createdClubs.length}/3</span>
            </div>
            {createdClubs.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 dark:bg-[#241c16] rounded-2xl">
                <span className="material-symbols-outlined text-2xl text-gray-300 mb-1 block">add_circle</span>
                还没有创建社团
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {createdClubs.map((club) => renderClubCard(club, true))}
              </div>
            )}
          </section>

          {/* 我加入的社团 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0ea5e9] text-lg">groups</span>
                我加入的
              </h2>
              <span className="text-xs text-gray-400">{joinedClubs.length} 个</span>
            </div>
            {joinedClubs.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 dark:bg-[#241c16] rounded-2xl">
                <span className="material-symbols-outlined text-2xl text-gray-300 mb-1 block">group_add</span>
                还没有加入其他社团
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {joinedClubs.map((club) => renderClubCard(club, false))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default ClubMyScreen;
