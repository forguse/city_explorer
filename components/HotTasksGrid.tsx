import React from 'react';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface Task {
  id: string;
  title: string;
  image: string;
  userCount: number; // 用户参与数
  likeCount: number;
  isLiked: boolean;
  isHot: boolean;
}

interface HotTasksGridProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onLikeClick: (e: React.MouseEvent, task: Task) => void;
}

const TaskCard: React.FC<{ task: Task; onClick: () => void; onLike: (e: React.MouseEvent) => void }> = ({ task, onClick, onLike }) => {
  return (
    <div onClick={onClick} className="flex flex-col gap-3 group cursor-pointer">
      <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden shadow-md transition-all duration-500 group-hover:shadow-card-hover group-hover:-translate-y-1">
        <CapacitorImage
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          src={getImageUrl(task.image)}
          alt={task.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

        {/* Hot Label */}
        {task.isHot && (
          <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
            热门
          </div>
        )}
      </div>

      <div className="px-1 space-y-1">
        <h4 className="text-text-main dark:text-white font-[800] text-[1.05rem] leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {task.title}
        </h4>

        <div className="flex items-center justify-between">
          {/* User Count */}
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5 items-center">
              {/* Mock Avatars */}
              <div className="w-4 h-4 rounded-full border border-white dark:border-slate-800 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[8px] text-indigo-600 dark:text-indigo-300">U</div>
              <div className="w-4 h-4 rounded-full border border-white dark:border-slate-800 bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-[8px] text-amber-600 dark:text-amber-300">S</div>
            </div>
            <span className="text-xs font-medium text-text-muted">{task.userCount}人参与</span>
          </div>

          {/* Like Button (Interactive) */}
          <button
            onClick={onLike}
            className="flex items-center gap-1 text-text-muted hover:text-red-500 transition-colors group/like"
          >
            <span
              className={`material-symbols-outlined text-[18px] transition-transform group-active/like:scale-75 ${task.isLiked ? 'text-red-500' : ''}`}
              style={task.isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              favorite
            </span>
            <span className={`text-xs font-bold ${task.isLiked ? 'text-red-500' : ''}`}>
              {task.likeCount > 999 ? (task.likeCount / 1000).toFixed(1) + 'k' : task.likeCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const HotTasksGrid: React.FC<HotTasksGridProps> = ({ tasks, onTaskClick, onLikeClick }) => {
  return (
    <div className="grid grid-cols-2 gap-5">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskClick(task)}
          onLike={(e) => onLikeClick(e, task)}
        />
      ))}
    </div>
  );
};

export default HotTasksGrid;
