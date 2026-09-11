
import React, { useState, useEffect } from 'react';
import { task as taskApi } from '../services/api';
import HotTasksGrid from './HotTasksGrid';
import { getImageUrl } from '../src/utils/imageUrl';

interface HotTasksScreenProps {
  onBack: () => void;
  onTaskDetail?: (id: string) => void;
  initialTab?: 'recent' | 'hot';
}

const HotTasksScreen: React.FC<HotTasksScreenProps> = ({ onBack, onTaskDetail, initialTab = 'recent' }) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'hot'>(initialTab);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 20 };
      if (activeTab === 'hot') {
        params.sort = 'hot';
        params.period = 'month'; // Default to monthly hot
      }

      const response = await taskApi.getAll(params);

      const fetchedTasks = response.data.map((t: any) => ({
        id: t._id,
        title: t.title,
        image: getImageUrl(t.coverImageUrl) || 'https://via.placeholder.com/300',
        userCount: t.userCount || 0,
        likeCount: t.likeCount || 0,
        isLiked: t.isLiked || false,
        isHot: t.likeCount > 50, // 简单定义热度阈值
      }));
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  // Handle Like
  const handleLike = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => {
        if (t.id === item.id) {
          return {
            ...t,
            isLiked: !t.isLiked,
            likeCount: t.isLiked ? t.likeCount - 1 : t.likeCount + 1
          };
        }
        return t;
      }));

      await taskApi.like(item.id);
    } catch (error) {
      console.error('Like failed:', error);
      // Rollback
      setTasks(prev => prev.map(t => {
        if (t.id === item.id) {
          return {
            ...t,
            isLiked: !t.isLiked,
            likeCount: t.isLiked ? t.likeCount + 1 : t.likeCount - 1
          };
        }
        return t;
      }));
    }
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white min-h-screen font-display transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8fafc]/90 dark:bg-[#0f172a]/90 backdrop-blur-md px-4 pt-10 pb-4 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold flex-1">热门任务</h1>
        </div>

        {/* Tab Switch */}
        <div className="flex bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm transition-colors">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${activeTab === 'recent'
              ? 'bg-[#16a34a] text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-300'
              }`}
          >
            最近发布
          </button>
          <button
            onClick={() => setActiveTab('hot')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${activeTab === 'hot'
              ? 'bg-[#16a34a] text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-300'
              }`}
          >
            最热任务
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pb-8 min-h-[50vh]">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">加载中...</div>
        ) : (
          <HotTasksGrid
            tasks={tasks}
            onTaskClick={(t) => onTaskDetail?.(t.id)}
            onLikeClick={handleLike}
          />
        )}
      </main>
    </div>
  );
};

export default HotTasksScreen;
