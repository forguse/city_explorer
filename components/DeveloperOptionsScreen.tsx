import React from 'react';

interface DeveloperOptionsScreenProps {
  onBack: () => void;
  onDebugEncounter?: () => void;
  onDebugMessageCard?: () => void;
  onDebugQuest?: () => void;
  onDebugNavigation?: () => void;
  onDebugFocusMode?: () => void;
  onDebugTaskExecution?: () => void;
  onDebugLoadingScreen?: () => void;
  onDebugRemixRoute?: () => void;
  onDebugTripImport?: () => void;
  onDebugClipboardDetect?: () => void;
  onDebugCompletion?: () => void;
  onDebugSponsorReward?: () => void;
}

const DeveloperOptionsScreen: React.FC<DeveloperOptionsScreenProps> = ({
  onBack,
  onDebugEncounter,
  onDebugMessageCard,
  onDebugQuest,
  onDebugNavigation,
  onDebugFocusMode,
  onDebugTaskExecution,
  onDebugLoadingScreen,
  onDebugRemixRoute,
  onDebugTripImport,
  onDebugClipboardDetect,
  onDebugCompletion,
  onDebugSponsorReward
}) => {
  return (
    <div className="bg-[#0f172a] text-slate-100 min-h-screen font-display">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto bg-[#0f172a] shadow-2xl">
        <header className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur border-b border-white/10">
          <div className="flex items-center p-4 justify-between h-14">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h2 className="text-white text-lg font-bold tracking-tight">开发者选项</h2>
            <div className="size-10"></div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 space-y-5">
          <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">奇遇与导航</div>
            <div className="divide-y divide-white/10">
              {onDebugEncounter && (
                <button onClick={onDebugEncounter} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-orange-400">radar</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">模拟奇遇信号</div>
                    <div className="text-xs text-slate-400">触发奇遇入口</div>
                  </div>
                </button>
              )}
              {onDebugQuest && (
                <button onClick={onDebugQuest} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-amber-400">explore</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">查看奇遇任务</div>
                    <div className="text-xs text-slate-400">从奇遇进入的任务</div>
                  </div>
                </button>
              )}
              {onDebugNavigation && (
                <button onClick={onDebugNavigation} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-purple-400">map</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">查看导航地图</div>
                    <div className="text-xs text-slate-400">任务执行时导航</div>
                  </div>
                </button>
              )}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">任务体验</div>
            <div className="divide-y divide-white/10">
              {onDebugTaskExecution && (
                <button onClick={onDebugTaskExecution} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-sky-400">play_arrow</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">查看任务执行 (PRO)</div>
                    <div className="text-xs text-slate-400">挑战过程中</div>
                  </div>
                </button>
              )}
              {onDebugFocusMode && (
                <button onClick={onDebugFocusMode} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-orange-400">navigation</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">查看专注模式</div>
                    <div className="text-xs text-slate-400">户外强光模式</div>
                  </div>
                </button>
              )}
              {onDebugCompletion && (
                <button onClick={onDebugCompletion} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-amber-400">emoji_events</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">任务结算</div>
                    <div className="text-xs text-slate-400">挑战完成后触发</div>
                  </div>
                </button>
              )}
              {onDebugSponsorReward && (
                <button onClick={onDebugSponsorReward} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-yellow-400">redeem</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">赞助商奖励</div>
                    <div className="text-xs text-slate-400">结算后奖励</div>
                  </div>
                </button>
              )}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">内容与导入</div>
            <div className="divide-y divide-white/10">
              {onDebugMessageCard && (
                <button onClick={onDebugMessageCard} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-pink-400">mail</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">查看留言卡片</div>
                    <div className="text-xs text-slate-400">通知触达示例</div>
                  </div>
                </button>
              )}
              {onDebugRemixRoute && (
                <button onClick={onDebugRemixRoute} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-emerald-400">alt_route</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">魔改路线</div>
                    <div className="text-xs text-slate-400">挑战分支入口</div>
                  </div>
                </button>
              )}
              {onDebugClipboardDetect && (
                <button onClick={onDebugClipboardDetect} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-teal-300">content_paste_go</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">剪贴板检测</div>
                    <div className="text-xs text-slate-400">检测可导入行程</div>
                  </div>
                </button>
              )}
              {onDebugTripImport && (
                <button onClick={onDebugTripImport} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-orange-300">flight_takeoff</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">行程导入</div>
                    <div className="text-xs text-slate-400">从剪贴板导入</div>
                  </div>
                </button>
              )}
              {onDebugLoadingScreen && (
                <button onClick={onDebugLoadingScreen} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                  <span className="material-symbols-outlined text-cyan-300">hourglass_top</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">查看加载界面</div>
                    <div className="text-xs text-slate-400">耗时任务时触发</div>
                  </div>
                </button>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DeveloperOptionsScreen;
