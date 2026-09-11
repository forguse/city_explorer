import React, { useState, useEffect } from 'react';
import { user as userApi } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface HeaderProps {
  onPublish?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onPublish }) => {
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Basic notification state - in real app would fetch unread count
  const [hasNotifications, setHasNotifications] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await userApi.getMe();
        setAvatarUrl(response.data.avatarUrl || '');
      } catch (err) {
        console.error('Failed to fetch header user info:', err);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="sticky top-0 z-30 flex items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-6 py-3 justify-between border-b border-gray-100/50 dark:border-white/5 transition-all duration-300">
      <h2 className="text-text-main dark:text-white text-[1.35rem] font-[800] leading-tight tracking-tight flex-1">
        任务广场
      </h2>
      <div className="flex items-center justify-end gap-3.5">
        <button
          onClick={onPublish}
          className="flex items-center justify-center gap-1 px-3 h-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-colors active:scale-95 mr-1"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span>发布</span>
        </button>

        <button className="relative group flex items-center justify-center rounded-full h-11 w-11 bg-white/80 dark:bg-slate-800 shadow-sm hover:shadow-md ring-1 ring-gray-100 dark:ring-gray-700 text-text-main dark:text-white transition-all active:scale-95">
          <span className="material-symbols-outlined text-[24px] group-hover:text-primary transition-colors">
            notifications
          </span>
          {hasNotifications && (
            <span className="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-800"></span>
          )}
        </button>
        <button className="flex items-center justify-center overflow-hidden rounded-full h-11 w-11 ring-2 ring-white dark:ring-slate-700 shadow-md transition-transform active:scale-95 hover:ring-primary/30">
          <CapacitorImage
            alt="User Profile"
            className="h-full w-full object-cover"
            src={getImageUrl(avatarUrl) || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
          />
        </button>
      </div>
    </div>
  );
};

export default Header;
