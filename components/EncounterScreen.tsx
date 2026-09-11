import React, { useState } from 'react';
import { encounter as encounterApi } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface EncounterScreenProps {
  onBack: () => void;
  // encounter can be passed from parent if already fetched, or we could fetch here.
  // Given the flow, it's likely passed when triggered.
  encounter?: any;
  onAccept?: () => void;
  onDecline?: () => void;
  onHold?: () => void;
}

const EncounterScreen: React.FC<EncounterScreenProps> = ({ onBack, encounter: initialEncounter, onAccept, onDecline, onHold }) => {
  const [loading, setLoading] = useState(false);

  // If initialEncounter is not provided, we might want to fetch a random one or show loading/error
  // For this refactor, we assume the parent handles the "triggering" logic and passes the encounter data
  // or we use the mock data as a fallback only if absolutely necessary, but request says REMOVE mock.

  const mission = initialEncounter;

  if (!mission) {
    return (
      <div className="bg-[#f8f7f5] dark:bg-[#111618] h-screen w-full flex items-center justify-center text-gray-500">
        未触发任何奇遇
      </div>
    )
  }

  const handleAccept = async () => {
    setLoading(true);
    try {
      // Call API to accept
      await encounterApi.accept(mission._id || mission.id);
      if (onAccept) onAccept();
    } catch (err) {
      console.error('Failed to accept encounter:', err);
      alert('接受任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#111618] text-[#1b130d] dark:text-gray-100 font-display transition-colors duration-200 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden border-x border-gray-100 dark:border-gray-800 bg-[#f8f7f5] dark:bg-[#111618] shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center bg-[#f8f7f5]/95 dark:bg-[#111618]/95 backdrop-blur-sm p-4 justify-between border-b border-gray-100 dark:border-gray-800">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-gray-800 dark:text-gray-200">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-center text-gray-900 dark:text-white">奇遇</h2>
          <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-gray-800 dark:text-gray-200">more_horiz</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6 pb-12">

          <div className="px-4 pt-6 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#0ea5e9] text-[28px]">explore</span>
              <h2 className="text-[24px] font-bold leading-tight text-gray-900 dark:text-white">
                奇遇已触发
              </h2>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-lg">
              <div className="relative h-48 w-full overflow-hidden">
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                  <CapacitorImage
                    src={getImageUrl(mission.coverImage || mission.coverImageUrl)}
                    className="w-full h-full object-cover"
                    alt={mission.type}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-4 text-white">
                  <div className="flex items-center gap-1 text-xs font-medium bg-[#0ea5e9]/90 px-2 py-1 rounded-full w-fit mb-1 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[14px]">pets</span>
                    <span>{mission.type}</span>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{mission.title}</h3>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-[#0ea5e9]">
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                  {mission.description}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="relative w-full overflow-hidden rounded-xl py-3.5 text-white shadow-md transition-transform active:scale-[0.98] bg-[#0ea5e9] disabled:bg-[#0ea5e9]/70"
                  >
                    <span className="relative flex items-center justify-center gap-2 text-sm font-bold tracking-wide">
                      {loading ? (
                        <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined">check_circle</span>
                      )}
                      {loading ? '处理中...' : '参加奇遇'}
                    </span>
                  </button>
                  <button
                    onClick={onHold}
                    disabled={loading}
                    className="relative w-full overflow-hidden rounded-xl py-3.5 text-slate-700 dark:text-slate-200 shadow-md transition-transform active:scale-[0.98] bg-slate-100 dark:bg-slate-800"
                  >
                    <span className="relative flex items-center justify-center gap-2 text-sm font-bold tracking-wide">
                      <span className="material-symbols-outlined">schedule</span>
                      稍后再说
                    </span>
                  </button>
                </div>
                <button
                  onClick={onDecline}
                  disabled={loading}
                  className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  忽略本次奇遇
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EncounterScreen;