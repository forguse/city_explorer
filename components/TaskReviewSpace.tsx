
import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { task, user, club } from '../services/api';

interface TaskReviewSpaceProps {
  onBack: () => void;
  onTaskDetail?: (id: string) => void;
}

interface PendingTask {
  _id: string;
  title: string;
  description: string;
  location: { name: string };
  coverImageUrl?: string;
  difficulty: number;
  author: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  reviewCount: number;
  reportCount: number;
  createdAt: string;
  clubId?: string | { _id: string; name: string }; // 社团活动标识
  targetCities?: string[];
}

interface PendingClub {
  _id: string;
  name: string;
  coverUrl?: string;
  description?: string;
  city: string;
  president: {
    _id: string;
    username: string;
    level?: number;
    avatarUrl?: string;
  };
  members: any[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

type TabType = 'tasks' | 'clubs';

const TaskReviewSpace: React.FC<TaskReviewSpaceProps> = ({ onBack, onTaskDetail }) => {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [clubs, setClubs] = useState<PendingClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<PendingClub | null>(null);

  // 获取当前用户信息和待审核任务/社团
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 获取当前用户信息
        const userRes = await user.getMe();
        setIsAdmin(userRes.data.isAdmin || false);
        setCurrentUserId(userRes.data._id);

        // 获取待审核任务
        const tasksRes = await task.getPending();
        setTasks(tasksRes.data);

        // 获取待审核社团
        const clubsRes = await club.getPending();
        setClubs(clubsRes.data);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.error || '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 审核通过
  const handleApprove = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await task.review(taskId, 'approve');
      // 从列表中移除
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 拒绝任务（管理员）
  const handleReject = async (taskId: string) => {
    if (!confirm('确定要拒绝此任务吗？')) return;
    try {
      setActionLoading(taskId);
      await task.review(taskId, 'reject');
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 社团审核通过
  const handleApproveClub = async (clubId: string) => {
    try {
      setActionLoading(clubId);
      await club.review(clubId, 'approve');
      // 从列表中移除
      setClubs(prev => prev.filter(c => c._id !== clubId));
      alert('社团已通过审核');
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 拒绝社团（管理员）
  const handleRejectClub = async (clubId: string) => {
    if (!confirm('确定要拒绝此社团吗？')) return;
    try {
      setActionLoading(clubId);
      await club.review(clubId, 'reject');
      setClubs(prev => prev.filter(c => c._id !== clubId));
      alert('社团已被拒绝');
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 举报任务
  const handleReport = async (taskId: string) => {
    if (!confirm('确定要举报此任务吗？举报后无法撤销。')) return;
    try {
      setActionLoading(taskId);
      const res = await task.report(taskId);
      if (res.data.rejected) {
        setTasks(prev => prev.filter(t => t._id !== taskId));
        alert('举报成功，任务已被自动拒绝');
      } else {
        alert(`举报成功，当前举报数：${res.data.reportCount} `);
        // 更新举报数
        setTasks(prev => prev.map(t =>
          t._id === taskId ? { ...t, reportCount: res.data.reportCount } : t
        ));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '举报失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString();
  };

  // 判断是否是自己的任务
  const isOwnTask = (authorId: string) => currentUserId === authorId;

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white min-h-screen font-display">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8fafc]/90 dark:bg-[#0f172a]/90 backdrop-blur-md px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">审核空间</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAdmin ? '管理员模式 · 可直接审核' : '浏览模式 · 仅查看'}
            </p>
          </div>
          {isAdmin && (
            <span className="px-2 py-1 bg-emerald-500 text-white text-xs rounded-full font-bold">
              管理员
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tasks'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            任务审核 {tasks.length > 0 && `(${tasks.length})`}
          </button>
          <button
            onClick={() => setActiveTab('clubs')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'clubs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            社团审核 {clubs.length > 0 && `(${clubs.length})`}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pb-8">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">加载中...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-4">error_outline</span>
            <p className="text-slate-500 dark:text-slate-400">{error}</p>
          </div>
        )}

        {/* Empty - Tasks */}
        {!loading && !error && activeTab === 'tasks' && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-5xl text-emerald-500 mb-4">verified</span>
            <p className="text-slate-500 dark:text-slate-400">暂无待审核任务</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">所有任务都已处理完毕</p>
          </div>
        )}

        {/* Empty - Clubs */}
        {!loading && !error && activeTab === 'clubs' && clubs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-5xl text-emerald-500 mb-4">verified</span>
            <p className="text-slate-500 dark:text-slate-400">暂无待审核社团</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">所有社团都已处理完毕</p>
          </div>
        )}

        {/* Task List */}
        {!loading && !error && activeTab === 'tasks' && tasks.length > 0 && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-2xl font-bold text-emerald-500">{tasks.length}</p>
                <p className="text-xs text-slate-500">待审核</p>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
              <div className="text-center flex-1">
                <p className="text-2xl font-bold text-orange-500">
                  {tasks.filter(t => t.reportCount > 0).length}
                </p>
                <p className="text-xs text-slate-500">有举报</p>
              </div>
            </div>

            {/* Tasks */}
            {tasks.map((item) => {
              const isOwn = isOwnTask(item.author._id);
              const isLoading = actionLoading === item._id;

              return (
                <div
                  key={item._id}
                  className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Task Content - Clickable */}
                  <div
                    onClick={() => onTaskDetail?.(item._id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Cover Image */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                        {item.coverImageUrl ? (
                          <CapacitorImage src={getImageUrl(item.coverImageUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-slate-400">image</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {item.clubId && (
                            <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-[10px] rounded">
                              社团活动
                            </span>
                          )}
                          {isOwn && (
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] rounded">
                              我的
                            </span>
                          )}
                          {item.reportCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] rounded">
                              {item.reportCount}举报
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base mb-1 truncate">{item.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.targetCities && item.targetCities.length > 0
                            ? `${item.targetCities[0]}${item.targetCities.length > 1 ? ` 等${item.targetCities.length}城` : ''} `
                            : (item.location?.name || '未知地点')}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <span>{item.author.username}</span>
                          <span>·</span>
                          <span>{formatTime(item.createdAt)}</span>
                          <span>·</span>
                          <span>{item.reviewCount}/20 通过</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
                    {/* Left: Report button (subtle) */}
                    {!isOwn && (
                      <button
                        onClick={() => handleReport(item._id)}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-red-500 transition-colors text-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">flag</span>
                        <span>举报</span>
                      </button>
                    )}
                    {isOwn && <div></div>}

                    {/* Right: Admin actions or view only */}
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleReject(item._id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? '...' : '拒绝'}
                          </button>
                          <button
                            onClick={() => handleApprove(item._id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? '...' : '通过'}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {isOwn ? '等待审核中...' : '仅管理员可审核'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Club List */}
        {!loading && !error && activeTab === 'clubs' && clubs.length > 0 && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-2xl font-bold text-emerald-500">{clubs.length}</p>
                <p className="text-xs text-slate-500">待审核</p>
              </div>
            </div>

            {/* Clubs */}
            {clubs.map((item) => {
              const isOwn = currentUserId === item.president._id;
              const isLoading = actionLoading === item._id;

              return (
                <div
                  key={item._id}
                  className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Club Content - Clickable */}
                  <div
                    onClick={() => setSelectedClub(item)}
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Cover Image */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                        {item.coverUrl ? (
                          <CapacitorImage src={getImageUrl(item.coverUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-slate-400">groups</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isOwn && (
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] rounded">
                              我的
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base mb-1 truncate">{item.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.city}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <span>{item.president.username}</span>
                          <span>·</span>
                          <span>{formatTime(item.createdAt)}</span>
                          <span>·</span>
                          <span>{item.members.length} 成员</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
                    <div></div>

                    {/* Right: Admin actions or view only */}
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleRejectClub(item._id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? '...' : '拒绝'}
                          </button>
                          <button
                            onClick={() => handleApproveClub(item._id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? '...' : '通过'}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {isOwn ? '等待审核中...' : '仅管理员可审核'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Club Detail Modal */}
        {selectedClub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold">社团详情</h2>
                <button
                  onClick={() => setSelectedClub(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Cover Image */}
                <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 mb-4">
                  {selectedClub.coverUrl ? (
                    <CapacitorImage src={getImageUrl(selectedClub.coverUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-slate-400">groups</span>
                    </div>
                  )}
                </div>

                {/* Club Info */}
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">社团名称</label>
                    <p className="text-lg font-bold">{selectedClub.name}</p>
                  </div>

                  {/* City */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">所在城市</label>
                    <p className="text-sm">{selectedClub.city}</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">社团简介</label>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {selectedClub.description || '暂无简介'}
                    </p>
                  </div>

                  {/* President */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">创建者</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        {selectedClub.president.avatarUrl ? (
                          <CapacitorImage src={getImageUrl(selectedClub.president.avatarUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400">person</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{selectedClub.president.username}</p>
                        {selectedClub.president.level && (
                          <p className="text-xs text-slate-400">Lv.{selectedClub.president.level}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Created At */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">申请时间</label>
                    <p className="text-sm">{new Date(selectedClub.createdAt).toLocaleString()}</p>
                  </div>

                  {/* Members Count */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">成员数量</label>
                    <p className="text-sm">{selectedClub.members.length} 人</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Actions */}
              {isAdmin && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                  <button
                    onClick={() => {
                      handleRejectClub(selectedClub._id);
                      setSelectedClub(null);
                    }}
                    disabled={actionLoading === selectedClub._id}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    拒绝
                  </button>
                  <button
                    onClick={() => {
                      handleApproveClub(selectedClub._id);
                      setSelectedClub(null);
                    }}
                    disabled={actionLoading === selectedClub._id}
                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    通过
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TaskReviewSpace;
