import React, { useState, useEffect, useRef } from 'react';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { task } from '../services/api';

interface NavigationScreenProps {
  onBack: () => void;
}

const NavigationScreen: React.FC<NavigationScreenProps> = ({ onBack }) => {
  const [quests, setQuests] = useState<any[]>([]);
  const [activeQuest, setActiveQuest] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- Effects ---
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const res = await task.getMyTasks();

        // Map backend data to UI format
        const mappedQuests = res.data.map((t: any, index: number) => ({
          id: t.id || index,
          executionId: t.executionId,
          type: index === 0 ? 'main' : 'side', // Assume first is main for now
          title: (index === 0 ? '目标: ' : '奇遇: ') + t.title,
          originalTitle: t.title, // Keep raw title
          icon: index === 0 ? 'flag' : 'auto_awesome',
          color: index === 0 ? 'text-[#f97316]' : 'text-[#7f13ec]',
          // Mock position for static map display
          position: {
            top: `${30 + (index * 10) % 50}% `,
            left: `${20 + (index * 20) % 60}% `
          },
          distance: (t.stats?.distance || (0.5 + Math.random() * 2).toFixed(1)) + ' km',
          progress: t.progress,
          status: t.status
        }));

        setQuests(mappedQuests);
        if (mappedQuests.length > 0) {
          setActiveQuest(mappedQuests[0]);
          setShowToast(true);
        }
      } catch (error) {
        console.error('Failed to fetch tasks', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // --- Handlers ---
  const handleQuestClick = (quest: any) => {
    setActiveQuest(quest);
  };

  const openSideQuests = () => {
    console.log('Open side quests list');
    // TODO: Navigate to quest list
  };

  const handleMenu = () => {
    onBack();
  };

  const navigateToQuest = () => {
    console.log('Navigating to:', activeQuest.title);
  };

  return (
    <div className="bg-[#191022] text-white font-display overflow-hidden h-screen w-full relative group/design-root">

      {/* Background Map */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#0f0b15]">
        <div className="w-full h-full opacity-60">
          <CapacitorImage
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5eneihWLaL8kBP_cDZ0TKxZyZoIWtGCGQHp2pmilj_xMhekiKAtBQ2OYvJm3Jg-fU_gNqyxyZvUuyzfjL4on2cnh-0Ha23Aiz-HcnwjCFUJ6aVuXTxniexTn5-sieNBEt5PN5B5tbekxxU5w8DUGTmkewtgwPd_-wlmXPvgDRbYquv_MrowceedO_vasLTgWkZR_jBETlc98J0To4ci3k5SIilpIOLDcrWa3OYaeL1Xv_s_9DtVgh2e3HH7KTAVYFUdzLHhPBxqk"
            className="w-full h-full object-cover"
            style={{
              filter: 'grayscale(100%) invert(90%) hue-rotate(180deg) brightness(0.8) contrast(1.2)'
            }}
            alt="Map Background"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#191022]/80 via-transparent to-[#191022]/90 pointer-events-none"></div>
      </div>

      {/* Map Markers Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">

        {/* User Location */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-gradient-to-t from-blue-500/20 to-transparent rounded-full transform -translate-y-6" style={{ clipPath: 'polygon(50% 50%, 0 0, 100% 0)' }}></div>
          <div className="w-4 h-4 bg-white rounded-full border-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] relative z-20"></div>
          <div className="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-ping z-10"></div>
        </div>

        {loading && quests.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-lg z-10">
            Loading quests...
          </div>
        )}

        {!loading && quests.map((quest) => (
          <div
            key={quest.id}
            onClick={() => handleQuestClick(quest)}
            className="absolute flex flex-col items-center group cursor-pointer pointer-events-auto transition-transform hover:scale-110 z-20"
            style={{ top: quest.position.top, left: quest.position.left }}
          >
            {quest.type === 'main' ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute w-full h-full bg-[#f97316]/30 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                <span className="material-symbols-outlined text-5xl text-[#f97316] z-20" style={{ fontVariationSettings: "'FILL' 1", filter: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.5))' }}>location_on</span>
                <div className="absolute top-2 text-black font-bold text-xs z-30">!</div>
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-[#7f13ec] z-20" style={{ fontVariationSettings: "'FILL' 1", filter: 'drop-shadow(0 0 20px rgba(127, 19, 236, 0.5))' }}>location_on</span>
              </div>
            )}

            <div
              className={`mt - 1 px - 2 py - 1 bg - black / 80 backdrop - blur - sm rounded - lg border text - xs font - bold whitespace - nowrap ${quest.type === 'main' ? 'border-[#f97316]/30 text-[#f97316]' : 'border-[#7f13ec]/30 text-purple-200'
                } `}
            >
              {quest.title}
            </div>
          </div>
        ))}

      </div>

      {/* UI Layer */}
      <div className="relative z-20 flex flex-col justify-between h-full pointer-events-none">

        <div className="flex flex-col items-center pt-12 px-6 pointer-events-auto">

          {/* Toast Notification */}
          {showToast && (
            <div className="bg-[#191022]/80 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2 shadow-lg flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <span className="material-symbols-outlined text-[#7f13ec] text-[18px]">auto_awesome</span>
              <span className="text-sm font-medium text-gray-200">奇遇任务已收纳至任务栏</span>
            </div>
          )}

          {/* Side Quest Button (Top Right) */}
          <div className="absolute top-12 right-6">
            <button
              onClick={openSideQuests}
              className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-[#191022]/90 backdrop-blur-xl border border-[#7f13ec]/50 text-[#7f13ec] shadow-[0_0_20px_-5px_rgba(127,19,236,0.5)] hover:bg-[#7f13ec] hover:text-white transition-all duration-300"
              style={{ animation: 'pulse-glow 2s infinite' }}
            >
              <span className="material-symbols-outlined text-[24px]">history_edu</span>
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#f97316] rounded-full border border-[#191022]"></span>
            </button>
            <span className="absolute top-14 right-0 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mt-1 pointer-events-none">
              查看奇遇
            </span>
          </div>

          {/* Menu Button (Top Left) */}
          <div className="absolute top-12 left-6">
            <button
              onClick={handleMenu}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#191022]/50 backdrop-blur-md text-white/80 hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>

        {/* Bottom Card */}
        <div className="w-full px-4 pb-8 pointer-events-auto">
          {loading ? (
            <div className="w-full bg-[#211c27]/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-white/5 flex items-center justify-center text-gray-400">
              <span className="animate-pulse">正在扫描区域信号...</span>
            </div>
          ) : activeQuest ? (
            <div
              onClick={navigateToQuest}
              className="w-full bg-[#211c27]/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden cursor-pointer hover:bg-[#2a2430] transition-colors"
            >
              {/* Progress Bar Top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
                <div className="h-full w-2/3 bg-[#f97316] transition-all duration-500" style={{ width: `${activeQuest.progress || 0}% ` }}></div>
              </div>

              {/* Icon */}
              <div className={`w - 12 h - 12 rounded - lg bg - gradient - to - br flex items - center justify - center shrink - 0 border ${activeQuest.type === 'main' ? 'from-orange-900 to-gray-800 border-[#f97316]/20' : 'from-purple-900 to-gray-800 border-[#7f13ec]/20'
                } `}>
                <span className={`material - symbols - outlined text - [24px] ${activeQuest.type === 'main' ? 'text-[#f97316]' : 'text-[#7f13ec]'} `}>
                  {activeQuest.icon}
                </span>
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text - xs font - bold uppercase tracking - wider ${activeQuest.type === 'main' ? 'text-[#f97316]' : 'text-[#7f13ec]'} `}>
                    {activeQuest.type === 'main' ? '主线进行中' : '奇遇任务'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                  <span className="text-xs text-gray-400">{activeQuest.distance}</span>
                </div>
                <h3 className="text-base font-bold text-white leading-tight truncate">
                  {activeQuest.originalTitle || activeQuest.title}
                </h3>
              </div>

              <button className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
                <span className="material-symbols-outlined text-[24px]">chevron_right</span>
              </button>
            </div>
          ) : (
            <div className="w-full bg-[#211c27]/95 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/5 flex flex-col items-center justify-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">map</span>
              <span className="text-sm">当前区域没有已接取的任务</span>
            </div>
          )}
        </div>

      </div>

      <style>{`
@keyframes pulse - glow {
  0 %, 100 % { box- shadow: 0 0 0 0px rgba(127, 19, 236, 0.7);
}
50 % { box- shadow: 0 0 0 10px rgba(127, 19, 236, 0); }
        }
`}</style>
    </div>
  );
};

export default NavigationScreen;
