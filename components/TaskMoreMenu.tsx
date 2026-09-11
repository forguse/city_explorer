import React from 'react';

interface TaskMoreMenuProps {
  isOpen: boolean;
  taskTitle?: string;
  onClose: () => void;
  onShare: () => void;
  onFavorite: () => void;
  onReport: () => void;
}

const TaskMoreMenu: React.FC<TaskMoreMenuProps> = ({
  isOpen,
  taskTitle = '任务',
  onClose,
  onShare,
  onFavorite,
  onReport
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end max-w-md mx-auto">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
      ></div>

      <div className="relative w-full bg-white dark:bg-[#1a120b] rounded-t-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </div>
        <div className="px-6 pb-4 text-center">
          <h3 className="text-lg font-bold mb-1">任务操作</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{taskTitle}</p>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={onShare}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500">
              <span className="material-symbols-outlined text-2xl">share</span>
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-base text-gray-900 dark:text-white">分享任务</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">发送给好友或社区</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>

          <button
            onClick={onFavorite}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-base text-gray-900 dark:text-white">加入收藏</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">收藏后随时挑战</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>

          <button
            onClick={onReport}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500">
              <span className="material-symbols-outlined text-2xl">flag</span>
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-base text-gray-900 dark:text-white">举报任务</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">反馈不适内容</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskMoreMenu;
