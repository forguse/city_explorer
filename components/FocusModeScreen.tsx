import React, { useState, useEffect } from 'react';
import { task as taskApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface FocusModeScreenProps {
  onBack: () => void;
}

interface CurrentQuest {
  title: string;
  progress: string;
  thumbnail: string;
  target: {
    name: string;
    distance: string;
  };
}

const FocusModeScreen: React.FC<FocusModeScreenProps> = ({ onBack }) => {
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [currentQuest, setCurrentQuest] = useState<CurrentQuest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentTask = async () => {
      try {
        setLoading(true);
        // Using getMyTasks to find the latest active task
        const response = await taskApi.getMyTasks();
        const myTasks = response.data;
        const activeTask = myTasks.length > 0 ? myTasks[0] : null;

        if (activeTask) {
          setCurrentQuest({
            title: activeTask.title,
            // Assuming progress is a percentage or calculate from checkpoints
            progress: `进度 ${activeTask.progress}% • ${activeTask.status === 'completed' ? '已完成' : '进行中'}`,
            thumbnail: activeTask.image || 'https://via.placeholder.com/150',
            target: {
              name: '下一站目标', // In a real app, this would come from the next unvisited node
              distance: '计算中...' // Real app would calculate distance
            }
          });
        }
      } catch (err) {
        console.error('Failed to fetch current task for focus mode:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentTask();
  }, []);

  const exitFocusMode = () => {
    setIsFocusMode(false);
    setTimeout(onBack, 500);
  };

  const handleMapAction = (action: string) => {
    console.log('Map action:', action);
  };

  if (loading) {
    return (
      <div className="bg-[#181411] h-screen w-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ee8c2b] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#181411] font-display text-white overflow-hidden h-screen w-full flex flex-col relative transition-colors duration-300">

      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-40 bg-[#181411]/80 backdrop-blur-md border-b border-white/5 pt-safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight text-white">专注模式</h1>
          <button className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-white">settings</span>
          </button>
        </div>
      </header>

      {/* Focus Mode Toast */}
      {isFocusMode && (
        <div className="absolute top-20 left-0 right-0 z-30 flex justify-center pointer-events-none px-4 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-[#27211c]/90 backdrop-blur border border-white/10 shadow-lg rounded-full py-2 px-4 flex items-center gap-2 animate-pulse">
            <span className="material-symbols-outlined text-[#ee8c2b] text-[18px]">navigation</span>
            <span className="text-sm font-medium text-gray-200">已进入专注模式: {currentQuest ? '正在导航中' : '暂无进行中任务'}</span>
          </div>
        </div>
      )}

      <main className="relative w-full flex-1 overflow-hidden bg-[#121212]">

        {/* Map Background */}
        <div className="absolute inset-0 w-full h-full">
          <div className={`w-full h-full transition-all duration-700 ${isFocusMode ? 'opacity-40 grayscale contrast-125' : 'opacity-100'}`}>
            <CapacitorImage
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVqww673sJTFs1_fc6IxPyzee-NJT7BhpR_jfImNrx6Fskc4PvH6sidSgTNcCXqw6OyEvf1J_4hPdn1jqyaE0m1VqHu_9stHdwwYL8JsSFRDDtXs9LfBQKdg3DCWYOidasbXmrBEK9IS1QFHggegrGmQWD8vnvqFKg7zmAs5jb4IteRMTAV4VgVHk-PCE9l9eUDMx3OPJ9rcBDl_tp9MYyVNxj6ImptbBhdXwMkWsHUlf2WcuL0MXD__LXTtLArf8WnLXMz3Eo2qY"
              className="w-full h-full object-cover"
              alt="Map Background"
            />
          </div>
          {isFocusMode && <div className="absolute inset-0 bg-[#121212]/70 transition-opacity duration-700"></div>}
        </div>

        {/* Existing POIs (Background Layer) */}
        <div className={`absolute inset-0 pointer-events-none z-10 transition-all duration-500 ${isFocusMode ? 'opacity-30 grayscale' : 'opacity-100'}`}>
          <div className="absolute top-[20%] left-[15%] flex flex-col items-center gap-1">
            <div className="size-10 bg-[#2dd4bf] rounded-full flex items-center justify-center shadow-lg border-2 border-[#121212]">
              <span className="text-xs font-bold text-[#121212]">12</span>
            </div>
          </div>
          <div className="absolute top-[40%] right-[25%]">
            <span className="material-symbols-outlined text-[#2dd4bf] text-3xl drop-shadow-md">location_on</span>
          </div>
        </div>

        {/* Navigation Route & Markers (Focus Layer) */}
        {isFocusMode && currentQuest && (
          <div className="absolute inset-0 pointer-events-none z-20 animate-in fade-in duration-700">

            <svg className="w-full h-full absolute inset-0 drop-shadow-[0_0_8px_rgba(238,140,43,0.6)]">
              <path
                className="path-animation"
                d="M 120 300 Q 180 350 200 400 T 280 550"
                fill="none"
                stroke="#ee8c2b"
                strokeDasharray="8 6"
                strokeLinecap="round"
                strokeWidth="4"
              ></path>
            </svg>

            {/* Start Point */}
            <div className="absolute top-[280px] left-[105px] flex flex-col items-center group cursor-pointer pointer-events-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-[#ee8c2b] rounded-full animate-ping opacity-75"></div>
                <div className="relative size-8 bg-[#27211c] border-2 border-[#ee8c2b] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(238,140,43,0.5)]">
                  <span className="material-symbols-outlined text-[#ee8c2b] text-sm">flag</span>
                </div>
              </div>
              <span className="mt-2 px-2 py-0.5 bg-[#27211c]/90 text-[#ee8c2b] text-xs font-bold rounded-md backdrop-blur-sm border border-[#ee8c2b]/20">起点: 当前位置</span>
            </div>

            {/* User Position */}
            <div className="absolute top-[385px] left-[185px] flex flex-col items-center pointer-events-auto">
              <div className="relative size-4 bg-[#ee8c2b] rounded-full border-2 border-white shadow-[0_0_15px_rgba(238,140,43,0.5)]"></div>
            </div>

            {/* Target Point */}
            <div className="absolute top-[530px] left-[265px] flex flex-col items-center group cursor-pointer pointer-events-auto">
              <div className="relative mb-1">
                <div className="absolute -inset-2 bg-[#ee8c2b]/20 rounded-full animate-pulse"></div>
                <div className="relative size-12 bg-[#ee8c2b] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(238,140,43,0.5)] border-2 border-white text-[#27211c]">
                  <span className="material-symbols-outlined text-2xl">temple_buddhist</span>
                </div>
                <div className="absolute -top-1 -right-1 bg-white text-[#ee8c2b] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#ee8c2b]">Target</div>
              </div>
              <div className="flex flex-col items-center">
                <span className="px-3 py-1 bg-[#ee8c2b] text-[#27211c] text-sm font-bold rounded-lg shadow-lg">{currentQuest.target.name}</span>
                <span className="text-[10px] font-medium text-[#ee8c2b] mt-0.5 bg-black/40 px-1.5 rounded">距离 {currentQuest.target.distance}</span>
              </div>
            </div>

          </div>
        )}

        {/* Map Controls */}
        <div className="absolute right-4 bottom-36 flex flex-col gap-3 z-30">
          <div className="flex flex-col bg-[#27211c]/90 backdrop-blur rounded-xl overflow-hidden border border-white/5 shadow-lg">
            <button className="size-12 flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 border-b border-white/5" onClick={() => handleMapAction('zoomIn')}>
              <span className="material-symbols-outlined">add</span>
            </button>
            <button className="size-12 flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20" onClick={() => handleMapAction('zoomOut')}>
              <span className="material-symbols-outlined">remove</span>
            </button>
          </div>
          <button className="size-12 bg-[#27211c]/90 backdrop-blur rounded-full flex items-center justify-center text-[#ee8c2b] border border-[#ee8c2b]/30 shadow-lg hover:bg-white/5" onClick={() => handleMapAction('recenter')}>
            <span className="material-symbols-outlined rotate-45">navigation</span>
          </button>
        </div>

        {/* Bottom Card */}
        <div className="absolute bottom-0 left-0 w-full p-6 pb-10 z-40 bg-gradient-to-t from-[#181411] via-[#181411]/80 to-transparent">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 max-w-[200px]">
              {currentQuest ? (
                <div className="bg-[#27211c]/60 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                    <CapacitorImage className="w-full h-full object-cover" src={getImageUrl(currentQuest.thumbnail)} alt="Thumbnail" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{currentQuest.title}</h3>
                    <p className="text-xs text-gray-400 truncate">{currentQuest.progress}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#27211c]/60 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="text-xs text-gray-400 text-center">暂无进行中的任务</p>
                </div>
              )}
            </div>

            <button
              onClick={exitFocusMode}
              className="h-14 bg-[#ee8c2b] hover:bg-orange-600 text-[#181411] rounded-full px-6 pl-5 flex items-center gap-3 shadow-[0_0_15px_rgba(238,140,43,0.5)] transition-transform active:scale-95"
            >
              <div className="size-8 bg-black/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </div>
              <span className="text-base font-bold whitespace-nowrap">退出专注</span>
            </button>
          </div>
        </div>

      </main>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
        .path-animation {
          animation: dash 1s linear infinite;
        }
        .pt-safe-top { padding-top: env(safe-area-inset-top, 20px); }
      `}</style>
    </div>
  );
};

export default FocusModeScreen;
