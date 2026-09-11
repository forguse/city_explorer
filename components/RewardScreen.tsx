import React, { useState } from 'react';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface RewardScreenProps {
  onBack: () => void;
  onClaim: () => void;
  // 任务完成数据
  taskData?: {
    taskTitle: string;           // 任务名称
    nodeName?: string;           // 打卡点名称
    completionImage?: string;    // 打卡照片
    completedAt?: string;        // 完成时间
    earnedPoints?: number;       // 获得的积分
    earnedExp?: number;          // 获得的经验
    message?: string;            // 完成提示语
  };
}

const RewardScreen: React.FC<RewardScreenProps> = ({ onBack, onClaim, taskData }) => {
  const [reviewText, setReviewText] = useState('');
  const [isClaimed, setIsClaimed] = useState(false);
  const [tags, setTags] = useState<Array<{ id: number; text: string; selected: boolean }>>([
    { id: 1, text: '出片圣地', selected: false },
    { id: 2, text: '值得来', selected: false },
    { id: 3, text: '推荐打卡', selected: false }
  ]);

  // 从 props 获取数据，提供默认值
  const taskTitle = taskData?.taskTitle || '任务完成';
  const nodeName = taskData?.nodeName || '打卡点';
  const completionImage = taskData?.completionImage || '';
  const completedAt = taskData?.completedAt
    ? new Date(taskData.completedAt).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).replace(/\//g, '.')
    : new Date().toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).replace(/\//g, '.');
  const earnedPoints = taskData?.earnedPoints || 0;
  const earnedExp = taskData?.earnedExp || 0;
  const message = taskData?.message || '恍惚间 以为是梦';

  const toggleTag = (id: number) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const addNewTag = () => {
    const text = prompt("输入新标签:");
    if (text) {
      setTags(prev => [...prev, { id: Date.now(), text, selected: true }]);
    }
  };

  const handleClaim = () => {
    if (isClaimed) return;
    setIsClaimed(true);
    // Optional: could auto-navigate after delay: setTimeout(onClaim, 1500);
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-[#f8f7f5] dark:bg-[#221910] font-display overflow-hidden transition-colors duration-200">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#f48c25]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 -left-20 w-48 h-48 bg-[#0d9488]/10 rounded-full blur-3xl"></div>
        {/* Confetti */}
        <div className="absolute w-2 h-2 opacity-80 bg-[#0d9488] rotate-[15deg] top-[10%] left-[10%] [clip-path:polygon(50%_0%,0%_100%,100%_100%)]"></div>
        <div className="absolute w-1.5 h-1.5 opacity-80 bg-[#f48c25] rounded-full rotate-[-45deg] top-[15%] right-[20%]"></div>
        <div className="absolute w-2.5 h-1 opacity-80 bg-[#f59e0b] rotate-[30deg] bottom-[30%] left-[5%]"></div>
        <div className="absolute w-1.5 h-1.5 opacity-80 bg-[#0d9488] rotate-[60deg] top-[25%] left-[85%]"></div>
        <div className="absolute w-1.5 h-1.5 opacity-80 bg-[#ef4444] rounded-full rotate-[10deg] top-[5%] left-[50%]"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center bg-transparent p-4 pb-2 justify-between">
        <button
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/20 hover:bg-white transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#181411] dark:text-white text-[24px]">arrow_back</span>
        </button>
        <h2 className="text-[#181411] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10 truncate">
          📍 {nodeName}
        </h2>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar pb-32">

        {/* Photo Card */}
        <div className="px-4 py-2">
          <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg group">
            {completionImage ? (
              <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                <CapacitorImage
                  src={getImageUrl(completionImage)}
                  alt="Completion"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#f48c25]/20 to-[#0d9488]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-gray-400">photo_camera</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10"></div>

            {/* Stamp */}
            <div className="absolute top-6 right-6 bg-[#0d9488]/90 border-2 border-white/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg -rotate-12 mix-blend-hard-light backdrop-blur-sm">
              <span className="material-symbols-outlined filled text-[20px]">verified</span>
              <span className="font-bold tracking-widest text-sm">验证通过</span>
            </div>

            {/* Overlay Info */}
            <div className="absolute bottom-0 left-0 w-full p-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#f48c25] text-white text-xs font-bold px-2 py-0.5 rounded-md">打卡成功</span>
                  <p className="text-white/90 text-sm font-medium">{completedAt}</p>
                </div>
                <h3 className="text-white text-2xl font-bold leading-tight mt-1">{message} ✨</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="px-4 py-4">
          <div className="bg-white dark:bg-[#2d241c] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <label className="block mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#f48c25] text-[20px]">edit_note</span>
                <span className="text-[#181411] dark:text-white text-base font-bold">心得攻略</span>
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full h-32 rounded-xl bg-[#f8f7f5] dark:bg-[#221910] text-[#181411] dark:text-white border-none focus:ring-2 focus:ring-[#f48c25]/50 resize-none p-3 text-sm placeholder:text-[#8a7560] outline-none"
                placeholder="这个打卡点怎么样？分享给其他旅行者吧..."
              ></textarea>
            </label>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`group flex h-8 items-center justify-center gap-x-1.5 rounded-full pl-3 pr-4 transition-all border cursor-pointer ${tag.selected
                    ? 'bg-[#f48c25]/10 border-[#f48c25]/30'
                    : 'bg-[#f8f7f5] dark:bg-[#221910] border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  <span className={`text-xs ${tag.selected ? 'text-[#f48c25]' : 'text-gray-400'}`}>#</span>
                  <span className={`text-xs font-medium ${tag.selected ? 'text-[#f48c25]' : 'text-[#181411] dark:text-white'}`}>{tag.text}</span>
                </button>
              ))}

              <button
                onClick={addNewTag}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8f7f5] dark:bg-[#221910] text-[#8a7560] hover:text-[#f48c25] transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        </div>

        <div className="h-6"></div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 w-full z-20">
        <div className="h-12 w-full bg-gradient-to-t from-[#f8f7f5] dark:from-[#221910] to-transparent pointer-events-none"></div>

        <div className="bg-white dark:bg-[#2d241c] px-5 pb-8 pt-4 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col items-center justify-center mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎉</span>
              <h3 className="text-[#181411] dark:text-white text-xl font-bold tracking-tight">本次获得</h3>
            </div>
            <div className="flex items-center gap-4">
              {earnedPoints > 0 && (
                <div className="flex items-baseline gap-1 text-[#f48c25]">
                  <span className="text-3xl font-extrabold">+{earnedPoints}</span>
                  <span className="text-sm font-semibold text-[#8a7560] dark:text-gray-400">探索币</span>
                </div>
              )}
              {earnedExp > 0 && (
                <div className="flex items-baseline gap-1 text-[#0d9488]">
                  <span className="text-3xl font-extrabold">+{earnedExp}</span>
                  <span className="text-sm font-semibold text-[#8a7560] dark:text-gray-400">经验</span>
                </div>
              )}
              {earnedPoints === 0 && earnedExp === 0 && (
                <div className="flex items-baseline gap-1 text-[#f48c25]">
                  <span className="text-lg font-semibold text-[#8a7560] dark:text-gray-400">完成打卡</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleClaim}
            disabled={isClaimed}
            className={`relative w-full group overflow-hidden rounded-full p-[1px] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${isClaimed ? 'bg-gray-400' : 'bg-[#f48c25] shadow-[0_0_20px_rgba(244,140,37,0.3)] hover:shadow-lg'
              }`}
          >
            {!isClaimed && <div className="absolute inset-0 bg-gradient-to-r from-[#f48c25] to-[#ff9f4d]"></div>}

            <div className={`relative flex h-14 items-center justify-center gap-2 transition-colors rounded-full px-6 ${isClaimed ? 'bg-gray-500' : 'bg-[#f48c25] group-hover:bg-[#e07b1e]'
              }`}>
              <span className="material-symbols-outlined text-white text-[24px]">
                {isClaimed ? 'check_circle' : 'redeem'}
              </span>
              <span className="text-white text-lg font-bold tracking-wide">
                {isClaimed ? '已领取' : '领取奖励'}
              </span>
            </div>

            {!isClaimed && (
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 skew-x-12"></div>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default RewardScreen;