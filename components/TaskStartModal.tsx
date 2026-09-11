import React from 'react';

interface TaskStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartNow: () => void;
  onAddToFavorites: () => void;
  taskTitle?: string;
}

const TaskStartModal: React.FC<TaskStartModalProps> = ({ 
  isOpen, 
  onClose, 
  onStartNow,
  onAddToFavorites,
  taskTitle = '任务'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end max-w-md mx-auto">
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
      ></div>
      
      <div className="relative w-full bg-white dark:bg-[#1a120b] rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2" onClick={onClose}>
          <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></div>
        </div>
        
        {/* Header */}
        <div className="px-6 pb-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center shadow-lg shadow-[#0ea5e9]/30">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </div>
          <h3 className="text-xl font-bold mb-1">准备出发</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">选择你的挑战方式</p>
        </div>
        
        {/* Options */}
        <div className="px-6 pb-8 flex flex-col gap-3">
          {/* 立即出发 */}
          <button 
            onClick={onStartNow}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-lg shadow-[#0ea5e9]/30 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-white/20">
              <span className="material-symbols-outlined text-2xl">directions_run</span>
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-lg">立即出发</h4>
              <p className="text-sm text-white/80">马上开始这个挑战</p>
            </div>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          
          {/* 稍后执行 */}
          <button 
            onClick={onClose}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500">
              <span className="material-symbols-outlined text-2xl">schedule</span>
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">稍后执行</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">安排到日程中</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>
          
          {/* 加入收藏 */}
          <button 
            onClick={onAddToFavorites}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">加入收藏</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">以后再来挑战</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskStartModal;