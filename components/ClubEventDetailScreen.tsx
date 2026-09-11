import React, { useState, useEffect } from 'react';
import { club as clubApi, execution as executionApi } from '../services/api';

interface ClubEventDetailScreenProps {
  onBack: () => void;
  event?: any;
  clubId?: string;
  onRegisterSuccess?: (event: any) => void;
  onStartTask?: (task: any) => void;
}

const ClubEventDetailScreen: React.FC<ClubEventDetailScreenProps> = ({
  onBack,
  event,
  clubId,
  onRegisterSuccess,
  onStartTask
}) => {
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(18);
  const [userExecutionId, setUserExecutionId] = useState<string | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const data = event || {
    _id: null,
    title: '未知活动',
    timeConfig: null,
    location: '待定',
    description: ''
  };

  const taskClubId = clubId || data.clubId?._id || data.clubId;

  // Get event status
  const getEventStatus = () => {
    const now = new Date();
    const start = data.timeConfig?.eventStartDate ? new Date(data.timeConfig.eventStartDate) : null;
    const end = data.timeConfig?.eventEndDate ? new Date(data.timeConfig.eventEndDate) : null;

    if (start && now < start) return 'preparing';
    if (end && now > end) return 'ended';
    return 'ongoing';
  };

  const eventStatus = getEventStatus();

  // Check registration status
  useEffect(() => {
    if (data.isRegistered !== undefined) {
      setRegistered(data.isRegistered);
      setUserExecutionId(data.userExecutionId || null);
    }
    if (data.participantCount !== undefined) {
      setParticipantCount(data.participantCount);
    }
    if (data.maxParticipants !== undefined) {
      setMaxParticipants(data.maxParticipants);
    } else if (data.timeConfig?.maxParticipants !== undefined) {
      setMaxParticipants(data.timeConfig.maxParticipants);
    }
  }, [data]);

  const handleRegister = async () => {
    if (!data._id || !taskClubId) {
      alert('活动信息不完整');
      return;
    }

    if (eventStatus === 'ended') {
      alert('活动已结束');
      return;
    }

    if (participantCount >= maxParticipants) {
      alert('活动人数已满');
      return;
    }

    setLoading(true);
    try {
      const response = await clubApi.registerActivity(taskClubId, data._id);
      setRegistered(true);
      setUserExecutionId(response.data._id);
      setParticipantCount(prev => prev + 1);
      alert('报名成功！活动开始后可在任务详情页参与。');
      onRegisterSuccess?.(data);
    } catch (err: any) {
      console.error('Registration failed:', err);
      alert(err.response?.data?.error || '报名失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!data._id || !taskClubId) return;
    if (!confirm('确定要取消报名吗？')) return;

    setCanceling(true);
    try {
      await clubApi.cancelRegistration(taskClubId, data._id);
      setRegistered(false);
      setUserExecutionId(null);
      setParticipantCount(prev => Math.max(0, prev - 1));
      alert('已取消报名');
    } catch (err: any) {
      console.error('Cancel failed:', err);
      alert(err.response?.data?.error || '取消失败，请重试');
    } finally {
      setCanceling(false);
    }
  };

  const handleStartTask = () => {
    if (onStartTask) {
      onStartTask(data);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '待定';
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()} ${weekday} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getLocation = () => {
    if (typeof data.location === 'object') {
      return data.location.name || '待定';
    }
    return data.location || '待定';
  };

  const isFull = participantCount >= maxParticipants;

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen">
      <div className="relative flex flex-col min-h-screen w-full bg-white dark:bg-[#2d241c] overflow-hidden">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#2d241c]/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center px-4 py-3 gap-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold flex-1">活动详情</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            {/* 状态标签 */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                eventStatus === 'preparing' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                eventStatus === 'ongoing' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {eventStatus === 'preparing' ? '准备中' :
                 eventStatus === 'ongoing' ? '进行中' : '已结束'}
              </span>
              <span className={`text-xs ${isFull ? 'text-red-500' : 'text-gray-500'}`}>
                {participantCount}/{maxParticipants} 人已报名
              </span>
            </div>

            <h2 className="text-xl font-bold">{data.title}</h2>

            {/* 时间信息 */}
            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">event</span>
                开始：{formatDate(data.timeConfig?.eventStartDate)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">event_busy</span>
                结束：{formatDate(data.timeConfig?.eventEndDate)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {getLocation()}
              </p>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">
              {data.description || '暂无活动介绍'}
            </p>

            {/* 社团信息 */}
            {data.clubId && typeof data.clubId === 'object' && (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <span className="material-symbols-outlined text-[14px]">groups</span>
                {data.clubId.name}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="mt-4 space-y-2">
              {eventStatus === 'ended' ? (
                <div className="w-full px-4 py-3 rounded-xl text-sm font-bold text-center bg-gray-100 dark:bg-gray-800 text-gray-500">
                  活动已结束
                </div>
              ) : registered ? (
                <>
                  {eventStatus === 'ongoing' && (
                    <button
                      onClick={handleStartTask}
                      className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-[#0ea5e9] text-white hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      进入任务
                    </button>
                  )}
                  <button
                    onClick={handleCancelRegistration}
                    disabled={canceling}
                    className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {canceling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        取消中...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        取消报名
                      </>
                    )}
                  </button>
                  <div className="text-center text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    已报名，{eventStatus === 'preparing' ? '活动开始后可进入任务' : '可以进入任务了'}
                  </div>
                </>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={loading || isFull}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    isFull
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-[#0ea5e9] text-white hover:bg-sky-600'
                  } disabled:opacity-50`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      报名中...
                    </>
                  ) : isFull ? (
                    '名额已满'
                  ) : (
                    '报名参加'
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClubEventDetailScreen;
