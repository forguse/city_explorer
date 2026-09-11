import React, { useState, useEffect, useMemo } from 'react';
import { encounter as encounterApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface QuestScreenProps {
  onBack: () => void;
  encounter?: any; // 传入的奇遇数据，包含 _id, title, description 等
  userEncounterId?: string; // UserEncounter 的 ID，用于完成奇遇
  onSuspend?: () => void;
  onComplete?: () => void;
}

const QuestScreen: React.FC<QuestScreenProps> = ({ onBack, encounter, userEncounterId, onSuspend, onComplete }) => {
  const [showModal, setShowModal] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeLeft, setTimeLeft] = useState(59 * 60 + 20); // 59m 20s
  const [completing, setCompleting] = useState(false);

  // 将后端数据映射为组件需要的格式
  const quest = useMemo(() => {
    if (!encounter) {
      return null;
    }
    return {
      _id: encounter._id,
      title: encounter.title || '神秘奇遇',
      location: encounter.triggerCondition || '未知地点',
      desc: encounter.description || '探索这个神秘的奇遇吧！',
      hint: encounter.rewardContent || '完成奇遇获取奖励',
      rewards: [
        { label: '经验值', sub: '探险经验', icon: 'stars', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        { label: encounter.rewardContent || '神秘奖励', sub: '完成奖励', icon: 'redeem', color: 'text-purple-400', bg: 'bg-purple-500/10' }
      ],
      image: getImageUrl(encounter.completionImageUrl) || '/images/quest-thumb.jpg' // 缩略图：奇遇卡片默认图片
    };
  }, [encounter]);

  // 如果没有传入 encounter，显示提示
  if (!quest) {
    return (
      <div className="bg-[#221810] text-white font-display h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-500 mb-4 block">explore_off</span>
          <p className="text-gray-400 mb-4">暂无奇遇任务</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-[#ee7c2b] text-white rounded-full font-medium"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const formattedTime = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMinimize = () => {
    setShowModal(false);
    onSuspend?.();
    setTimeout(() => {
      setIsMinimized(true);
    }, 300);
  };

  const handleRestore = () => {
    setIsMinimized(false);
    // Small delay to allow mounting before showing modal for animation
    setTimeout(() => {
      setShowModal(true);
    }, 50);
  };

  const handleClose = () => {
    onBack();
  };

  const handleTrack = () => {
    console.log('开始追踪任务');
    handleMinimize();
  };

  const handleComplete = async () => {
    if (!userEncounterId) {
      // 如果没有 userEncounterId，直接调用回调
      onComplete?.();
      return;
    }

    try {
      setCompleting(true);
      await encounterApi.validate(userEncounterId);
      onComplete?.();
    } catch (error) {
      console.error('Failed to complete encounter:', error);
      alert('完成奇遇失败，请重试');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="bg-[#221810] text-white font-display overflow-hidden h-screen w-full relative">

      {/* Background with blur */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none filter blur-[3px] brightness-[0.4]">
        <div className="w-full h-full">
          {encounter.completionImageUrl ? (
            <CapacitorImage
              src={getImageUrl(encounter.completionImageUrl)}
              alt="Backdrop"
              className="w-full h-full object-cover"
            />
          ) : (
            <CapacitorImage
              src="/images/quest-bg.jpg"
              alt="Backdrop"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>

      {/* Minimized State Widget */}
      {isMinimized && (
        <div
          className="absolute top-6 right-6 z-10 flex flex-col items-end gap-2 cursor-pointer animate-in fade-in zoom-in-50 duration-300"
          onClick={handleRestore}
        >
          <div className="relative group">
            <div className="size-12 rounded-full bg-[#27201c] border-2 border-dashed border-white/20 flex items-center justify-center shadow-lg backdrop-blur-md hover:border-[#ee7c2b] transition-colors">
              <span className="material-symbols-outlined text-white/70 text-2xl group-hover:text-[#ee7c2b]">pending</span>
            </div>
            <div className="absolute right-full mr-3 top-1/2 -translate-x-2 -translate-y-1/2 bg-black/80 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              任务进行中
            </div>
          </div>
        </div>
      )}

      {/* Maximized Modal */}
      {showModal && !isMinimized && (
        <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center sm:p-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="absolute inset-0 bg-black/40" onClick={handleMinimize}></div>

          <div className="relative w-full max-w-sm sm:max-w-md bg-[#221810] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#392f28] flex flex-col overflow-hidden max-h-[90vh]">

            {/* Arrow Decoration */}
            <div className="absolute -top-12 -right-12 sm:-right-24 w-40 h-40 pointer-events-none z-50 opacity-80">
              <svg className="drop-shadow-lg" fill="none" height="100%" viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
                <path className="dashed-path" d="M 20 80 Q 50 50 85 15" markerEnd="url(#arrowhead)" stroke="#ee7c2b" strokeLinecap="round" strokeWidth="2"></path>
                <defs>
                  <marker id="arrowhead" markerHeight="7" markerWidth="10" orient="auto" refX="9" refY="3.5">
                    <polygon fill="#ee7c2b" points="0 0, 10 3.5, 0 7"></polygon>
                  </marker>
                </defs>
              </svg>
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#392f28] bg-[#221810] relative z-20">
              <div className="flex items-center gap-2 text-[#ee7c2b]">
                <span className="material-symbols-outlined text-[20px]">explore</span>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">奇遇任务</h3>
              </div>
              <div className="flex items-center gap-1">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-[#ee7c2b]/20 rounded-lg blur opacity-75 animate-pulse"></div>
                  <button
                    onClick={handleMinimize}
                    className="relative flex items-center justify-center size-9 bg-[#392f28] hover:bg-[#ee7c2b] text-white rounded-lg border border-[#ee7c2b]/30 transition-all duration-200 group-hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">remove</span>
                  </button>
                </div>
                <div className="w-2"></div>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center size-9 hover:bg-[#392f28] text-white/50 hover:text-white rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto overscroll-contain bg-[#181411]">
              <div className="relative w-full h-48 bg-gray-800">
                <div className="w-full h-full relative">
                  <CapacitorImage
                    src={quest.image}
                    alt="Quest Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#181411] via-transparent to-transparent opacity-90"></div>
              </div>

              <div className="px-6 pb-8 -mt-6 relative z-10">
                <div className="flex flex-col gap-3 mb-4">
                  <h2 className="text-2xl font-bold text-white leading-tight">{quest.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#392f28] px-3 border border-[#ee7c2b]/20">
                      <span className="material-symbols-outlined text-[#ee7c2b] text-[18px]">timer</span>
                      <p className="text-[#ee7c2b] text-sm font-bold font-mono tracking-wide leading-normal">剩余时间: {formattedTime}</p>
                    </div>
                    <div className="inline-flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#392f28] px-3">
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">location_on</span>
                      <p className="text-gray-300 text-sm font-medium leading-normal">{quest.location}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-gray-300 text-base leading-relaxed">{quest.desc}</p>
                  <div className="bg-[#221810] border-l-2 border-[#ee7c2b] p-3 rounded-r-lg">
                    <p className="text-xs text-gray-400 italic">
                      <span className="text-[#ee7c2b] font-bold not-italic">提示: </span>
                      {quest.hint}
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">任务奖励</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {quest.rewards.map((reward, index) => (
                      <div key={index} className="flex items-center gap-3 bg-[#221810] p-3 rounded-xl border border-[#392f28]">
                        <div className={`size-10 rounded-full flex items-center justify-center ${reward.bg} ${reward.color}`}>
                          <span className="material-symbols-outlined">{reward.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm">{reward.label}</span>
                          <span className="text-gray-500 text-xs">{reward.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleTrack}
                  className="w-full bg-[#ee7c2b] hover:bg-[#d96b1f] active:bg-[#c5601a] text-white h-14 rounded-xl font-bold text-lg shadow-[0_4px_14px_rgba(238,124,43,0.3)] transition-all flex items-center justify-center gap-2 group"
                >
                  <span>追踪任务</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className={`w-full mt-3 h-12 rounded-xl font-semibold text-sm border border-white/10 transition-colors ${completing
                    ? 'bg-white/5 text-white/50 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                >
                  {completing ? '提交中...' : '我完成了奇遇'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dashed-path {
          stroke-dasharray: 6;
          animation: dash 30s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>

    </div>
  );
};

export default QuestScreen;
