import React from 'react';

interface AchievementDetailScreenProps {
  onBack: () => void;
  achievement?: any;
}

const AchievementDetailScreen: React.FC<AchievementDetailScreenProps> = ({ onBack, achievement }) => {
  const data = achievement || {
    id: 0,
    name: '未知成就',
    icon: 'emoji_events',
    unlocked: false
  };

  return (
    <div className="bg-[#0b0c10] text-white min-h-screen font-display">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto bg-[#0b0c10] shadow-2xl overflow-hidden">
        <header className="sticky top-0 z-40 bg-[#0b0c10]/90 backdrop-blur border-b border-white/10">
          <div className="flex items-center p-4 justify-between h-14">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h2 className="text-white text-lg font-bold tracking-tight">成就展示</h2>
            <div className="size-10"></div>
          </div>
        </header>

        <main className="flex-1 px-5 py-8">
          <div className="relative rounded-3xl bg-[#1f2833] border border-white/10 p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#66fcf1]/10 via-transparent to-[#45a29e]/10"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
                  data.unlocked ? 'bg-gradient-to-br from-[#45a29e] to-[#66fcf1]' : 'bg-[#0b0c10] border border-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-5xl">
                  {data.unlocked ? data.icon : 'lock'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white">{data.name}</h3>
              <p className="text-sm text-slate-400 mt-2">
                {data.unlocked ? '已解锁成就' : '成就未解锁'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="bg-[#1f2833] border border-white/10 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-[#66fcf1] mb-2">获得条件</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {data.unlocked
                  ? '完成与该成就相关的城市挑战与探索任务。'
                  : '完成指定挑战后即可解锁该成就。'}
              </p>
            </div>
            <div className="bg-[#1f2833] border border-white/10 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-[#66fcf1] mb-2">成就说明</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                这是城市探索者的荣誉徽记，用于记录你的探索历程与里程碑。
              </p>
            </div>
            <div className="bg-[#1f2833] border border-white/10 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-[#66fcf1] mb-2">解锁时间</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {data.unlocked ? '2026-01-20' : '未解锁'}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AchievementDetailScreen;
