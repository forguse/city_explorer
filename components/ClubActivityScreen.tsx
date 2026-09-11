import React, { useState, useEffect } from 'react';
import { club as clubApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ClubActivityScreenProps {
  onBack: () => void;
  clubId?: string; // 可选：如果传入则只显示该社团的活动
  onEventDetail?: (event: any) => void;
}

interface ActivityItem {
  _id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  location?: { name?: string; address?: string };
  targetCities?: string[];
  timeConfig?: {
    eventStartDate?: string;
    eventEndDate?: string;
    maxParticipants?: number;
  };
  clubId?: { _id: string; name: string; coverUrl?: string };
  participantCount: number;
  maxParticipants: number;
  isRegistered: boolean;
  userExecutionId?: string;
}

const ClubActivityScreen: React.FC<ClubActivityScreenProps> = ({
  onBack,
  clubId,
  onEventDetail
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);

  // 获取活动状态
  const getEventStatus = (activity: ActivityItem) => {
    const now = new Date();
    const start = activity.timeConfig?.eventStartDate
      ? new Date(activity.timeConfig.eventStartDate)
      : null;
    const end = activity.timeConfig?.eventEndDate
      ? new Date(activity.timeConfig.eventEndDate)
      : null;

    if (start && now < start) return 'preparing';
    if (end && now > end) return 'ended';
    return 'ongoing';
  };

  // 计算倒计时文本
  const getCountdownText = (activity: ActivityItem) => {
    const status = getEventStatus(activity);
    const start = activity.timeConfig?.eventStartDate
      ? new Date(activity.timeConfig.eventStartDate)
      : null;

    if (status === 'ongoing') {
      return { text: '进行中', color: 'text-green-600 dark:text-green-400', icon: 'play_circle' };
    }
    if (status === 'ended') {
      return { text: '已结束', color: 'text-gray-400', icon: 'event_busy' };
    }

    if (!start) {
      return { text: '待定', color: 'text-gray-400', icon: 'schedule' };
    }

    const now = new Date().getTime();
    const diff = start.getTime() - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return { text: `${days}天${hours}小时后`, color: 'text-blue-600 dark:text-blue-400', icon: 'schedule' };
    } else if (hours > 0) {
      return { text: `${hours}小时${minutes}分后`, color: 'text-orange-600 dark:text-orange-400', icon: 'schedule' };
    } else {
      return { text: `${minutes}分钟后`, color: 'text-red-600 dark:text-red-400', icon: 'schedule' };
    }
  };

  // 获取活动数据
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await clubApi.getActivities();
        let data = response.data || [];

        // 如果指定了 clubId，则过滤
        if (clubId) {
          data = data.filter((a: ActivityItem) => {
            const actClubId = typeof a.clubId === 'object' ? a.clubId._id : a.clubId;
            return actClubId === clubId;
          });
        }

        setActivities(data);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [clubId]);

  // 定时刷新倒计时
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 按状态分组
  const ongoingActivities = activities.filter(a => getEventStatus(a) === 'ongoing');
  const preparingActivities = activities.filter(a => getEventStatus(a) === 'preparing');

  const handleActivityClick = (activity: ActivityItem) => {
    onEventDetail?.(activity);
  };

  // 渲染活动卡片
  const renderActivityCard = (activity: ActivityItem) => {
    const countdown = getCountdownText(activity);
    const status = getEventStatus(activity);
    const isFull = activity.participantCount >= activity.maxParticipants;
    const locationText = activity.targetCities?.length
      ? activity.targetCities.join(' / ')
      : activity.location?.name || activity.location?.address || '待定';

    return (
      <button
        key={activity._id}
        onClick={() => handleActivityClick(activity)}
        className={`w-full text-left bg-white dark:bg-[#2d241c] border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md ${
          status === 'ongoing'
            ? 'border-green-200 dark:border-green-800'
            : status === 'ended'
            ? 'border-gray-200 dark:border-gray-700 opacity-60'
            : 'border-gray-100 dark:border-gray-800'
        }`}
      >
        {/* 封面图 */}
        <div className="relative h-32 bg-gray-100 dark:bg-gray-800">
          {activity.coverImageUrl ? (
            <CapacitorImage
              src={getImageUrl(activity.coverImageUrl)}
              alt={activity.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-300 text-4xl">local_activity</span>
            </div>
          )}

          {/* 状态标签 */}
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
            status === 'ongoing'
              ? 'bg-green-500 text-white'
              : status === 'ended'
              ? 'bg-gray-500 text-white'
              : 'bg-blue-500 text-white'
          }`}>
            <span className="material-symbols-outlined text-[12px]">{countdown.icon}</span>
            {countdown.text}
          </div>

          {/* 已报名标签 */}
          {activity.isRegistered && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold bg-orange-500 text-white">
              已报名
            </div>
          )}

          {/* 社团名称 */}
          {activity.clubId && typeof activity.clubId === 'object' && (
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-medium bg-black/50 text-white backdrop-blur-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">groups</span>
              {activity.clubId.name}
            </div>
          )}
        </div>

        {/* 内容区 */}
        <div className="p-3">
          <h3 className="font-bold text-sm line-clamp-1 mb-1">{activity.title}</h3>

          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            <span className="line-clamp-1">{locationText}</span>
          </div>

          {/* 时间信息 */}
          {activity.timeConfig?.eventStartDate && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span className="material-symbols-outlined text-[14px]">event</span>
              <span>
                {new Date(activity.timeConfig.eventStartDate).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}

          {/* 人数信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs">
              <span className="material-symbols-outlined text-[14px] text-gray-400">group</span>
              <span className={isFull ? 'text-red-500 font-bold' : 'text-gray-500'}>
                {activity.participantCount}/{activity.maxParticipants}
              </span>
              {isFull && <span className="text-red-500 text-[10px]">已满</span>}
            </div>

            <span className="material-symbols-outlined text-gray-300 text-lg">chevron_right</span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen w-full">
      <div className="relative flex flex-col min-h-screen w-full bg-white dark:bg-[#2d241c] overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#2d241c]/90 backdrop-blur border-b border-gray-100 dark:border-gray-800 w-full">
          <div className="flex items-center px-4 py-3 gap-3 w-full">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold flex-1">社团活动</h1>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span className="material-symbols-outlined text-[16px]">event</span>
              <span>{activities.length} 个活动</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-400 mt-4">加载中...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="material-symbols-outlined text-gray-300 text-6xl mb-4">event_busy</span>
              <p className="text-gray-400 text-center">暂无社团活动</p>
              <p className="text-gray-400 text-xs text-center mt-1">加入社团后可在这里查看活动</p>
            </div>
          ) : (
            <>
              {/* 进行中的活动 */}
              {ongoingActivities.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-green-500 text-[20px]">play_circle</span>
                    <h2 className="text-sm font-bold">进行中</h2>
                    <span className="text-xs text-gray-400">{ongoingActivities.length} 个</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ongoingActivities.map(renderActivityCard)}
                  </div>
                </section>
              )}

              {/* 准备中的活动 */}
              {preparingActivities.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-blue-500 text-[20px]">schedule</span>
                    <h2 className="text-sm font-bold">即将开始</h2>
                    <span className="text-xs text-gray-400">{preparingActivities.length} 个</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {preparingActivities.map(renderActivityCard)}
                  </div>
                </section>
              )}

              {/* 如果没有进行中和准备中的活动 */}
              {ongoingActivities.length === 0 && preparingActivities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                  <span className="material-symbols-outlined text-gray-300 text-6xl mb-4">event_available</span>
                  <p className="text-gray-400 text-center">暂无进行中或即将开始的活动</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ClubActivityScreen;
