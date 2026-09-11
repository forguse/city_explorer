import React, { useState } from 'react';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { SponsorReward } from '../types';

/**
 * 赞助商奖励页面
 * 
 * 使用场景：
 * 1. 完成赞助商合作任务后，展示获得的优惠券/折扣
 * 2. 用户可以将奖励"存入背包"以便后续在合作商家使用
 * 3. 通常在 TaskExecutionScreen 或 CompletionScreen 完成任务后跳转到此页面
 * 
 * 调用示例：
 * <SponsorRewardScreen
 *   onBack={() => navigate('home')}
 *   onCollect={() => navigate('myRewards')}
 *   rewardData={task.sponsorReward}
 * />
 */

interface SponsorRewardScreenProps {
  onBack: () => void;
  onCollect: () => void;
  // 奖励数据 - 由父组件传入（通常从完成的任务中获取 task.sponsorReward）
  rewardData?: SponsorReward;
}

const SponsorRewardScreen: React.FC<SponsorRewardScreenProps> = ({ onBack, onCollect, rewardData: propRewardData }) => {
  const [showModal, setShowModal] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [collected, setCollected] = useState(false);

  // 使用传入的数据，如果没有则显示空状态
  const rewardData = propRewardData;

  // 如果没有奖励数据，显示空状态
  if (!rewardData) {
    return (
      <div className="bg-[#f8f8f5] dark:bg-[#221f10] font-display h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">card_giftcard</span>
          <p className="text-gray-500 dark:text-gray-400 mb-4">暂无奖励信息</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-[#f4d125] text-[#181711] rounded-full font-medium"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const handleCollectClick = async () => {
    if (collecting || collected) return;

    setCollecting(true);
    try {
      // 模拟领取奖励的操作
      // 实际项目中可以调用 API 将奖励存入用户账户
      // 例如: await rewardApi.claim(rewardData.id);
      await new Promise(resolve => setTimeout(resolve, 500));

      setCollected(true);
      setTimeout(() => {
        setShowModal(false);
        setTimeout(() => {
          onCollect();
        }, 300);
      }, 800);
    } catch (error) {
      console.error('Failed to collect reward:', error);
      alert('领取失败，请重试');
      setCollecting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setTimeout(() => {
      onBack();
    }, 300);
  };

  return (
    <div className="bg-[#f8f8f5] dark:bg-[#221f10] font-display antialiased overflow-hidden h-screen w-full relative flex flex-col transition-colors duration-300">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 blur-sm scale-110">
          <CapacitorImage
            src={rewardData.bgImage}
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#221f10]/90 to-[#221f10] mix-blend-multiply"></div>
        <div className="absolute inset-0 confetti-bg opacity-30"></div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto animate-in slide-in-from-bottom-10 fade-in duration-500">

          <div className="flex justify-end p-6">
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-6 overflow-y-auto">

            <div className="flex flex-col items-center gap-2 text-center animate-in fade-in zoom-in-95 duration-500 delay-100">
              <div className="w-20 h-20 rounded-full bg-[#f4d125]/20 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(244,209,37,0.3)] border border-[#f4d125]/30">
                <span className="material-symbols-outlined text-[#f4d125] text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              </div>
              <h1 className="text-white text-3xl font-extrabold tracking-tight leading-tight">完成赞助商任务！</h1>
              <p className="text-[#bab59c] text-sm font-medium">{rewardData.sponsorName}</p>
            </div>

            <div className="w-full max-w-xs mt-4 mb-2 perspective-1000 animate-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="relative flex flex-col w-full bg-[#27251b] border border-[#f4d125]/30 rounded-2xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(244,209,37,0.25)] transform hover:scale-[1.02] transition-transform duration-300 group">

                {/* Ticket Image Area */}
                <div className="relative w-full aspect-[16/9] bg-[#181711]">
                  <div className="absolute inset-0 bg-center bg-cover opacity-90 transition-transform duration-700 group-hover:scale-110">
                    <CapacitorImage
                      src={rewardData.image}
                      alt={rewardData.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#27251b] via-transparent to-transparent opacity-60"></div>
                  <div className="absolute top-3 right-3 bg-[#f4d125] text-[#181711] text-xs font-bold px-3 py-1 rounded-full shadow-lg">限时福利</div>
                </div>

                {/* Dashed Line & Cutouts */}
                <div className="relative flex items-center justify-between w-full h-4 bg-[#27251b] -mt-2 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#221f10] -ml-2 box-shadow-inner"></div>
                  <div className="flex-1 border-b-2 border-dashed border-[#4a473a] mx-2 h-0"></div>
                  <div className="w-4 h-4 rounded-full bg-[#221f10] -mr-2 box-shadow-inner"></div>
                </div>

                {/* Ticket Content */}
                <div className="p-6 pt-2 flex flex-col items-center text-center gap-3">
                  <h3 className="text-white text-lg font-bold">{rewardData.title}</h3>
                  <div className="flex items-baseline gap-1 text-[#f4d125] drop-shadow-[0_0_8px_rgba(244,209,37,0.4)]">
                    <span className="text-6xl font-black tracking-tighter">{rewardData.discountValue}</span>
                    <span className="text-3xl font-bold">{rewardData.discountUnit}</span>
                  </div>
                  <p className="text-[#bab59c] text-xs leading-relaxed max-w-[200px]">{rewardData.description}</p>
                </div>
              </div>
            </div>

            <div className="w-full mt-auto pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              <button
                onClick={handleCollectClick}
                disabled={collecting || collected}
                className={`group w-full flex items-center justify-center gap-3 h-14 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(244,209,37,0.3)] transition-all duration-200 ${collected
                  ? 'bg-green-500 text-white cursor-default'
                  : collecting
                    ? 'bg-[#f4d125]/70 text-[#181711] cursor-wait'
                    : 'bg-[#f4d125] hover:bg-[#ffe045] active:scale-[0.98] text-[#181711]'
                  }`}
              >
                {collected ? (
                  <>
                    <span className="material-symbols-outlined text-[24px]">check_circle</span>
                    <span>已存入背包</span>
                  </>
                ) : collecting ? (
                  <>
                    <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
                    <span>领取中...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[24px] group-hover:rotate-12 transition-transform">backpack</span>
                    <span>存入我的背包</span>
                  </>
                )}
              </button>
              <p className="text-[#6b6859] text-xs text-center mt-4">有效期至 {rewardData.expiry}</p>
              {rewardData.code && (
                <p className="text-[#f4d125] text-sm text-center mt-2 font-mono bg-[#27251b] py-2 px-4 rounded-lg">
                  优惠码: {rewardData.code}
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      <style>{`
        .confetti-bg {
          background-image: radial-gradient(#f4d125 2px, transparent 2px), radial-gradient(rgba(255,255,255,0.3) 2px, transparent 2px);
          background-size: 40px 40px, 30px 30px;
          background-position: 0 0, 15px 15px;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
};

export default SponsorRewardScreen;
