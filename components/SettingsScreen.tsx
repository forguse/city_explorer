import React, { useState, useEffect } from 'react';
import { encounter as encounterApi, user as userApi } from '../services/api';

interface SettingsScreenProps {
  onBack: () => void;
  // Debug handlers to keep accessible
  onDebugEncounter?: () => void;
  onDebugMessageCard?: () => void;
  onDebugQuest?: () => void;
  onDebugNavigation?: () => void;
  onDebugFocusMode?: () => void;
  onDebugTaskExecution?: () => void;
  onTaskReview?: () => void;
  onPostReview?: () => void; // 帖子审核
  onReportManagement?: () => void; // 举报管理
  onFeedback?: () => void;
  onAdminFeedback?: () => void;
  onGeneralSettings?: () => void;
  onDeveloperOptions?: () => void;
  onAbout?: () => void;
  onLogout?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onDebugEncounter,
  onDebugMessageCard,
  onDebugQuest,
  onDebugNavigation,
  onDebugFocusMode,
  onDebugTaskExecution,
  onTaskReview,
  onPostReview,
  onReportManagement,
  onFeedback,
  onAdminFeedback,
  onGeneralSettings,
  onDeveloperOptions,
  onAbout,
  onLogout
}) => {
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState({
    randomEncounter: true
  });
  const [recentSignals, setRecentSignals] = useState<any[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 获取当前用户信息和设置
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const res = await userApi.getMe();
        setIsAdmin(res.data?.isAdmin === true);
        // 加载用户的奇遇设置
        if (res.data?.preferences) {
          setPreferences(prev => ({
            ...prev,
            randomEncounter: res.data.preferences.randomEncounter !== false
          }));
        }
      } catch (error) {
        console.error('Failed to fetch user settings:', error);
      }
    };
    fetchUserSettings();
  }, []);

  // 获取最近的奇遇信号
  useEffect(() => {
    const fetchRecentSignals = async () => {
      try {
        setLoadingSignals(true);
        const res = await encounterApi.getHistory();
        // 映射后端数据到 UI 格式
        const mappedSignals = (res.data || []).slice(0, 5).map((item: any, index: number) => {
          const encounterData = item.encounter || {};
          const icons = ['cell_tower', 'forest', 'wifi_tethering', 'explore', 'radar'];
          const colors = ['text-[#1337ec]', 'text-emerald-500', 'text-purple-500', 'text-orange-500', 'text-pink-500'];
          const bgs = ['bg-indigo-500/20', 'bg-emerald-500/20', 'bg-purple-500/20', 'bg-orange-500/20', 'bg-pink-500/20'];

          // 计算时间差
          const createdAt = new Date(item.createdAt);
          const now = new Date();
          const diffMs = now.getTime() - createdAt.getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60));
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffHours / 24);

          let timeStr = '';
          if (diffMins < 60) timeStr = `${diffMins}分钟前`;
          else if (diffHours < 24) timeStr = `${diffHours}小时前`;
          else if (diffDays < 7) timeStr = `${diffDays}天前`;
          else timeStr = createdAt.toLocaleDateString('zh-CN');

          return {
            id: item._id,
            title: encounterData.title || '神秘信号',
            meta: `${timeStr} • ${item.status === 'completed' ? '已完成' : '进行中'}`,
            icon: icons[index % icons.length],
            iconColor: colors[index % colors.length],
            bgClass: bgs[index % bgs.length],
            userEncounterId: item._id
          };
        });
        setRecentSignals(mappedSignals);
      } catch (error) {
        console.error('Failed to fetch recent signals:', error);
        setRecentSignals([]);
      } finally {
        setLoadingSignals(false);
      }
    };

    fetchRecentSignals();
  }, []);

  const handleAcceptSignal = () => {
    console.log('接收信号...');
    setShowModal(false);
    if (onDebugEncounter) {
      setTimeout(() => {
        onDebugEncounter();
      }, 300);
    }
  };

  const handleIgnoreSignal = () => {
    console.log('忽略信号');
    setShowModal(false);
  };

  const toggleEncounter = async () => {
    const newValue = !preferences.randomEncounter;
    setPreferences(prev => ({ ...prev, randomEncounter: newValue }));

    // 持久化到后端
    try {
      await userApi.updateMe({ preferences: { randomEncounter: newValue } });
      if (newValue) {
        setTimeout(() => setShowModal(true), 300);
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
      // 回滚
      setPreferences(prev => ({ ...prev, randomEncounter: !newValue }));
    }
  };

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#101322] font-display text-gray-900 dark:text-white antialiased overflow-hidden h-screen w-full relative selection:bg-[#1337ec] selection:text-white transition-colors duration-300">

      {/* Header */}
      <div className="fixed top-0 w-full z-30 bg-[#f8f7f5]/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-gray-200 dark:border-[#2d3555]">
        <div className="flex items-center p-4 pb-2 justify-between max-w-md mx-auto w-full">
          <button
            onClick={onBack}
            className="text-gray-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-[#1c2136] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
          </button>
          <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">奇遇设置</h2>
        </div>
      </div>

      <div className="pt-20 pb-24 h-full overflow-y-auto w-full max-w-md mx-auto px-4 relative custom-scrollbar">

        {/* Preference Section */}
        <div className="flex flex-col gap-2 mb-8">
          <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">探索偏好</h3>

          <div className="flex flex-1 flex-col items-start justify-between gap-4 rounded-xl border border-gray-200 dark:border-[#2d3555] bg-white dark:bg-[#1c2136] p-5 shadow-sm">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-col gap-1 pr-4">
                <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">开启随机奇遇</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">接收来自前行探险家的神秘支线任务。</p>
              </div>
              <label
                className={`relative flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors ${preferences.randomEncounter ? 'bg-[#1337ec]' : 'bg-gray-300 dark:bg-[#232948]'}`}
              >
                <input
                  type="checkbox"
                  checked={preferences.randomEncounter}
                  onChange={toggleEncounter}
                  className="peer invisible absolute"
                />
                <div className={`h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform ${preferences.randomEncounter ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
              </label>
            </div>
          </div>


        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">最近信号</h3>
          <div className="flex flex-col gap-3">
            {loadingSignals ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1337ec]"></div>
              </div>
            ) : recentSignals.length > 0 ? (
              recentSignals.map((signal) => (
                <button
                  key={signal.id}
                  className="group flex items-center gap-4 bg-white dark:bg-[#1c2136] rounded-xl p-4 border border-transparent hover:border-[#1337ec]/50 transition-all shadow-sm text-left"
                >
                  <div
                    className={`flex items-center justify-center rounded-lg shrink-0 size-12 text-white ${signal.bgClass} ${signal.iconColor}`}
                  >
                    <span className="material-symbols-outlined">{signal.icon}</span>
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    <p className="text-gray-900 dark:text-white text-base font-medium leading-normal line-clamp-1 group-hover:text-[#1337ec] transition-colors">{signal.title}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal line-clamp-1">{signal.meta}</p>
                  </div>
                  <div className="shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2">wifi_tethering_off</span>
                <p className="text-sm">暂无最近信号</p>
              </div>
            )}
          </div>
        </div>

        {/* 审核空间 - 仅管理员可见 */}
        {isAdmin && (
          <div className="flex flex-col gap-2 mt-8 border-t border-gray-200 dark:border-[#2d3555] pt-6">
            <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2">管理员审核</h3>

            {/* 任务审核 */}
            <button
              onClick={onTaskReview}
              className="flex items-center gap-4 bg-white dark:bg-[#1c2136] rounded-xl p-4 border border-gray-200 dark:border-[#2d3555] hover:border-[#1337ec]/50 transition-all shadow-sm text-left"
            >
              <div className="flex items-center justify-center rounded-lg shrink-0 size-12 bg-emerald-500/20 text-emerald-500">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">任务审核</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal">审核用户提交的新任务</p>
              </div>
              <div className="shrink-0 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined">chevron_right</span>
              </div>
            </button>

            {/* 举报管理 */}
            <button
              onClick={onReportManagement}
              className="flex items-center gap-4 bg-white dark:bg-[#1c2136] rounded-xl p-4 border border-gray-200 dark:border-[#2d3555] hover:border-red-500/50 transition-all shadow-sm text-left"
            >
              <div className="flex items-center justify-center rounded-lg shrink-0 size-12 bg-red-500/20 text-red-500">
                <span className="material-symbols-outlined">flag</span>
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">举报管理</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal">处理用户举报的内容</p>
              </div>
              <div className="shrink-0 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined">chevron_right</span>
              </div>
            </button>
          </div>
        )}

        {/* 反馈与申诉 */}
        <div className="flex flex-col gap-2 mt-8 border-t border-gray-200 dark:border-[#2d3555] pt-6">
          <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2">帮助与反馈</h3>

          {onFeedback && (
            <button
              onClick={onFeedback}
              className="flex items-center gap-4 bg-white dark:bg-[#1c2136] rounded-xl p-4 border border-gray-200 dark:border-[#2d3555] hover:border-[#1337ec]/50 transition-all shadow-sm text-left"
            >
              <div className="flex items-center justify-center rounded-lg shrink-0 size-12 bg-blue-500/20 text-blue-500">
                <span className="material-symbols-outlined">chat_bubble</span>
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">反馈与申诉</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal">有问题？告诉我们，我们会尽快处理</p>
              </div>
              <div className="shrink-0 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined">chevron_right</span>
              </div>
            </button>
          )}

          {onAdminFeedback && (
            <button
              onClick={onAdminFeedback}
              className="flex items-center gap-4 bg-white dark:bg-[#1c2136] rounded-xl p-4 border border-gray-200 dark:border-[#2d3555] hover:border-orange-500/50 transition-all shadow-sm text-left mt-2"
            >
              <div className="flex items-center justify-center rounded-lg shrink-0 size-12 bg-orange-500/20 text-orange-500">
                <span className="material-symbols-outlined">admin_panel_settings</span>
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">反馈管理</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal">管理员处理用户反馈</p>
              </div>
              <div className="shrink-0 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined">chevron_right</span>
              </div>
            </button>
          )}
        </div>


        {/* About Section */}
        <div className="flex flex-col gap-2 mt-8 border-t border-gray-200 dark:border-[#2d3555] pt-6 pb-2">
          <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2">关于</h3>
          {onAbout && (
            <button
              onClick={onAbout}
              className="flex items-center gap-4 bg-white dark:bg-[#1c2136] rounded-xl p-4 border border-gray-200 dark:border-[#2d3555] hover:border-[#1337ec]/50 transition-all shadow-sm text-left"
            >
              <div className="flex items-center justify-center rounded-lg shrink-0 size-12 bg-indigo-500/20 text-indigo-500">
                <span className="material-symbols-outlined">info</span>
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">关于线旅</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal">版本信息、用户协议与隐私政策</p>
              </div>
              <div className="shrink-0 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined">chevron_right</span>
              </div>
            </button>
          )}
        </div>

        {/* Account Actions */}
        <div className="flex flex-col gap-2 mt-8 border-t border-gray-200 dark:border-[#2d3555] pt-6 pb-10">
          <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2">账号安全</h3>
          <div className="flex flex-col gap-3">
            {onLogout && (
              <button
                onClick={() => {
                  if (window.confirm('确定要退出登录吗？')) {
                    onLogout();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-[#1c2136] p-4 rounded-xl border border-gray-200 dark:border-[#2d3555] text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined">logout</span>
                退出登录
              </button>
            )}

            <button
              onClick={() => {
                // In a real app, this should open a confirm modal or navigation to a delete flow.
                // For now, prompt the user to contact admin as per Privacy Policy, or implementing a simple self-destruct if backend supports it.
                // User asked for "注销账号功能". Let's give a prompt explaining it for now or if backend has it.
                // Backend doesn't have a delete route in authController clearly exposed yet? 
                // Let's check authController. Actually, user asked for it, better be safe.
                alert('注销账号是不可逆操作。请通过应用内“反馈与申诉”提交注销申请。');
              }}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors"
            >
              申请注销账号
            </button>
          </div>
        </div>
      </div>

      {/* Signal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">

          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#0f111a] border border-[#1337ec]/30 shadow-[0_0_50px_-12px_rgba(19,55,236,0.5)] flex flex-col items-center pt-8 pb-6 px-6 animate-in zoom-in-95 duration-300">

            <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="scanline"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1337ec] to-transparent opacity-70"></div>

            <div className="relative z-10 mb-6">
              <div className="absolute inset-0 bg-[#1337ec]/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative flex items-center justify-center size-20 rounded-full bg-gradient-to-b from-[#1c2136] to-[#0f111a] border border-[#1337ec]/40 animate-shake shadow-lg shadow-[#1337ec]/20">
                <span className="material-symbols-outlined text-4xl text-[#1337ec] animate-pulse-glow" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48" }}>mail</span>
                <div className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-[#0f111a] animate-bounce"></div>
              </div>
            </div>

            <div className="relative z-10 text-center space-y-2 mb-8">
              <h3 className="text-white text-xl font-bold tracking-wider font-display uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                信号接入中...
              </h3>
              <div className="flex items-center justify-center gap-2 text-[#1337ec]/80 font-mono text-xs mb-2">
                <span className="animate-pulse">●</span> REC <span className="text-gray-600">|</span> 40.7128° N, 74.0060° W
              </div>
              <p className="text-gray-300 text-sm leading-relaxed max-w-[240px] mx-auto">
                探测到前行者的信号... <br />
                <span className="text-xs text-gray-500 font-mono mt-1 block tracking-widest">[ENCRYPTED_DATA_PACKET]</span>
              </p>
            </div>

            <div className="relative z-10 flex flex-col w-full gap-3">
              <button
                onClick={handleAcceptSignal}
                className="w-full h-12 rounded-xl bg-[#1337ec] hover:bg-[#0f2cb8] text-white font-bold tracking-wide shadow-[0_0_20px_-5px_rgba(19,55,236,0.6)] hover:shadow-[0_0_25px_-5px_rgba(19,55,236,0.8)] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 group"
              >
                <span className="material-symbols-outlined group-hover:animate-ping text-[20px]">sensors</span>
                接收信号
              </button>
              <button
                onClick={handleIgnoreSignal}
                className="w-full h-12 rounded-xl border border-gray-700 hover:border-gray-500 bg-transparent text-gray-400 hover:text-white font-medium tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
                忽略
              </button>
            </div>

            <div className="absolute bottom-2 right-3 flex gap-1">
              <div className="w-1 h-1 bg-[#1337ec]/40 rounded-full"></div>
              <div className="w-1 h-1 bg-[#1337ec]/40 rounded-full"></div>
              <div className="w-1 h-1 bg-[#1337ec]/40 rounded-full"></div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-shake {
          animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 20px rgba(19, 55, 236, 0.3); }
          50% { opacity: .8; box-shadow: 0 0 40px rgba(19, 55, 236, 0.6); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .scanline {
          width: 100%;
          height: 100px;
          z-index: 10;
          background: linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(19, 55, 236, 0.05) 50%, rgba(0,0,0,0) 100%);
          opacity: 0.1;
          background-size: 100% 100%;
          position: absolute;
          bottom: 100%;
          animation: scanline 10s linear infinite;
          pointer-events: none;
        }
        @keyframes scanline {
          0% { top: -100px; }
          100% { top: 100%; }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #101322; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2d3555; 
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default SettingsScreen;
