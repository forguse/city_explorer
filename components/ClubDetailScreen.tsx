import React, { useState, useEffect } from 'react';
import { club as clubApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ClubDetailScreenProps {
  onBack: () => void;
  club?: any;
  clubId?: string;
  onOpenEvent?: (event: any) => void;
  onCreateActivity?: (clubId: string) => void;
  onViewProfile?: (userId: string) => void;
}

const ClubDetailScreen: React.FC<ClubDetailScreenProps> = ({ onBack, club, clubId, onOpenEvent, onCreateActivity, onViewProfile }) => {
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [clubData, setClubData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [, forceUpdate] = useState(0); // 用于强制刷新倒计时显示

  // 申请状态
  const [applyStatus, setApplyStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  // Announcement editing
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.id || currentUser._id;

  const data = clubData || club || {
    _id: clubId,
    name: '加载中...',
    members: [],
    city: '',
    coverUrl: '',
    description: '',
    announcement: '',
    president: null
  };

  const isPresident = data.president && (
    (typeof data.president === 'string' ? data.president : data.president._id) === currentUserId
  );

  // Fetch club detail
  useEffect(() => {
    const fetchClubDetail = async () => {
      const id = clubId || club?._id;
      if (!id) return;
      try {
        const response = await clubApi.getDetail(id);
        setClubData(response.data);
        setAnnouncementText(response.data.announcement || '');
      } catch (err) {
        console.error('Failed to fetch club detail:', err);
      }
    };
    fetchClubDetail();
  }, [clubId, club?._id]);

  // Check if user has joined
  useEffect(() => {
    if (data.members && currentUserId) {
      const joined = data.members.some((m: any) =>
        (typeof m === 'string' ? m : m._id) === currentUserId
      );
      setIsJoined(joined);
    }
  }, [data.members, currentUserId]);

  // Check apply status
  useEffect(() => {
    const checkApplyStatus = async () => {
      const id = clubId || club?._id;
      if (!id || isJoined) return;
      try {
        const response = await clubApi.getApplyStatus(id);
        if (response.data.request) {
          setApplyStatus(response.data.request.status);
        } else {
          setApplyStatus('none');
        }
      } catch (err) {
        console.error('Failed to check apply status:', err);
      }
    };
    checkApplyStatus();
  }, [clubId, club?._id, isJoined]);

  // Fetch tasks for this club
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const response = await clubApi.getClubTasks(data._id, 'active');
        setTasks(response.data);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    if (data._id) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [data._id]);

  const handleApply = async () => {
    if (!data._id) return;

    setApplying(true);
    try {
      await clubApi.apply(data._id);
      setApplyStatus('pending');
      alert('申请已提交，请等待团长审核');
    } catch (err: any) {
      console.error('Failed to apply:', err);
      alert(err.response?.data?.error || '申请失败，请重试');
    } finally {
      setApplying(false);
    }
  };

  const handleLeave = async () => {
    if (!data._id) return;
    if (!confirm('确定要退出社团吗？')) return;

    setLeaving(true);
    try {
      await clubApi.leave(data._id);
      setIsJoined(false);
      // Refresh club data
      const response = await clubApi.getDetail(data._id);
      setClubData(response.data);
      alert('已退出社团');
    } catch (err: any) {
      console.error('Failed to leave club:', err);
      alert(err.response?.data?.error || '退出失败，请重试');
    } finally {
      setLeaving(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!data._id) return;

    setSavingAnnouncement(true);
    try {
      await clubApi.updateAnnouncement(data._id, announcementText);
      setEditingAnnouncement(false);
      // Refresh club data
      const response = await clubApi.getDetail(data._id);
      setClubData(response.data);
    } catch (err: any) {
      console.error('Failed to save announcement:', err);
      alert(err.response?.data?.error || '保存失败，请重试');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDissolve = async () => {
    if (!data._id) return;
    if (!confirm('确定要解散社团吗？此操作不可撤销，社团及所有活动数据将被永久删除。')) return;

    setDissolving(true);
    try {
      await clubApi.dissolve(data._id);
      alert('社团已解散');
      onBack();
    } catch (err: any) {
      console.error('Failed to dissolve club:', err);
      alert(err.response?.data?.error || '解散失败，请重试');
    } finally {
      setDissolving(false);
    }
  };

  const handleCancelActivity = async (task: any) => {
    if (!data._id || !task._id) return;
    if (!confirm(`确定要取消活动「${task.title}」吗？所有已报名的成员将收到通知。`)) return;

    try {
      await clubApi.cancelActivity(data._id, task._id);
      // Refresh tasks list
      const response = await clubApi.getClubTasks(data._id, 'active');
      setTasks(response.data);
      alert('活动已取消');
    } catch (err: any) {
      console.error('Failed to cancel activity:', err);
      alert(err.response?.data?.error || '取消失败，请重试');
    }
  };

  const getTaskStatus = (task: any) => {
    const now = new Date();
    const start = task.timeConfig?.eventStartDate ? new Date(task.timeConfig.eventStartDate) : null;
    const end = task.timeConfig?.eventEndDate ? new Date(task.timeConfig.eventEndDate) : null;

    if (start && now < start) return 'preparing';
    if (end && now > end) return 'ended';
    return 'ongoing';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 计算距离活动开始的倒计时
  const getCountdownText = (startDate?: string) => {
    if (!startDate) return null;
    const now = new Date().getTime();
    const start = new Date(startDate).getTime();
    const diff = start - now;

    if (diff <= 0) {
      return null; // 已开始，不显示倒计时
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}天${hours}小时后开始`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟后开始`;
    } else {
      return `${minutes}分钟后开始`;
    }
  };

  // 定时器：每分钟刷新倒计时显示
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
            <h1 className="text-lg font-bold flex-1">{data.name}</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="h-44 bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
            {data.coverUrl ? (
              <CapacitorImage
                src={getImageUrl(data.coverUrl)}
                className="w-full h-full object-cover"
                alt={data.name}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-400 text-6xl">groups</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{data.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {data.city || '未知城市'} · {data.members?.length || 0} 位成员
                </p>
              </div>
              {isJoined ? (
                <div className="flex gap-2">
                  {!isPresident && (
                    <button
                      onClick={handleLeave}
                      disabled={leaving}
                      className="px-4 py-2 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {leaving ? '...' : '退出'}
                    </button>
                  )}
                  <span className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-100">
                    {isPresident ? '团长' : '已加入'}
                  </span>
                </div>
              ) : applyStatus === 'pending' ? (
                <span className="px-4 py-2 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  审核中
                </span>
              ) : applyStatus === 'rejected' ? (
                <div className="flex flex-col items-end gap-1">
                  <span className="px-4 py-2 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-500">
                    已拒绝
                  </span>
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="text-xs text-[#0ea5e9] hover:underline"
                  >
                    重新申请
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-[#0ea5e9] text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
                >
                  {applying ? '...' : '申请加入'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {data.description || '暂无介绍'}
            </p>

            {/* 社团公告 */}
            <div className="mt-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-500 text-lg">campaign</span>
                  社团公告
                </h3>
                {isPresident && !editingAnnouncement && (
                  <button
                    onClick={() => setEditingAnnouncement(true)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                )}
              </div>
              {editingAnnouncement ? (
                <div className="space-y-2">
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="输入公告内容..."
                    className="w-full bg-white dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingAnnouncement(false);
                        setAnnouncementText(data.announcement || '');
                      }}
                      className="px-3 py-1 text-xs text-gray-500"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveAnnouncement}
                      disabled={savingAnnouncement}
                      className="px-3 py-1 text-xs bg-amber-500 text-white rounded-full disabled:opacity-50"
                    >
                      {savingAnnouncement ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {data.announcement || '暂无公告'}
                </p>
              )}
            </div>

            {/* 社团成员按钮 */}
            <div className="mt-5">
              <button
                onClick={() => setShowMembersModal(true)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-[#352d24] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0ea5e9] text-lg">group</span>
                  <span className="text-sm font-bold">社团成员</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{data.members?.length || 0} 人</span>
                  <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                </div>
              </button>
            </div>

            {/* 社团活动任务列表 */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">社团活动</h3>
                {isPresident && (
                  <button
                    onClick={() => onCreateActivity?.(data._id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[#0ea5e9] text-white hover:bg-sky-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    发布活动
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 dark:bg-[#241c16] rounded-xl">
                  <span className="material-symbols-outlined text-2xl text-gray-300 mb-1 block">event</span>
                  暂无活动
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tasks.map(task => {
                    const status = getTaskStatus(task);
                    const countdown = status === 'preparing' ? getCountdownText(task.timeConfig?.eventStartDate) : null;
                    return (
                      <div
                        key={task._id}
                        className="relative text-left bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-xl p-4"
                      >
                        {/* 团长取消按钮 */}
                        {isPresident && status !== 'ended' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelActivity(task);
                            }}
                            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                            title="取消活动"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        )}

                        <button
                          onClick={() => onOpenEvent?.(task)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between pr-8">
                            <div className="font-semibold text-sm flex-1">{task.title}</div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${status === 'preparing' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                              status === 'ongoing' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                              {status === 'preparing' ? '准备中' :
                                status === 'ongoing' ? '进行中' : '已结束'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(task.timeConfig?.eventStartDate)} - {formatDate(task.timeConfig?.eventEndDate)}
                          </div>
                          {/* 倒计时显示 */}
                          {countdown && (
                            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-orange-600 dark:text-orange-400">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              <span>{countdown}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {task.participantCount || 0}/{task.maxParticipants || 18} 人已报名
                            </span>
                            <span className="text-xs text-[#0ea5e9] font-semibold">查看详情</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 团长管理区域 - 解散社团 */}
            {isPresident && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={handleDissolve}
                  disabled={dissolving}
                  className="w-full py-3 rounded-xl text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                >
                  {dissolving ? '解散中...' : '解散社团'}
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  解散后社团及所有活动数据将被永久删除
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 成员列表弹窗 */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMembersModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#2d241c] rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold">社团成员</h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {/* 成员列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {data.members?.map((member: any) => {
                  const memberId = typeof member === 'string' ? member : member._id;
                  const memberData = typeof member === 'string' ? null : member;
                  const isCurrentPresident = data.president && (
                    (typeof data.president === 'string' ? data.president : data.president._id) === memberId
                  );
                  return (
                    <button
                      key={memberId}
                      onClick={() => {
                        setShowMembersModal(false);
                        onViewProfile?.(memberId);
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#352d24] transition-colors"
                    >
                      {/* 头像 */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          {memberData?.avatarUrl ? (
                            <CapacitorImage
                              src={getImageUrl(memberData.avatarUrl)}
                              alt={memberData.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-gray-400">person</span>
                            </div>
                          )}
                        </div>
                        {isCurrentPresident && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-amber-500 rounded-full p-0.5">
                            <span className="material-symbols-outlined text-white text-[10px]">star</span>
                          </div>
                        )}
                      </div>
                      {/* 用户信息 */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{memberData?.username || '成员'}</span>
                          {isCurrentPresident && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                              团长
                            </span>
                          )}
                        </div>
                        {memberData?.bio && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {memberData.bio}
                          </p>
                        )}
                      </div>
                      {/* 箭头 */}
                      <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ClubDetailScreen;
