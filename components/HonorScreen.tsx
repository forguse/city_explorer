
import React, { useState, useEffect, useMemo } from 'react';
import { user as userApi, reward as rewardApi } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface HonorScreenProps {
  onBack: () => void;
  onAchievementSelect?: (achievement: any) => void;
}

const HonorScreen: React.FC<HonorScreenProps> = ({ onBack, onAchievementSelect }) => {
  const [currentTab, setCurrentTab] = useState<'badges' | 'albums'>('badges');
  const [userData, setUserData] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch User Profile
        const userRes = await userApi.getMe();
        const user = userRes.data;

        // 2. Fetch User Badges
        const badgesRes = await rewardApi.getMyRewards({ type: 'badge' });
        const earnedBadges = badgesRes.data;

        const badgesList = earnedBadges.map((ur: any) => ({
          id: ur.reward._id,
          name: ur.reward.medal || ur.reward.title,
          icon: 'verified',
          unlocked: true,
          color: 'from-emerald-500 to-teal-600',
          shadow: 'rgba(16,185,129,0.4)',
          image: ur.reward.image
        }));

        // Fill with locked slots
        const totalBadgeSlots = Math.max(badgesList.length + 3, 9);
        for (let i = badgesList.length; i < totalBadgeSlots; i++) {
          badgesList.push({
            id: `locked-badge-${i}`,
            name: '???',
            icon: 'lock',
            unlocked: false
          });
        }

        // 3. Fetch User Albums
        const albumsRes = await rewardApi.getMyRewards({ type: 'album' });
        const earnedAlbums = albumsRes.data;

        const getRarityLabel = (rarity: number) => {
          if (rarity >= 5) return 'SSR';
          if (rarity >= 4) return 'SR';
          return 'R';
        };

        const albumsList = earnedAlbums.map((ur: any) => ({
          id: ur.reward._id,
          title: ur.reward.title,
          location: ur.reward.location || '未知地点',
          rarity: getRarityLabel(ur.reward.rarity),
          image: ur.reward.image,
          locked: false
        }));

        // Fill with locked slots
        const totalAlbumSlots = Math.max(albumsList.length + 2, 4);
        for (let i = albumsList.length; i < totalAlbumSlots; i++) {
          albumsList.push({
            id: `locked-album-${i}`,
            locked: true
          });
        }

        setUserData({
          name: user.username,
          title: user.bio || '城市探索者',
          avatar: user.avatarUrl || 'https://via.placeholder.com/150',
          level: user.level || 1,
          badgesUnlocked: earnedBadges.length,
          albumsUnlocked: earnedAlbums.length,
          badgesTotal: 50
        });
        setBadges(badgesList);
        setAlbums(albumsList);

      } catch (err) {
        console.error('Failed to load honor data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const progressPercent = useMemo(() => {
    if (!userData) return 0;
    return (userData.badgesUnlocked / userData.badgesTotal) * 100;
  }, [userData]);

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'SSR':
        return {
          border: 'border-yellow-500/30 hover:border-yellow-500/60',
          text: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          tagBorder: 'border-yellow-500/50',
          shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.1)] hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]'
        };
      case 'SR':
        return {
          border: 'border-sky-500/30 hover:border-sky-500/60',
          text: 'text-sky-400',
          bg: 'bg-sky-500/10',
          tagBorder: 'border-sky-500/50',
          shadow: ''
        };
      case 'R':
        return {
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          bg: 'bg-gray-500/10',
          tagBorder: 'border-gray-500/50',
          shadow: ''
        };
      default:
        return { border: '', text: '', bg: '', tagBorder: '', shadow: '' };
    }
  };

  if (loading || !userData) {
    return <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center text-white">加载荣誉中...</div>
  }

  return (
    <div className="bg-[#0b0c10] text-slate-900 dark:text-white overflow-x-hidden transition-colors duration-300 font-display min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl overflow-hidden bg-tech-pattern">

        <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0c10]/80 border-b border-white/10">
          <div className="flex items-center p-4 justify-between h-14">
            <button onClick={onBack} className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white">
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h2 className="text-white text-lg font-bold tracking-tight">荣誉收藏室</h2>
            <button className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white">
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>
        </header>

        <section className="relative flex flex-col items-center pt-8 pb-6 px-6 text-white">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#13a4ec]/10 rounded-full blur-3xl -z-10"></div>

          <div className="relative group cursor-pointer">
            <div className="relative w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-[#13a4ec] via-[#66fcf1] to-[#13a4ec]/30 shadow-[0_0_20px_rgba(102,252,241,0.3)]">
              <CapacitorImage src={getImageUrl(userData.avatar)} className="w-full h-full rounded-full object-cover border-4 border-[#0b0c10]" alt="User Avatar" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#0b0c10] p-1 rounded-full">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-[#0b0c10] text-xs font-bold px-2 py-0.5 rounded-full border border-[#0b0c10]">
                Lv.{userData.level}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 text-shadow-glow">
              {userData.name}
              <span className="material-symbols-outlined text-[#66fcf1] text-xl">verified</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium">{userData.title}</p>
          </div>

          <div className="w-full mt-6 bg-[#1f2833]/50 rounded-xl p-4 border border-[#66fcf1]/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-sm">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[#c5c6c7] text-sm font-medium">总收集进度</span>
              <span className="text-[#66fcf1] text-sm font-bold">{userData.badgesUnlocked}<span className="text-slate-500 text-xs font-normal">/{userData.badgesTotal}</span></span>
            </div>
            <div className="relative h-2.5 w-full bg-[#0b0c10] rounded-full overflow-hidden border border-white/5">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#45a29e] to-[#66fcf1] rounded-full shadow-[0_0_10px_rgba(102,252,241,0.5)] transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-[#45a29e] mt-2 text-right font-mono">NEXT_LEVEL_IN: 3 BADGES</p>
          </div>
        </section>

        <div className="px-4 pb-2 sticky top-14 z-40 bg-[#0b0c10]/95 backdrop-blur-sm pt-2">
          <div className="flex p-1 bg-[#1f2833] rounded-lg border border-white/5">
            <button
              className={`flex-1 py-2.5 text-center text-sm font-bold rounded-md transition-all tracking-wide ${currentTab === 'badges' ? 'bg-[#45a29e] text-white shadow-lg shadow-[#45a29e]/20' : 'text-[#c5c6c7] hover:text-white'}`}
              onClick={() => setCurrentTab('badges')}
            >
              勋章墙
            </button>
            <button
              className={`flex-1 py-2.5 text-center text-sm font-bold rounded-md transition-all tracking-wide ${currentTab === 'albums' ? 'bg-[#45a29e] text-white shadow-lg shadow-[#45a29e]/20' : 'text-[#c5c6c7] hover:text-white'}`}
              onClick={() => setCurrentTab('albums')}
            >
              像素画册
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 px-4 space-y-8 mt-4 no-scrollbar">

          {currentTab === 'badges' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-bold flex items-center gap-2">
                  <span className="w-1 h-5 bg-[#66fcf1] rounded-full shadow-[0_0_10px_#66fcf1]"></span>
                  近期成就
                </h3>
                <button className="text-xs text-[#66fcf1] font-medium hover:text-[#66fcf1]/80 font-mono">VIEW_ALL</button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => badge.unlocked && onAchievementSelect?.(badge)}
                    className={`group flex flex-col items-center gap-3 ${!badge.unlocked ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-300' : ''}`}
                  >
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full text-[#1f2833] fill-current drop-shadow-xl" viewBox="0 0 100 100">
                        <path d="M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z" stroke={badge.unlocked ? 'rgba(102,252,241,0.3)' : 'rgba(255,255,255,0.05)'} strokeWidth="2"></path>
                      </svg>

                      {badge.unlocked ? (
                        <div
                          className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br ${badge.color}`}
                          style={{ boxShadow: `0 0 15px ${badge.shadow}`, overflow: 'hidden' }}
                        >
                          {badge.image ? (
                            <CapacitorImage src={getImageUrl(badge.image)} alt={badge.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-white text-3xl">{badge.icon}</span>
                          )}
                        </div>
                      ) : (
                        <div className="relative z-10 w-10 h-10 flex items-center justify-center border-2 border-dashed border-[#45a29e] rounded-full">
                          <span className="material-symbols-outlined text-[#45a29e] text-xl">lock</span>
                        </div>
                      )}
                    </div>

                    <span className={`text-xs font-bold tracking-wide transition-colors ${badge.unlocked ? 'text-[#c5c6c7] group-hover:text-[#66fcf1]' : 'text-slate-600'}`}>
                      {badge.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'albums' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-bold flex items-center gap-2">
                  <span className="w-1 h-5 bg-purple-500 rounded-full shadow-[0_0_10px_purple]"></span>
                  珍藏画册
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">SSR</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">SR</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {albums.map((album) => (
                  <React.Fragment key={album.id}>
                    {!album.locked ? (
                      <div
                        className={`group relative bg-[#1f2833] rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 border border-white/5 hover:border-[#66fcf1]/30 ${getRarityStyles(album.rarity).shadow}`}
                      >
                        <div className="absolute top-2 left-2 z-10">
                          <span
                            className={`px-2 py-1 rounded backdrop-blur-sm text-xs font-bold shadow-sm bg-black/60 border ${getRarityStyles(album.rarity).text} ${getRarityStyles(album.rarity).tagBorder}`}
                          >
                            {album.rarity}
                          </span>
                        </div>
                        <div className="aspect-[3/4] w-full overflow-hidden bg-[#0b0c10]">
                          <div className="w-full h-full group-hover:scale-110 transition-transform duration-700 bg-[#0b0c10]">
                            <CapacitorImage
                              src={getImageUrl(album.image)}
                              className="w-full h-full object-cover image-pixelated filter brightness-90 group-hover:brightness-110"
                              style={{ imageRendering: 'pixelated' }}
                              alt={album.title}
                            />
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-b from-[#1f2833] to-[#0b0c10]">
                          <h4 className="text-white font-bold text-sm truncate">{album.title}</h4>
                          <p className="text-[#45a29e] text-xs mt-1 flex items-center gap-1 font-mono">
                            <span className="material-symbols-outlined text-[12px]">location_on</span>
                            {album.location}
                          </p>
                        </div>
                        {album.rarity === 'SSR' && (
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        )}
                      </div>
                    ) : (
                      <div className="group relative bg-[#1f2833] rounded-lg overflow-hidden border border-white/5 border-dashed flex flex-col items-center justify-center p-4 min-h-[200px]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
                          <span className="material-symbols-outlined text-[#45a29e] text-3xl">lock</span>
                        </div>
                        <p className="text-[#888] text-xs font-medium text-center font-mono">LOCKED<br />DATA SEGMENT</p>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`
        .bg-tech-pattern {
          background-color: #0b0c10;
          background-image: 
            radial-gradient(#1f2833 1.5px, transparent 1.5px), 
            radial-gradient(#1f2833 1.5px, transparent 1.5px);
          background-size: 20px 20px;
          background-position: 0 0, 10px 10px;
        }
        .text-shadow-glow {
          text-shadow: 0 0 10px rgba(102,252,241,0.3);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default HonorScreen;
