import React from 'react';

interface BottomNavigationProps {
  onCommunity: () => void;
  onProfile: () => void;
  onMap: () => void;
  onHome: () => void;
  onMyTasks: () => void;
  currentTab?: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ onCommunity, onProfile, onMap, onHome, onMyTasks, currentTab = 'home' }) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 h-20 bg-[#f8fafc] dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-6 pb-2 z-40 transition-colors duration-300">
      <button 
        onClick={onMyTasks}
        className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'my-tasks' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
      >
        <span className="material-symbols-outlined" style={currentTab === 'my-tasks' ? { fontVariationSettings: "'FILL' 1" } : {}}>assignment</span>
        <span className="text-[10px] font-bold">我的任务</span>
      </button>
      
      <button
        onClick={onHome}
        className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'home' ? 'text-[#16a34a]' : 'text-[#16a34a]/60 hover:text-[#16a34a]'}`}
      >
        <span className="material-symbols-outlined" style={currentTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>explore</span>
        <span className="text-[10px] font-bold">探索</span>
      </button>
      
      <button
        onClick={onCommunity}
        className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'community' ? 'text-[#0ea5e9]' : 'text-[#0ea5e9]/60 hover:text-[#0ea5e9]'}`}
      >
        <span className="material-symbols-outlined" style={currentTab === 'community' ? { fontVariationSettings: "'FILL' 1" } : {}}>forum</span>
        <span className="text-[10px] font-bold">社区</span>
      </button>
      
      <button 
        onClick={onProfile}
        className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'profile' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
      >
        <span className="material-symbols-outlined" style={currentTab === 'profile' ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
        <span className="text-[10px] font-bold">个人</span>
      </button>
    </nav>
  );
};

export default BottomNavigation;
