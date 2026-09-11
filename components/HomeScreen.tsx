import React, { useState, useEffect } from 'react';
import UserMiniProfileModal from './UserMiniProfileModal';
import ExplorationBlindBox from './ExplorationBlindBox';
import { task as taskApi, notification } from '../services/api';
import CitySelector from './CitySelector';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface HomeScreenProps {
  onMap: () => void;
  onPostDetail: (id: string) => void;
  onTaskDetail: (id: string) => void;
  onNotifications: () => void;
  onCreateTask: () => void;
  onUserProfile?: (userId: string) => void;
  onMessage?: (user: any) => void;
  onOfficialRecommend?: () => void;
  onHotTasks?: (tab: 'recent' | 'hot') => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onMap,
  onPostDetail,
  onTaskDetail,
  onNotifications,
  onCreateTask,
  onUserProfile,
  onMessage,
  onOfficialRecommend,
  onHotTasks
}) => {
  const [location, setLocation] = useState('全国'); // Default 'National'
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Data States
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [popularTasks, setPopularTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch Data Function
  const fetchData = async (city?: string) => {
    try {
      setLoading(true);
      const cityFilter = city === '全国' ? undefined : city;

      // 1. Fetch Official Recommendations (独立处理错误)
      try {
        const officialRes = await taskApi.getTasks({ isOfficial: true, limit: 5, city: cityFilter });
        setRecommendations(officialRes.data.map((t: any) => ({
          id: t._id,
          title: t.title,
          subtitle: t.description ? t.description.substring(0, 20) + '...' : '官方精选路线',
          tag: '精品',
          image: getImageUrl(t.coverImageUrl) || 'https://via.placeholder.com/300'
        })));
      } catch (err) {
        console.error('[HomeScreen] Failed to load official recommendations:', err);
        setRecommendations([]);
      }

      // 2. Fetch Recent/Popular Tasks (独立处理错误)
      try {
        const recentRes = await taskApi.getTasks({ limit: 10, city: cityFilter });
        setPopularTasks(recentRes.data.map((t: any) => ({
          id: t._id,
          title: t.title,
          image: getImageUrl(t.coverImageUrl) || 'https://via.placeholder.com/300',
          user: {
            id: t.author?._id || 'unknown',
            name: t.author?.username || '未知用户',
            avatar: getImageUrl(t.author?.avatarUrl) || 'https://via.placeholder.com/50',
            level: t.author?.level || 1,
            title: t.author?.title || '探险家'
          },
          stats: {
            active: t.userCount ? t.userCount + '人' : '0人',
            likes: t.likeCount || 0
          },
          isLiked: t.isLiked || false
        })));
      } catch (err) {
        console.error('[HomeScreen] Failed to load popular tasks:', err);
        setPopularTasks([]);
      }

    } catch (err) {
      console.error('[HomeScreen] Failed to load home screen data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread notifications count
  const fetchUnreadCount = async () => {
    try {
      const res = await notification.getMine();
      const unread = res.data.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch unread notifications:', err);
    }
  };

  useEffect(() => {
    fetchData(location);
    fetchUnreadCount();
  }, [location]);

  // State for search active
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }

    console.log('搜索:', searchQuery);
    try {
      setSearchLoading(true);
      setIsSearching(true);
      // Import search api dynamically or use from props if available? 
      // We need to import 'search' from api.ts. Assume we added it.
      const { search } = await import('../services/api');
      const res = await search.comprehensive(searchQuery);
      setSearchResults(res.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleAvatarClick = (e: React.MouseEvent, user: any) => {
    e.stopPropagation();
    setSelectedUser(user);
  };

  const handleCitySelect = () => {
    setShowCitySelector(true);
  };

  const handleCityChange = (cities: string[]) => {
    if (cities.length > 0) {
      setLocation(cities[0]);
      setShowCitySelector(false); // Should be handled by single mode auto-close, but safe to add
    }
  };

  // 处理点赞
  const handleLike = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation(); // 阻止冒泡，避免触发卡片点击
    try {
      // 乐观更新
      setPopularTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            isLiked: !t.isLiked,
            stats: {
              ...t.stats,
              likes: t.isLiked ? t.stats.likes - 1 : t.stats.likes + 1
            }
          };
        }
        return t;
      }));

      await taskApi.like(task.id);
    } catch (err) {
      console.error('Like failed:', err);
      // 回滚
      setPopularTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            isLiked: !t.isLiked,
            stats: {
              ...t.stats,
              likes: t.isLiked ? t.stats.likes + 1 : t.stats.likes - 1
            }
          };
        }
        return t;
      }));
    }
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white antialiased min-h-screen font-display pb-24 transition-colors duration-300">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8fafc]/80 dark:bg-[#0f172a]/80 backdrop-blur-md px-4 py-3 pt-safe flex flex-col gap-2 transition-colors duration-300">
        <div className="flex items-center justify-between">
          {/* Same location and buttons */}
          <div
            onClick={handleCitySelect}
            className="flex items-center gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 py-1 px-2 -ml-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[#16a34a]">location_on</span>
            <span className="font-bold text-lg">{location}</span>
            <span className="material-symbols-outlined text-sm text-slate-500">expand_more</span>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={onCreateTask}
              className="relative p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[#16a34a]"
            >
              <span className="material-symbols-outlined filled text-[24px]">add_circle</span>
            </button>
            <button
              onClick={onNotifications}
              className="relative p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-900 dark:text-white">notifications</span>
              {unreadCount > 0 && (
                <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
              )}
            </button>
          </div>
        </div>

        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[#16a34a]">search</span>
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
            className="block w-full pl-10 pr-10 py-2 bg-[#ecfdf3] dark:bg-[#1e293b] border-none rounded-xl focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] placeholder-slate-400 text-sm font-display transition-colors outline-none group-hover:bg-[#d1fae5] dark:group-hover:bg-[#2d3f50]"
            placeholder="搜索你感兴趣的任务或地点"
            type="text"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </header>

      <main>
        {isSearching ? (
          // Search Results View
          <section className="px-4 py-4 min-h-[50vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">搜索结果</h3>
              <button onClick={clearSearch} className="text-sm text-[#16a34a]">返回首页</button>
            </div>

            {searchLoading ? (
              <div className="text-center py-10 text-slate-500">正在搜索...</div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-10 text-slate-400">未找到相关内容</div>
            ) : (
              <div className="flex flex-col gap-3">
                {searchResults.map((item: any) => (
                  <div
                    key={item._id}
                    onClick={() => item.type === 'task' ? onTaskDetail(item._id) : onPostDetail(item._id)}
                    className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex gap-3 cursor-pointer hover:border-[#16a34a]/30 transition-colors"
                  >
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-gray-100 overflow-hidden relative">
                      {item.coverImage ? (
                        <CapacitorImage src={getImageUrl(item.coverImage)} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-400">
                          <span className="material-symbols-outlined">{item.type === 'task' ? 'flag' : 'article'}</span>
                        </div>
                      )}
                      <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-white ${item.type === 'task' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                        {item.type === 'task' ? 'TASK' : 'POST'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{item.title || '无标题'}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{item.content || item.description || ''}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <div className="flex items-center gap-1">
                          <CapacitorImage src={getImageUrl(item.author?.avatarUrl) || 'https://via.placeholder.com/20'} className="w-4 h-4 rounded-full" />
                          <span className="truncate max-w-[80px]">{item.author?.username || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.type === 'task' && item.difficulty && (
                            <span className="flex items-center text-orange-400">
                              {'★'.repeat(item.difficulty)}
                            </span>
                          )}
                          <span>得分: {item.score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          // Normal Home View
          <>
            {/* Exploration Blind Box Section */}
            <ExplorationBlindBox
              currentCity={location}
              onTaskVerify={(id) => onTaskDetail(id)}
            />

            {loading ? (
              <div className="mt-8 px-4 text-center text-slate-500">加载推荐中...</div>
            ) : (
              <>
                {/* Recommendations Section */}
                {recommendations.length > 0 && (
                  <section className="mt-8">
                    <div className="px-4 flex justify-between items-end mb-4">
                      <h3 className="text-xl font-bold">官方推荐</h3>
                      <button
                        onClick={onOfficialRecommend}
                        className="text-xs text-[#16a34a] font-medium cursor-pointer hover:opacity-80 px-2 py-1 rounded hover:bg-[#16a34a]/5 transition-colors flex items-center gap-1"
                      >
                        查看全部
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      </button>
                    </div>

                    <div className="flex overflow-x-auto no-scrollbar px-4 gap-4 pb-2 snap-x snap-mandatory scroll-smooth">
                      {recommendations.map(item => (
                        <div
                          key={item.id}
                          className="flex-none w-72 group cursor-pointer snap-start"
                          onClick={() => onTaskDetail(item.id)}
                        >
                          <div className="relative aspect-[16/10] rounded-xl overflow-hidden shadow-sm">
                            {/* Tag Badge */}
                            <div className="absolute top-3 left-3 z-10 bg-[#16a34a] text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-md">
                              {item.tag}
                            </div>
                            {/* Background Image - No blur or darkening */}
                            <div className="w-full h-full transition-transform duration-500 group-hover:scale-110">
                              <CapacitorImage
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {/* Text Container - White card at bottom */}
                            <div className="absolute bottom-2 left-3 right-3">
                              <div className="bg-white/40 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg">
                                <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{item.title}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.subtitle}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* View All Card */}
                      <div
                        className="flex-none w-32 snap-start cursor-pointer"
                        onClick={onOfficialRecommend}
                      >
                        <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-[#16a34a]/20 to-[#16a34a]/5 border-2 border-dashed border-[#16a34a]/30 flex flex-col items-center justify-center gap-2 hover:border-[#16a34a] transition-colors">
                          <div className="w-10 h-10 rounded-full bg-[#16a34a]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#16a34a]">arrow_forward</span>
                          </div>
                          <span className="text-xs text-[#16a34a] font-medium">查看更多</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Popular Tasks Section */}
                <section className="mt-8 px-4">
                  <div className="flex justify-between items-end mb-4">
                    <h3 className="text-xl font-bold">热门任务</h3>
                    <div className="flex gap-3 text-xs font-medium">
                      <span
                        onClick={() => onHotTasks?.('recent')}
                        className="text-[#16a34a] underline decoration-2 underline-offset-4 cursor-pointer hover:opacity-80"
                      >
                        最近
                      </span>
                      <span
                        onClick={() => onHotTasks?.('hot')}
                        className="text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        最热
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {popularTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => onTaskDetail(task.id)}
                        className="flex flex-col gap-2 group cursor-pointer"
                      >
                        <div className="aspect-[3/4] rounded-xl overflow-hidden relative shadow-sm">
                          <div className="w-full h-full transition-transform duration-500 group-hover:scale-105">
                            <CapacitorImage
                              src={task.image}
                              alt={task.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div
                            className="absolute bottom-2 left-2 right-2 bg-slate-900/60 backdrop-blur-sm rounded-lg p-1.5 flex items-center gap-1.5"
                            onClick={(e) => handleAvatarClick(e, task.user)}
                          >
                            <CapacitorImage src={task.user.avatar} alt="avatar" className="size-4 rounded-full border border-white/20" />
                            <span className="text-[10px] text-white truncate">{task.user.name}</span>
                          </div>
                        </div>

                        <p className="text-sm font-bold leading-tight line-clamp-2 text-slate-800 dark:text-slate-100 group-hover:text-[#16a34a] transition-colors">
                          {task.title}
                        </p>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-slate-500">{task.stats.active}</span>
                          <button
                            onClick={(e) => handleLike(e, task)}
                            className="flex items-center gap-1 hover:scale-110 active:scale-90 transition-transform"
                          >
                            <span
                              className={`material-symbols-outlined text-xs transition-colors ${task.isLiked ? 'text-red-500' : 'text-slate-400'}`}
                              style={task.isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                              favorite
                            </span>
                            <span className={`text-[10px] ${task.isLiked ? 'text-red-500' : 'text-slate-500'}`}>
                              {task.stats.likes}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Keeping the mini profile for when not searching, or always keeping it? 
               Usually mini profile is a global modal, so put it outside "isSearching" check or keep structure.
               Actually better to have it always available.
               So I will close the "Normal View" fragment here.
            */}
          </>
        )}

        {/* User Mini Profile Modal - always available */}
        {selectedUser && (
          <UserMiniProfileModal
            userId={selectedUser.id}
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onViewProfile={() => {
              setSelectedUser(null);
              if (onUserProfile) onUserProfile(selectedUser.id);
            }}
            onMessage={() => {
              setSelectedUser(null);
              if (onMessage) onMessage(selectedUser);
            }}
          />
        )}
        {/* City Selector Modal */}
        {showCitySelector && (
          <CitySelector
            value={[location]}
            onChange={handleCityChange}
            onClose={() => setShowCitySelector(false)}
            maxSelection={1}
            mode="single"
          />
        )}

      </main>
    </div>
  );
};

export default HomeScreen;
