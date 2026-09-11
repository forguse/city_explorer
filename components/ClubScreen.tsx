import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { club as clubApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ClubScreenProps {
  onBack: () => void;
  onOpenClub?: (club: any) => void;
  onOpenCreate?: () => void;
  onOpenMy?: () => void;
  onOpenActivity?: () => void;
}

const ClubScreen: React.FC<ClubScreenProps> = ({ onBack, onOpenClub, onOpenCreate, onOpenMy, onOpenActivity }) => {
  const [keyword, setKeyword] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showCityPicker, setShowCityPicker] = useState(false);

  // API data states
  const [clubs, setClubs] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);  // 只用于首次加载
  const [searching, setSearching] = useState(false);  // 搜索时的加载状态
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // Available cities (extracted from clubs)
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.id || currentUser._id;

  // Debounce keyword for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Fetch clubs with search
  const fetchClubs = useCallback(async (searchKeyword?: string, city?: string) => {
    try {
      const response = await clubApi.getAll({ keyword: searchKeyword, city: city || undefined });
      // Handle both old format (array) and new format ({ clubs, total })
      const clubsData = Array.isArray(response.data) ? response.data : response.data.clubs;
      setClubs(clubsData);
      return clubsData;
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
      return [];
    }
  }, []);

  // 初始加载：获取所有社团和城市列表
  useEffect(() => {
    const initData = async () => {
      setInitialLoading(true);
      try {
        const response = await clubApi.getAll({});
        const clubsData = Array.isArray(response.data) ? response.data : response.data.clubs;
        setClubs(clubsData);
        // 提取所有城市用于筛选
        const cities = [...new Set(clubsData.map((c: any) => c.city).filter(Boolean))] as string[];
        setAvailableCities(cities);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    initData();
  }, []);

  // 搜索时重新获取数据（不影响输入框）
  useEffect(() => {
    // 跳过初始加载
    if (initialLoading) return;
    // 如果没有搜索条件，不需要重新获取
    if (!debouncedKeyword && !selectedCity) return;

    const searchData = async () => {
      setSearching(true);
      try {
        await fetchClubs(debouncedKeyword, selectedCity);
      } catch (err) {
        console.error('Failed to search:', err);
      } finally {
        setSearching(false);
      }
    };
    searchData();
  }, [debouncedKeyword, selectedCity, fetchClubs, initialLoading]);

  // 清除搜索条件时重新获取所有数据
  useEffect(() => {
    if (initialLoading) return;
    if (!debouncedKeyword && !selectedCity) {
      fetchClubs();
    }
  }, [debouncedKeyword, selectedCity, fetchClubs, initialLoading]);

  // Check if we're in search mode
  const isSearching = debouncedKeyword.trim() !== '' || selectedCity !== '';

  // My clubs (ones user has joined)
  const myClubs = useMemo(() =>
    clubs.filter((club: any) =>
      club.members?.some((m: any) =>
        (typeof m === 'string' ? m : m._id) === currentUserId
      )
    ),
    [clubs, currentUserId]
  );

  const recommended = useMemo(() =>
    clubs.filter((club: any) =>
      !club.members?.some((m: any) =>
        (typeof m === 'string' ? m : m._id) === currentUserId
      )
    ).slice(0, 4),
    [clubs, currentUserId]
  );

  // Loading state - 只在首次加载时显示全屏loading
  if (initialLoading) {
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
            <h1 className="text-lg font-bold flex-1">社团</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 w-full">
          <div className="grid grid-cols-4 gap-3 w-full">
            <button
              onClick={() => setShowSearch((prev) => !prev)}
              className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <span className="material-symbols-outlined text-[#0ea5e9]">search</span>
              <span className="text-[11px] text-gray-600 dark:text-gray-300">搜索</span>
            </button>
            <button
              onClick={onOpenActivity}
              className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <span className="material-symbols-outlined text-[#f97316]">local_activity</span>
              <span className="text-[11px] text-gray-600 dark:text-gray-300">活动</span>
            </button>
            <button
              onClick={onOpenCreate}
              className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <span className="material-symbols-outlined text-[#10b981]">group_add</span>
              <span className="text-[11px] text-gray-600 dark:text-gray-300">创建</span>
            </button>
            <button
              onClick={onOpenMy}
              className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <span className="material-symbols-outlined text-[#6366f1]">verified</span>
              <span className="text-[11px] text-gray-600 dark:text-gray-300">我的</span>
            </button>
          </div>

          {showSearch && (
            <div className="bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm w-full">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">search</span>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索社团"
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                {keyword && (
                  <button
                    onClick={() => setKeyword('')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
                  </button>
                )}
                <button
                  onClick={() => setShowCityPicker(true)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${selectedCity
                      ? 'bg-[#0ea5e9] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span>{selectedCity || '城市'}</span>
                </button>
              </div>
              {selectedCity && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">筛选:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0ea5e9]/10 text-[#0ea5e9] rounded-full text-xs">
                    {selectedCity}
                    <button onClick={() => setSelectedCity('')} className="hover:text-[#0ea5e9]/70">
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* City Picker Modal */}
          {showCityPicker && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
              <div className="bg-white dark:bg-[#2d241c] rounded-t-2xl w-full max-h-[60vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-bold">选择城市</h3>
                  <button
                    onClick={() => setShowCityPicker(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[50vh]">
                  <button
                    onClick={() => {
                      setSelectedCity('');
                      setShowCityPicker(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-colors ${!selectedCity
                        ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    全部城市
                  </button>
                  {availableCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setShowCityPicker(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-colors ${selectedCity === city
                          ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      {city}
                    </button>
                  ))}
                  {availableCities.length === 0 && (
                    <div className="text-center text-gray-400 py-8">暂无可选城市</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 搜索结果 - 当有搜索关键词或城市筛选时显示 */}
          {isSearching ? (
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  搜索结果
                  {searching && (
                    <div className="w-4 h-4 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                  )}
                </h2>
                <span className="text-xs text-gray-400">{clubs.length} 个</span>
              </div>
              {clubs.length === 0 && !searching ? (
                <div className="text-center text-gray-400 text-sm py-8 bg-white dark:bg-[#2d241c] rounded-2xl border border-gray-100 dark:border-gray-800">
                  <span className="material-symbols-outlined text-3xl text-gray-300 mb-2 block">search_off</span>
                  未找到相关社团
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 w-full">
                  {clubs.map(club => {
                    const isMember = club.members?.some((m: any) =>
                      (typeof m === 'string' ? m : m._id) === currentUserId
                    );
                    return (
                      <button
                        key={club._id}
                        onClick={() => onOpenClub?.(club)}
                        className="text-left bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm"
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
                              <span className="material-symbols-outlined text-gray-400 text-3xl">groups</span>
                            </div>
                          )}
                          {isMember && (
                            <div className="absolute top-2 right-2 bg-[#0ea5e9] text-white text-[10px] px-2 py-0.5 rounded-full z-10">
                              已加入
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm truncate flex-1">{club.name}</h3>
                          </div>
                          <p className="text-[10px] text-[#0ea5e9] mt-0.5">{club.city || '未知城市'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{club.description || '暂无介绍'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 我的社团 */}
              <div className="bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm w-full">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold">我的社团</h2>
                  <span className="text-[11px] text-gray-400">{myClubs.length} 个</span>
                </div>
                {myClubs.length === 0 ? (
                  <div className="text-xs text-gray-400 py-4 text-center">暂未加入社团</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {myClubs.map((club) => (
                      <button
                        key={club._id}
                        onClick={() => onOpenClub?.(club)}
                        className="text-left rounded-2xl border bg-white dark:bg-[#2d241c] border-gray-100 dark:border-gray-800 hover:border-gray-200 px-3 py-2 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                            {club.coverUrl ? (
                              <CapacitorImage src={getImageUrl(club.coverUrl)} alt={club.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-400 text-sm">groups</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{club.name}</p>
                            <p className="text-[10px] text-gray-400">{club.city || '未知城市'} · {club.members?.length || 0} 位成员</p>
                          </div>
                          <span className="material-symbols-outlined text-gray-300 text-lg">chevron_right</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 社团推荐 */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold">社团推荐</h2>
                  <span className="text-xs text-gray-400">{recommended.length} 个</span>
                </div>
                {recommended.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">暂无推荐</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {recommended.map(club => (
                      <button
                        key={club._id}
                        onClick={() => onOpenClub?.(club)}
                        className="text-left bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
                          {club.coverUrl ? (
                            <CapacitorImage
                              src={getImageUrl(club.coverUrl)}
                              className="w-full h-full object-cover"
                              alt={club.name}
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-gray-400 text-3xl">groups</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm truncate flex-1">{club.name}</h3>
                          </div>
                          <p className="text-[10px] text-[#0ea5e9] mt-0.5">{club.city || '未知城市'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{club.description || '暂无介绍'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ClubScreen;
