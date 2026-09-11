
import React, { useState, useEffect } from 'react';
import { task as taskApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface Task {
  _id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  difficulty: number;
  author: {
    _id: string;
    username: string;
    level?: number;
    avatarUrl?: string;
  };
  isOfficial: boolean;
  likeCount: number;
  isLiked: boolean;
  userCount: number; // 参与用户数
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface OfficialRecommendScreenProps {
  onBack: () => void;
  onTaskDetail?: (id: string) => void;
}

const OfficialRecommendScreen: React.FC<OfficialRecommendScreenProps> = ({ onBack, onTaskDetail }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [recommendations, setRecommendations] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = [
    { id: 'all', label: '全部' },
    { id: 'hot', label: '热门' },
    { id: 'new', label: '最新' },
  ];

  // 获取官方推荐任务
  const fetchOfficialTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { isOfficial: true };

      // 根据筛选条件设置排序
      if (activeFilter === 'hot') {
        params.sort = 'hot';
        params.period = 'month'; // 默认为月度热门
      }
      // 'all' 和 'new' 都使用默认的 createdAt 降序排序

      const response = await taskApi.getTasks(params);
      setRecommendations(response.data);
    } catch (err: any) {
      console.error('Failed to fetch official tasks:', err);
      setError(err.response?.data?.error || '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficialTasks();
  }, [activeFilter]);

  // 处理点赞
  const handleLike = async (e: React.MouseEvent, item: Task) => {
    e.stopPropagation(); // 阻止冒泡，避免触发卡片点击
    try {
      // 乐观更新 UI
      setRecommendations(prev => prev.map(t => {
        if (t._id === item._id) {
          return {
            ...t,
            isLiked: !t.isLiked,
            likeCount: t.isLiked ? t.likeCount - 1 : t.likeCount + 1
          };
        }
        return t;
      }));

      // 发送请求
      await taskApi.like(item._id);
    } catch (err) {
      console.error('Like failed:', err);
      // 回滚
      setRecommendations(prev => prev.map(t => {
        if (t._id === item._id) {
          return {
            ...t,
            isLiked: !t.isLiked,
            likeCount: t.isLiked ? t.likeCount + 1 : t.likeCount - 1 // 反向操作回滚
          };
        }
        return t;
      }));
    }
  };

  // 格式化数字显示（如 1200 -> 1.2k）
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // 根据难度获取标签
  const getDifficultyTag = (difficulty: number): { text: string; color: string } => {
    if (difficulty >= 4) return { text: '挑战', color: 'bg-orange-500 text-white' };
    if (difficulty >= 3) return { text: '精品', color: 'bg-[#0ea5e9] text-white' };
    return { text: '轻松', color: 'bg-green-500 text-white' };
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white min-h-screen font-display">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8fafc]/90 dark:bg-[#0f172a]/90 backdrop-blur-md px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold flex-1">官方推荐</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px - 4 py - 2 rounded - full text - sm font - medium whitespace - nowrap transition - all ${activeFilter === filter.id
                ? 'bg-[#0ea5e9] text-white shadow-lg shadow-sky-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                } `}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pb-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">加载中...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-4">error_outline</span>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={fetchOfficialTasks}
              className="px-4 py-2 bg-[#0ea5e9] text-white rounded-full text-sm font-medium hover:bg-[#0284c7] transition-colors"
            >
              重新加载
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-4">explore_off</span>
            <p className="text-slate-500 dark:text-slate-400">暂无官方推荐任务</p>
          </div>
        )}

        {/* Task List */}
        {!loading && !error && recommendations.length > 0 && (
          <div className="grid gap-4">
            {recommendations.map((item) => {
              const tag = getDifficultyTag(item.difficulty);
              return (
                <div
                  key={item._id}
                  onClick={() => onTaskDetail?.(item._id)}
                  className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
                >
                  {/* Image Section with Integrated Text */}
                  <div className="relative w-full h-64 bg-slate-200 dark:bg-slate-700">
                    {item.coverImageUrl ? (
                      <>
                        <div className="absolute inset-0 transition-transform hover:scale-110 duration-500">
                          <CapacitorImage
                            src={getImageUrl(item.coverImageUrl)}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            style={{ filter: 'brightness(0.9)' }}
                          />
                        </div>
                        {/* Enhanced Gradient Overlay - darker at bottom for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800">
                          <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-600">image</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
                      </>
                    )}

                    {/* Tags Overlay on Image - Top */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm ${tag.color}`}>
                        {tag.text}
                      </span>
                      {item.isOfficial && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-lg backdrop-blur-sm">
                          官方
                        </span>
                      )}
                    </div>

                    {/* Title and Description Integrated on Image - Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
                      {/* Title */}
                      <h3 className="font-bold text-xl text-white mb-2 line-clamp-2 drop-shadow-lg">
                        {item.title}
                      </h3>

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-white/90 line-clamp-2 mb-3 drop-shadow-md leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* User Count Row on Image */}
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2 items-center">
                          {/* Mock Avatars */}
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-sky-100 flex items-center justify-center text-[10px] text-sky-600 font-medium shadow-md">A</div>
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-600 font-medium shadow-md">B</div>
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-rose-100 flex items-center justify-center text-[10px] text-rose-600 font-medium shadow-md">C</div>
                        </div>
                        <span className="text-sm text-white/95 font-medium drop-shadow-md">
                          {formatNumber(item.userCount || 0)} 人参与
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row - Below Image */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800">
                    {/* View Count */}
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      {formatNumber(item.viewCount || 0)}
                    </span>

                    {/* Like Button */}
                    <button
                      onClick={(e) => handleLike(e, item)}
                      className="flex items-center gap-1.5 text-sm transition-colors group active:scale-90 duration-200"
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] transition-all group-hover:scale-110 ${item.isLiked ? 'text-red-500' : 'text-slate-400 group-hover:text-red-400'}`}
                        style={item.isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        favorite
                      </span>
                      <span className={`font-medium ${item.isLiked ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        {formatNumber(item.likeCount)}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
  .no - scrollbar:: -webkit - scrollbar { display: none; }
        .no - scrollbar { -ms - overflow - style: none; scrollbar - width: none; }
`}</style>
    </div>
  );
};

export default OfficialRecommendScreen;