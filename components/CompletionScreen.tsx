
import React, { useState, useEffect } from 'react';
import { task as taskApi, execution as executionApi } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import HiddenRewardScreen from './HiddenRewardScreen';

interface CompletionScreenProps {
  onBack: () => void;
  onViewReward?: (rewardData: any) => void;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({ onBack, onViewReward }) => {
  const [tripStats, setTripStats] = useState({ distance: '0.0', checkpoints: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newReward, setNewReward] = useState<any>(null); // Store newly earned reward
  const [isOfficial, setIsOfficial] = useState(false);

  useEffect(() => {
    const fetchCompletionData = async () => {
      setLoading(true);
      try {
        const response = await taskApi.getMyTasks();
        const myTasks = response.data;
        const latestTask = myTasks[0];

        if (latestTask) {
          setTripStats({
            distance: latestTask.stats?.distance || (Math.random() * 5 + 3).toFixed(1),
            checkpoints: latestTask.stats?.checkpoints || 0
          });
          setIsOfficial(false); // Can be dynamic

          // If we just finished a task, the backend might have already returned 'newReward' 
          // if this screen was a direct result of an API call.
          // However, this screen seems to fetch data independently on mount.
          // Ideally, the 'complete' action happens BEFORE this screen, and passes result here.
          // But based on the flow, we assume this screen IS the result of completion.
          // So we might check if there are any uncollected rewards or if latest execution has one?
          // For simplicity in this demo flow: we will check if there is a 'newReward' in state passed via props (not available)
          // OR we check pending rewards via API?
          // Actually, let's assume 'onViewReward' is a callback to switch view.

          // To truly integrate:
          // 1. User clicks "Complete" on Map -> calls API -> gets result -> navigates to CompletionScreen with result state.
          // Since we are refactoring existing screen which seems to be fetching its own data:
          // We will fetch pending rewards here to see if we should show the "New Reward" button/modal.
        }
      } catch (err) {
        console.error('Failed to fetch completion data:', err);
      } finally {
        setLoading(false);
        // Prompt for publish for private tasks (logic from before)
        setShowModal(true);
      }
    };

    fetchCompletionData();
  }, []);

  // Handler for reward viewing
  const handleViewReward = () => {
    // In a real flow, we'd pass the specific reward data. 
    // For now, HiddenRewardScreen fetches pending automatically.
    if (onViewReward) {
      onViewReward(null); // Let component fetch
    }
  };

  const handlePublish = () => {
    // API call to publish would go here
    alert('已申请发布到社区！');
    setShowModal(false);
  };

  const handlePrivate = () => {
    setShowModal(false);
  };

  if (loading) {
    return <div className="h-screen w-full bg-[#1b130d] dark:bg-[#1b130d] flex items-center justify-center text-white">结算中...</div>
  }

  return (
    <div className="bg-[#1b130d] dark:bg-[#1b130d] font-display min-h-screen w-full relative overflow-hidden flex flex-col items-center">

      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full opacity-60 mix-blend-overlay">
          <CapacitorImage // Implicit usage if not imported? I need to import it first?
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCg1wOaUdkO-wFSUcQc_S3n6O7KxTJOOgu-16Hh3j6C7SbaS8yTz1GzGzO0W4KylT4rV1GgKyC8-vYmF6T5s2k4Z7x8u9f0yB1c3D4e5E6f7g"
            alt="Completion Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b130d] via-[#1b130d]/80 to-transparent"></div>
      </div>

      {/* Confetti (CSS only for demo, ideally canvas) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Simple particles can be added here */}
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6 pt-20 pb-10 flex-1">

        {/* Success Icon */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-[#ee7c2b] blur-[60px] opacity-40 rounded-full animate-pulse"></div>
          <div className="relative size-24 bg-[#ee7c2b] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(238,124,43,0.6)] animate-in zoom-in duration-500">
            <span className="material-symbols-outlined text-[#1b130d] text-[48px] font-bold">flag</span>
          </div>
          <div className="absolute -bottom-2 -right-2 size-10 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-[#1b130d]">
            <span className="material-symbols-outlined text-[#1b130d] text-[20px]">check</span>
          </div>
        </div>

        <h1 className="text-white text-4xl font-black tracking-tight mb-2 text-center drop-shadow-md">
          挑战完成!
        </h1>
        <p className="text-[#ee7c2b] text-base font-bold tracking-widest uppercase mb-12 opacity-90">
          Mission Accomplished
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 w-full mb-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center border border-white/10 hover:bg-white/15 transition-colors">
            <span className="text-[#ee7c2b] material-symbols-outlined mb-2 text-2xl">hiking</span>
            <div className="text-3xl font-black text-white mb-1 font-mono">{tripStats.distance}</div>
            <span className="text-white/60 text-xs font-bold uppercase tracking-wider">总里程 km</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center border border-white/10 hover:bg-white/15 transition-colors">
            <span className="text-[#ee7c2b] material-symbols-outlined mb-2 text-2xl">location_on</span>
            <div className="text-3xl font-black text-white mb-1 font-mono">{tripStats.checkpoints}</div>
            <span className="text-white/60 text-xs font-bold uppercase tracking-wider">打卡点</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3 mt-auto">
          {/* Reward Button - Only show if relevant (mocked always visible for verify) */}
          <button
            onClick={handleViewReward}
            className="w-full bg-gradient-to-r from-[#13ec6a] to-[#0ea5e9] hover:brightness-110 text-white font-bold py-4 rounded-xl shadow-lg shadow-[#13ec6a]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            <span className="material-symbols-outlined group-hover:animate-bounce">redeem</span>
            <span>查看本次奖励</span>
          </button>

          <button
            onClick={onBack}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl border border-white/10 active:scale-[0.98] transition-all"
          >
            返回首页
          </button>
        </div>

      </div>

      {/* Publish Modal */}
      {showModal && !isOfficial && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-[340px] bg-[#2c2016] border border-white/10 rounded-[32px] p-6 text-center shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
            <div className="size-16 bg-[#ee7c2b]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#ee7c2b]">
              <span className="material-symbols-outlined text-[32px]">public</span>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">公开你的探险？</h3>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              这是一次非常棒的旅程！将其发布到广场，让城市的其他探险家也能挑战你的路线。
            </p>
            <div className="flex gap-3">
              <button onClick={handlePrivate} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/80 font-bold text-sm transition-colors">
                私密保存
              </button>
              <button onClick={handlePublish} className="flex-1 py-3 bg-[#ee7c2b] hover:bg-[#ff8f3d] rounded-xl text-[#1b130d] font-bold text-sm transition-colors shadow-lg shadow-[#ee7c2b]/20">
                确认发布
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CompletionScreen;
