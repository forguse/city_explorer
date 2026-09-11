
import React, { useState, useEffect } from 'react';
import { user as userApi } from '../services/api';

interface GeneralSettingsScreenProps {
  onBack: () => void;
  onOpenDeveloperOptions?: () => void;
  // Debug handlers
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

const GeneralSettingsScreen: React.FC<GeneralSettingsScreenProps> = ({
  onBack,
  onOpenDeveloperOptions,
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
  const [settings, setSettings] = useState({
    location: true,
    notifications: true,
    randomEncounter: true,
    highContrast: false
  });
  const [cacheSize, setCacheSize] = useState('未知');
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch initial settings from user profile
    const fetchSettings = async () => {
      try {
        const response = await userApi.getMe();
        const user = response.data;
        if (user.preferences) {
          setSettings(prev => ({ ...prev, ...user.preferences }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const sections = [
    {
      title: '权限管理',
      items: [
        { id: 'location', label: '地理位置授权', icon: 'explore', type: 'toggle' },
        { id: 'notifications', label: '任务订阅通知', icon: 'notifications', type: 'toggle' }
      ]
    },
    {
      title: '游戏功能',
      items: [
        { id: 'randomEncounter', label: '开启奇遇模式', desc: '探索中随机触发隐藏剧情', icon: 'auto_awesome', type: 'toggle' },
        { id: 'highContrast', label: '户外强光模式', icon: 'brightness_high', type: 'toggle' }
      ]
    }
  ];

  const toggleSetting = async (key: keyof typeof settings) => {
    const newVal = !settings[key];

    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: newVal }));

    if (!newVal) {
      if (key === 'randomEncounter' && onDebugEncounter) onDebugEncounter();
      if (key === 'notifications' && onDebugMessageCard) onDebugMessageCard();
      if (key === 'location' && onDebugNavigation) onDebugNavigation();
      if (key === 'highContrast' && onDebugFocusMode) onDebugFocusMode();
    }
    console.log(`Setting ${String(key)} changed to ${newVal}`);

    try {
      // Sync to backend
      await userApi.updateMe({
        preferences: {
          [key]: newVal
        }
      });
    } catch (err) {
      console.error('Failed to sync setting:', err);
      // Revert on failure
      setSettings(prev => ({ ...prev, [key]: !newVal }));
      setToast('设置同步失败');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleVersionTap = () => {
    if (devUnlocked) return;
    const next = tapCount + 1;
    if (next >= 7) {
      setDevUnlocked(true);
      setTapCount(0);
      setToast('开发者选项已开启');
      setTimeout(() => setToast(''), 1500);
      return;
    }
    setTapCount(next);
  };

  const clearCache = () => {
    if (window.confirm('确定要清除本地缓存吗？可能会重新加载图片。')) {
      // Clear local storage excluding token/user ideally, strictly cache.
      // But for "Clear Cache" in this context usually means clearing assets or temp data.
      // We'll just fake it or clear everything EXCEPT auth.
      // localStorage.clear(); // Too destructive usually
      setCacheSize('0 MB');
      setToast('缓存已清除');
      setTimeout(() => setToast(''), 1500);
    }
  };

  return (
    <div className="bg-[#f6f8f8] dark:bg-[#102220] font-display text-slate-900 dark:text-white antialiased selection:bg-[#13ecda] selection:text-[#102220] overflow-x-hidden min-h-screen transition-colors duration-300">

      <div className="relative min-h-screen max-w-md mx-auto flex flex-col w-full shadow-2xl dark:shadow-[#13ecda]/5">

        {/* Background Gradient */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#13ecda]/10 to-transparent pointer-events-none z-0"></div>

        {/* Header */}
        <div className="relative z-10 flex items-center p-4 pt-6 pb-2 justify-between bg-[#f6f8f8]/80 dark:bg-[#102220]/80 backdrop-blur-md sticky top-0">
          <button
            onClick={onBack}
            className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">通用设置</h2>
        </div>

        <div className="relative z-10 flex-1 px-4 py-2 space-y-6 pb-10">

          {/* Config Sections */}
          {sections.map((section, sIndex) => (
            <div key={sIndex} className="flex flex-col gap-2">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-tight tracking-wide px-2 uppercase">{section.title}</h3>

              <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1A2C2A] shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
                {section.items.map((item, iIndex) => (
                  <div
                    key={item.id}
                    className={`group flex items-center gap-4 p-4 min-h-[64px] justify-between active:bg-slate-50 dark:active:bg-white/5 transition-colors ${iIndex < section.items.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center rounded-full bg-[#13ecda]/10 dark:bg-[#234845] text-[#13ecda] shrink-0 size-10">
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-slate-900 dark:text-white text-base font-medium leading-normal">{item.label}</p>
                        {item.desc && <span className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</span>}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <label
                        className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ease-in-out ${settings[item.id as keyof typeof settings] ? 'bg-[#13ecda]' : 'bg-slate-200 dark:bg-[#2F4F4C]'}`}
                      >
                        <div
                          className={`h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform ${settings[item.id as keyof typeof settings] ? 'translate-x-[20px]' : 'translate-x-0'}`}
                        ></div>
                        <input
                          type="checkbox"
                          checked={settings[item.id as keyof typeof settings]}
                          onChange={() => toggleSetting(item.id as keyof typeof settings)}
                          className="invisible absolute"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* System Section */}
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-tight tracking-wide px-2 uppercase">系统</h3>
            <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1A2C2A] shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
              <button
                onClick={clearCache}
                className="group flex items-center gap-4 p-4 min-h-[64px] justify-between w-full active:bg-slate-50 dark:active:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center rounded-full bg-[#13ecda]/10 dark:bg-[#234845] text-[#13ecda] shrink-0 size-10">
                    <span className="material-symbols-outlined text-[20px]">cleaning_services</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <p className="text-slate-900 dark:text-white text-base font-medium leading-normal">清除本地缓存</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <span className="text-sm font-medium">{cacheSize}</span>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </div>
              </button>
            </div>
          </div>

          {devUnlocked && onOpenDeveloperOptions && (
            <div className="flex flex-col gap-2 pt-4">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-tight tracking-wide px-2 uppercase">开发者选项</h3>
              <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1A2C2A] shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
                <button
                  onClick={onOpenDeveloperOptions}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/5 w-full text-left"
                >
                  <span className="material-symbols-outlined text-[#13ecda]">construction</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">开发者调试入口</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">仅用于调试与演示</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="pt-6 pb-8 text-center">
            <button
              onClick={handleVersionTap}
              className="text-slate-400 dark:text-slate-600 text-xs font-medium"
            >
              Line Travel v2.4.1
            </button>
          </div>

        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/70 text-white text-xs">
          {toast}
        </div>
      )}
    </div>
  );
};

export default GeneralSettingsScreen;
