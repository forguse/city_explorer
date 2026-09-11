import React, { useState, useEffect, useRef } from 'react';
import { task as taskApi, execution, user as userApi, community, club as clubApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import UserMiniProfileModal from './UserMiniProfileModal';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface TaskPreviewScreenProps {
  onBack: () => void;
  taskId?: string;
  onStart?: (taskId: string) => void;
  onPrep?: (task: any, options?: { autoStart?: boolean }) => void;
  onUserProfile?: (userId: string) => void;
  onRemix?: (taskId?: string) => void;
  onShare?: () => void;
  onPostDetail?: (postId: string) => void;
  onSchedule?: (taskId: string) => void;
  fromFavorites?: boolean;
  fromScheduled?: boolean;
  fromOngoing?: boolean;
}

// 备战清单只读弹窗
const PrepListModal = ({ task, onClose }: { task: any, onClose: () => void }) => {
  const prepItems = task.prepListConfig || task.prepList || [];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end max-w-md mx-auto">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0" onClick={onClose}>
          <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 text-center flex-shrink-0">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-500 text-3xl">checklist</span>
          </div>
          <h3 className="text-xl font-bold mb-1">备战清单</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            完成此挑战建议准备以下 {prepItems.length} 项物资
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-3">
          {prepItems.length > 0 ? (
            prepItems.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined">
                    {item.type === 'ticket' ? 'confirmation_number' :
                      item.type === 'transport' ? 'train' :
                        item.type === 'hotel' ? 'hotel' : 'backpack'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                    {item.title}
                  </h4>
                  {item.defaultNote && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {item.defaultNote}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400">
              <p>无需特别准备</p>
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 pb-8">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};

// 评论弹窗组件
const CommentModal = ({ postId, onClose, onUserClick }: { postId: string, onClose: () => void, onUserClick?: (user: any) => void }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await community.getPostById(postId);
        setComments(res.data.comments || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [postId]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      await community.commentPost(postId, input);
      setInput('');
      const res = await community.getPostById(postId);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error('Comment failed:', err);
      alert('评论发送失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end max-w-md mx-auto">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-[24px] shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8" />
          <h3 className="font-bold text-center">评论 ({comments.length})</h3>
          <button onClick={onClose} className="w-8 flex justify-center">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[50vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-slate-400">progress_activity</span>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment: any, index: number) => (
              <div key={comment._id || index} className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full shrink-0 overflow-hidden cursor-pointer"
                  onClick={() => {
                    if (onUserClick && comment.author?._id) {
                      onUserClick({
                        id: comment.author._id,
                        name: comment.author.username || '用户',
                        avatar: comment.author.avatarUrl || '',
                        bio: comment.author.bio || ''
                      });
                    }
                  }}
                >
                  <CapacitorImage
                    src={comment.author?.avatarUrl ? getImageUrl(comment.author.avatarUrl) : undefined}
                    alt={comment.author?.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {comment.author?.username || '用户'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-200 dark:text-slate-700">chat_bubble_outline</span>
              <p className="text-sm">暂无评论，快来抢沙发~</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-8">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="说点什么..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#0ea5e9]"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || submitting}
              className={`w-12 h-10 rounded-full flex items-center justify-center transition-colors ${input.trim()
                ? 'bg-[#0ea5e9] text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}
            >
              {submitting ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">send</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskPreviewScreen: React.FC<TaskPreviewScreenProps> = ({
  onBack,
  taskId,
  onStart,
  onPrep,
  onUserProfile,
  onRemix,
  onShare,
  onPostDetail,
  onSchedule,
  fromFavorites = false,
  fromScheduled = false,
  fromOngoing = false
}) => {
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [postSort, setPostSort] = useState<'hot' | 'recent'>('hot');
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showPrepConfirm, setShowPrepConfirm] = useState(false);
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [prepProgress, setPrepProgress] = useState<{ completed: number; total: number; isCompleted: boolean } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 社团活动相关状态
  const [isClubActivity, setIsClubActivity] = useState(false);
  const [clubActivityInfo, setClubActivityInfo] = useState<{
    participantCount: number;
    maxParticipants: number;
    isRegistered: boolean;
    registrationStatus: string | null;
    clubName: string;
    isPresident: boolean;
  } | null>(null);
  const [registering, setRegistering] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getPrepSummary = (taskData: any, progressList?: any[]) => {
    const configList = taskData?.prepListConfig || taskData?.prepList || [];
    const baseIds = new Set(
      configList.map((item: any) => item._id || item.configId || item.title).filter(Boolean)
    );
    const progress = Array.isArray(progressList) ? progressList : [];
    const extraCount = progress.filter((p: any) => {
      const id = p.prepItemId || p.configId || p.title;
      return id && !baseIds.has(id);
    }).length;
    const baseCount = configList.length;
    const total = baseCount > 0 ? baseCount + extraCount : (progress.length > 0 ? progress.length : 5);
    const completed = progress.filter((p: any) => p.isCompleted).length;
    return {
      completed,
      total,
      isCompleted: total > 0 && completed >= total
    };
  };

  useEffect(() => {
    if (!taskId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const taskRes = await taskApi.getById(taskId);
        const taskData = taskRes.data;
        setTask(taskData);

        // 初始化点赞状态
        setIsLiked(taskData.isLiked || false);
        setLikeCount(taskData.likeCount || 0);

        // 检查是否是社团活动
        if (taskData.clubId) {
          setIsClubActivity(true);
          if (taskData.clubActivityInfo) {
            console.log('[TaskPreview] Club Activity Info:', taskData.clubActivityInfo);
            setClubActivityInfo(taskData.clubActivityInfo);
          }
        }

        let savedTaskRecord: any = null;
        let isTaskSaved = false;
        try {
          const savedRes = await userApi.getSavedTasks();
          const savedTasks = savedRes.data || [];
          const savedIds = savedTasks.map((t: any) => t._id || t.id);
          isTaskSaved = savedIds.includes(taskId);
          setIsSaved(isTaskSaved);
          savedTaskRecord = savedTasks.find((t: any) => (t._id || t.id) === taskId);
        } catch (err) {
          console.error('Failed to check saved status:', err);
        }

        if (fromFavorites || fromScheduled) {
          try {
            const execRes = await execution.getOrCreate(taskId);
            setPrepProgress(getPrepSummary(taskData, execRes.data?.prepProgress));
          } catch (prepErr) {
            console.error('Failed to fetch prep progress:', prepErr);
            if (savedTaskRecord) {
              setPrepProgress(getPrepSummary(taskData, savedTaskRecord.prepProgress));
            }
          }
        } else if (isTaskSaved && savedTaskRecord) {
          setPrepProgress(getPrepSummary(taskData, savedTaskRecord.prepProgress));
        }
      } catch (err) {
        console.error('Failed to fetch task:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [taskId, fromFavorites, fromScheduled]);

  useEffect(() => {
    if (!taskId) return;
    const fetchPosts = async () => {
      try {
        const postsRes = await community.getPostsByTask(taskId, { sort: postSort });
        setRelatedPosts(postsRes.data.slice(0, 6));
      } catch (err) {
        console.error('Failed to fetch related posts:', err);
      }
    };
    fetchPosts();
  }, [taskId, postSort]);

  const startAndNavigate = async () => {
    if (!task) return;

    if (task.status !== 'ongoing') {
      try {
        const targetId = task.executionId || task.id || task._id;
        await execution.start(targetId);
      } catch (error) {
        console.error('Failed to start task:', error);
      }
    }
    const targetId = task.id || task._id;
    // Navigate using onStart
    onStart?.(targetId);
  };

  const handleStartTask = async () => {
    if (!task) return;

    // Check for prep list config
    if (task.prepListConfig && task.prepListConfig.length > 0) {
      setShowPrepConfirm(true);
    } else {
      startAndNavigate();
    }
  };

  const handleConfirmPrep = () => {
    onPrep?.(task, { autoStart: true });
    setShowPrepConfirm(false);
  };

  const handleConfirmDirectStart = () => {
    startAndNavigate();
    setShowPrepConfirm(false);
  };

  const handleToggleSave = async () => {
    if (!taskId) return;
    try {
      const res = await userApi.toggleSaveTask(taskId);
      setIsSaved(res.data.isSaved);
    } catch (err) {
      console.error('Toggle save failed:', err);
    }
  };

  const handleLike = async () => {
    if (!taskId) return;
    try {
      // 乐观更新
      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

      const response = await taskApi.like(String(taskId));
      // 使用服务器返回的数据更新状态
      setIsLiked(response.data.isLiked);
      setLikeCount(response.data.likeCount);
    } catch (err) {
      console.error('Like failed:', err);
      // 回滚
      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

  const openSchedulePicker = () => {
    const now = new Date();
    setScheduleDate(now.toISOString().slice(0, 10));
    setScheduleTime(now.toTimeString().slice(0, 5));
    setShowScheduleModal(true);
  };

  const confirmSchedule = async () => {
    if (!taskId || !scheduleDate || !scheduleTime) {
      alert('请选择预约时间');
      return;
    }
    try {
      const localDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
      await execution.schedule(taskId, localDateTime.toISOString());
      setShowScheduleModal(false);
      alert('预约成功！可在"我的任务-已预约"中查看');
    } catch (err: any) {
      console.error('Schedule failed:', err);
      const errorMessage = err.response?.data?.error || '预约失败，请重试';
      alert(errorMessage);
    }
  };

  const handlePrep = () => {
    // If from Favorites or Scheduled (My Tasks), go to interactive prep screen
    if (fromFavorites || fromScheduled) {
      // We can pass the full task object if needed, or just ID
      // navigateToTaskPrep expects a task object
      if (onPrep && task) {
        onPrep(task);
      }
    } else {
      // Otherwise show read-only modal
      if (task && (task.prepListConfig?.length || task.prepList?.length)) {
        setShowPrepModal(true);
      }
    }
  };

  const handleShare = async () => {
    setShowActionSheet(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: task?.title || '任务分享',
          text: `来看看这个任务：${task?.title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
    onShare?.();
  };

  // 举报任务
  const handleReportTask = async () => {
    if (!taskId) return;
    setShowActionSheet(false);
    const confirmed = window.confirm('确定要举报此任务吗？恶意举报可能会影响您的账号。');
    if (!confirmed) return;
    try {
      await taskApi.report(taskId);
      alert('举报已提交，我们将尽快处理');
    } catch (err: any) {
      console.error('Report task failed:', err);
      alert(err.response?.data?.error || '举报失败，请重试');
    }
  };

  // 社团活动报名
  const handleRegisterActivity = async () => {
    if (!taskId || !task?.clubId || registering) return;

    setRegistering(true);
    try {
      await clubApi.registerActivity(task.clubId, taskId);

      // 检查活动是否已开始
      const now = new Date();
      const startDate = task.timeConfig?.eventStartDate ? new Date(task.timeConfig.eventStartDate) : null;
      const isStarted = startDate && now >= startDate;

      setClubActivityInfo(prev => prev ? {
        ...prev,
        isRegistered: true,
        registrationStatus: isStarted ? 'ongoing' : 'scheduled',
        participantCount: prev.participantCount + 1
      } : null);

      if (isStarted) {
        alert('报名成功！活动已开始，已加入您的进行中任务');
      } else {
        alert('报名成功！活动将在开始时自动进入您的任务列表');
      }
    } catch (err: any) {
      console.error('Register activity failed:', err);
      alert(err.response?.data?.error || '报名失败，请重试');
    } finally {
      setRegistering(false);
    }
  };

  // 取消报名
  const handleCancelRegistration = async () => {
    if (!taskId || !task?.clubId || registering) return;
    if (!confirm('确定要取消报名吗？')) return;

    setRegistering(true);
    try {
      await clubApi.cancelRegistration(task.clubId, taskId);
      setClubActivityInfo(prev => prev ? {
        ...prev,
        isRegistered: false,
        registrationStatus: null,
        participantCount: Math.max(0, prev.participantCount - 1)
      } : null);
      alert('已取消报名');
    } catch (err: any) {
      console.error('Cancel registration failed:', err);
      alert(err.response?.data?.error || '取消失败，请重试');
    } finally {
      setRegistering(false);
    }
  };

  // 格式化活动时间
  const formatActivityTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  // 获取活动状态
  const getActivityStatus = () => {
    if (!task?.timeConfig) return null;
    const now = new Date();
    const start = task.timeConfig.eventStartDate ? new Date(task.timeConfig.eventStartDate) : null;
    const end = task.timeConfig.eventEndDate ? new Date(task.timeConfig.eventEndDate) : null;

    if (end && now > end) return 'ended';
    if (start && now >= start) return 'ongoing';
    if (start && now < start) return 'preparing';
    return null;
  };

  if (loading) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 font-display">
        <div className="flex items-center px-4 py-4">
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl text-[#0ea5e9] animate-spin">progress_activity</span>
            <p className="text-slate-500">加载任务详情...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 font-display">
        <div className="flex items-center px-4 py-4">
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl text-slate-400">error_outline</span>
            <p className="text-slate-500">任务不存在</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-white">
      {/* Header - Fixed */}
      <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleLike}
            className="flex h-10 items-center gap-1 px-3 justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all active:scale-90"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={isLiked ? { fontVariationSettings: "'FILL' 1", color: '#ef4444' } : {}}
            >
              favorite
            </span>
            {likeCount > 0 && (
              <span className="text-sm font-bold">
                {likeCount}
              </span>
            )}
          </button>
          {/* 社团任务不显示收藏按钮 */}
          {!task?.clubId && (
            <button
              onClick={handleToggleSave}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
            >
              <span
                className="material-symbols-outlined"
                style={isSaved ? { fontVariationSettings: "'FILL' 1", color: '#f59e0b' } : {}}
              >
                bookmark
              </span>
            </button>
          )}
          <button
            onClick={() => setShowActionSheet(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
          >
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content - includes cover image */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar">
        {/* Cover Image */}
        <div className="relative w-full h-72 bg-slate-200 flex-shrink-0">
          <div className="absolute inset-0">
            <CapacitorImage
              src={(task.coverImageUrl || task.coverImage) ? getImageUrl(task.coverImageUrl || task.coverImage) : undefined}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-slate-800 rounded-t-[32px] -mt-8 relative z-10 min-h-screen">
          <div className="p-6">
            {/* Title */}
            <h1 className="text-2xl font-bold mb-2">{task.title}</h1>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {task.isAiGenerated && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-600">
                  AI生成
                </span>
              )}
              {task.isOfficial && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600">
                  官方推荐
                </span>
              )}
            </div>

            {/* Author */}
            {task.author && (
              <div
                className="flex items-center gap-3 mb-6 cursor-pointer"
                onClick={() => task.author?._id && setSelectedUser({
                  id: task.author._id,
                  name: task.author.username || '未知用户',
                  avatar: task.author.avatarUrl || '',
                  level: task.author.level || 1,
                  title: task.author.title || '城市探险家',
                  bio: task.author.bio || '',
                  isFollowing: task.author.isFollowing || false
                })}
              >
                <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-slate-200">
                  <CapacitorImage
                    src={task.author.avatarUrl ? getImageUrl(task.author.avatarUrl) : undefined}
                    alt={task.author.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold">{task.author.username || '未知用户'}</p>
                  <p className="text-xs text-slate-500">创建者</p>
                </div>
              </div>
            )}

            {/* Action Button: Favorites ? Remix : Same Challenge */}
            {/* Action Button: Favorites ? Remix : Same Challenge. Hide if Ongoing or Club Activity. */}
            {(fromOngoing || isClubActivity) ? null : (fromFavorites || fromScheduled) ? (
              <button
                onClick={() => onRemix?.(taskId)}
                className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-500 to-slate-700 text-white flex items-center justify-between shadow-lg shadow-slate-400/30 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">alt_route</span>
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold">魔改路线</h4>
                    <p className="text-xs text-white/80">定制专属挑战路线</p>
                  </div>
                </div>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            ) : (
              <button
                onClick={() => setShowChallengeModal(true)}
                className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white flex items-center justify-between shadow-lg shadow-[#0ea5e9]/30 hover:from-[#0284c7] hover:to-[#0369a1] active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">rocket_launch</span>
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold">同款挑战</h4>
                    <p className="text-xs text-white/80">直接挑战或魔改路线</p>
                  </div>
                </div>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            )}

            {/* 社团活动时间显示 */}
            {isClubActivity && task.timeConfig && (
              <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-amber-500">event</span>
                  <h3 className="text-base font-bold text-amber-700 dark:text-amber-400">活动时间</h3>
                  {(() => {
                    const status = getActivityStatus();
                    if (status === 'ended') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500">已结束</span>;
                    if (status === 'ongoing') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">进行中</span>;
                    if (status === 'preparing') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">准备中</span>;
                    return null;
                  })()}
                </div>
                <div className="flex flex-col gap-2 pl-7">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-12">开始</span>
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                      {formatActivityTime(task.timeConfig.eventStartDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-12">截止</span>
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                      {formatActivityTime(task.timeConfig.eventEndDate)}
                    </span>
                  </div>
                </div>
                {clubActivityInfo && (
                  <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between">
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      已报名 {clubActivityInfo.participantCount}/{clubActivityInfo.maxParticipants} 人
                    </span>
                    {clubActivityInfo.clubName && (
                      <span className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">groups</span>
                        {clubActivityInfo.clubName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="mb-5">
              <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#0ea5e9]">description</span>
                任务描述
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-7">
                {task.description || '暂无描述'}
              </p>
            </div>

            {/* Prep List (Always Visible) */}
            <button
              onClick={handlePrep}
              className={`w-full mb-6 p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all border ${prepProgress?.isCompleted
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${prepProgress?.isCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                  <span className="material-symbols-outlined text-xl">
                    {prepProgress?.isCompleted ? 'check_circle' : 'checklist'}
                  </span>
                </div>
                <div className="text-left">
                  <h4 className={`font-bold ${prepProgress?.isCompleted
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-900 dark:text-white'
                    }`}>
                    {prepProgress?.isCompleted ? '备战已完成' : '备战清单'}
                  </h4>
                  <p className={`text-xs ${prepProgress?.isCompleted
                    ? 'text-emerald-600/80 dark:text-emerald-400/80'
                    : 'text-slate-500 dark:text-slate-400'
                    }`}>
                    {prepProgress?.isCompleted
                      ? '物资整装待发，随时可以出发'
                      : `查看 ${task.prepListConfig?.length || task.prepList?.length || 0} 项必备物资`
                    }
                  </p>
                </div>
              </div>
              <span className={`material-symbols-outlined ${prepProgress?.isCompleted ? 'text-emerald-500' : 'text-slate-400'
                }`}>chevron_right</span>
            </button>

            {/* Location (Target Cities) */}
            {(task.targetCities?.length > 0 || task.location) && (
              <div className="mb-5">
                <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-rose-500">location_on</span>
                  地点
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pl-7">
                  <span>
                    {(task.targetCities && task.targetCities.length > 0)
                      ? task.targetCities.join(' / ')
                      : (task.location?.name || task.location?.address || '未知地点')
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Nodes */}
            {task.nodes && task.nodes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-purple-500">timeline</span>
                  任务流程 ({task.nodes.length}步)
                </h3>
                <div className="space-y-3">
                  {task.nodes.map((node: any, index: number) => (
                    <div
                      key={index}
                      className="relative p-4 bg-white dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-sm"
                    >
                      {/* 节点头部：描述 */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">第 {index + 1} 步</span>
                        <p className="text-sm font-medium leading-relaxed">{node.description || `节点 ${index + 1}`}</p>
                      </div>

                      {/* 节点附加信息 */}
                      <div className="mt-2 space-y-1.5">
                        {/* 指定地点 */}
                        {node.location?.name && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <span>地点：{node.location.name}</span>
                          </div>
                        )}

                        {/* 限时信息 */}
                        {node.timeLimit && node.timeLimit.type !== 'none' && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                            <span className="material-symbols-outlined text-[14px]">timer</span>
                            <span>
                              {node.timeLimit.type === 'countdown' && `限时 ${node.timeLimit.countdownMinutes || 30} 分钟内完成`}
                              {node.timeLimit.type === 'timeRange' && `时段 ${node.timeLimit.timeRangeStart || '00:00'} - ${node.timeLimit.timeRangeEnd || '23:59'}`}
                              {node.timeLimit.type === 'deadline' && `${node.timeLimit.deadlineType === 'before' ? '需在' : '需在'} ${node.timeLimit.deadlineTime || '12:00'} ${node.timeLimit.deadlineType === 'before' ? '之前' : '之后'}完成`}
                            </span>
                          </div>
                        )}

                        {/* 问答信息 */}
                        {node.qaModule?.enabled && node.qaModule?.question && (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                            <span className="material-symbols-outlined text-[14px]">quiz</span>
                            <span>问答：{node.qaModule.question}</span>
                          </div>
                        )}
                      </div>

                      {/* 参考图片 */}
                      {node.referenceImageUrl && (
                        <div className="mt-2">
                          <div className="rounded-xl overflow-hidden">
                            <CapacitorImage
                              src={getImageUrl(node.referenceImageUrl)}
                              alt=""
                              className="w-full h-auto max-h-36 object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex justify-around py-4 border-t border-b border-slate-100 dark:border-slate-700 mb-6">
              <div className="text-center">
                <p className="text-lg font-bold text-[#0ea5e9]">{task.completedCount || 0}</p>
                <p className="text-xs text-slate-500">已完成</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{task.savedCount || 0}</p>
                <p className="text-xs text-slate-500">收藏</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{task.nodes?.length || 0}</p>
                <p className="text-xs text-slate-500">节点</p>
              </div>
            </div>

            {/* Related Posts - Hidden for club activities */}
            {!isClubActivity && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-orange-500">local_fire_department</span>
                    相关动态
                  </h3>
                  <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setPostSort('hot')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${postSort === 'hot'
                        ? 'bg-white dark:bg-slate-600 text-[#0ea5e9] shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                    >
                      热门
                    </button>
                    <button
                      onClick={() => setPostSort('recent')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${postSort === 'recent'
                        ? 'bg-white dark:bg-slate-600 text-[#0ea5e9] shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                    >
                      最新
                    </button>
                  </div>
                </div>

                {relatedPosts.length > 0 ? (
                  <div className="space-y-4">
                    {relatedPosts.map((post: any) => (
                      <div
                        key={post._id}
                        className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 tap-highlight-transparent"
                        onClick={() => {
                          if (post._id && onPostDetail) {
                            onPostDetail(post._id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-slate-200">
                            <CapacitorImage
                              src={post.author?.avatarUrl ? getImageUrl(post.author.avatarUrl) : undefined}
                              alt={post.author?.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold">{post.author?.username || '用户'}</p>
                            <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-2">
                          {post.content}
                        </p>
                        {post.imageUrls && post.imageUrls.length > 0 && (
                          <div className={`grid gap-2 mb-3 ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {post.imageUrls.slice(0, 4).map((url: string, idx: number) => (
                              <div
                                key={idx}
                                className={`rounded-xl overflow-hidden bg-slate-200 ${post.imageUrls.length === 1 ? 'aspect-[16/9]' : 'aspect-square'}`}
                              >
                                <CapacitorImage
                                  src={getImageUrl(url)}
                                  alt={`post-img-${idx}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-6 text-slate-500 dark:text-slate-400">
                          <button
                            className="flex items-center gap-1.5 text-xs hover:text-pink-500 transition-colors p-1"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!post._id) return;
                              const wasLiked = post.isLiked;
                              setRelatedPosts(prev => prev.map(p => {
                                if (p._id === post._id) {
                                  return {
                                    ...p,
                                    isLiked: !wasLiked,
                                    likes: wasLiked
                                      ? (p.likes || []).slice(0, -1)
                                      : [...(p.likes || []), 'currentUser']
                                  };
                                }
                                return p;
                              }));
                              try {
                                await community.likePost(post._id);
                              } catch (err) {
                                setRelatedPosts(prev => prev.map(p => {
                                  if (p._id === post._id) {
                                    return {
                                      ...p,
                                      isLiked: wasLiked,
                                      likes: wasLiked
                                        ? [...(p.likes || []), 'currentUser']
                                        : (p.likes || []).slice(0, -1)
                                    };
                                  }
                                  return p;
                                }));
                                console.error('Like failed:', err);
                              }
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-[20px]"
                              style={{ fontVariationSettings: post.isLiked ? "'FILL' 1" : "'FILL' 0", color: post.isLiked ? '#ec4899' : 'inherit' }}
                            >
                              favorite
                            </span>
                            <span>{post.likes?.length || 0}</span>
                          </button>
                          <button
                            className="flex items-center gap-1.5 text-xs hover:text-[#0ea5e9] transition-colors p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePostId(post._id);
                            }}
                          >
                            <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                            <span>{post.comments?.length || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">rate_review</span>
                    <p className="text-sm text-slate-400">暂无动态，完成挑战后发一条吧！</p>
                  </div>
                )}
              </div>
            )}

            <div className="h-20" />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar: Hide if fromOngoing or fromScheduled (already registered) */}
      {!fromOngoing && !fromScheduled && (
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-20">
          {isClubActivity ? (
            // 社团活动底部按钮
            (() => {
              const status = getActivityStatus();
              const isEnded = status === 'ended';
              const isFull = clubActivityInfo && clubActivityInfo.participantCount >= clubActivityInfo.maxParticipants;
              const isRegistered = clubActivityInfo?.isRegistered;
              const isPresident = clubActivityInfo?.isPresident;

              if (isEnded) {
                return (
                  <button
                    disabled
                    className="w-full py-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-500 font-bold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[22px]">event_busy</span>
                    活动已结束
                  </button>
                );
              }

              if (isPresident) {
                return (
                  <button
                    disabled
                    className="w-full py-4 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
                    您是活动发起人
                  </button>
                );
              }

              if (isRegistered) {
                return (
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelRegistration}
                      disabled={registering}
                      className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {registering ? '处理中...' : '取消报名'}
                    </button>
                    <button
                      disabled
                      className="flex-1 py-3.5 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      已报名
                    </button>
                  </div>
                );
              }

              if (isFull) {
                return (
                  <button
                    disabled
                    className="w-full py-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-500 font-bold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[22px]">group_off</span>
                    报名已满
                  </button>
                );
              }

              return (
                <button
                  onClick={handleRegisterActivity}
                  disabled={registering}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
                  {registering ? '报名中...' : '报名参加'}
                </button>
              );
            })()
          ) : (fromFavorites || fromScheduled) ? (
            <div className="flex gap-3">
              <button
                onClick={openSchedulePicker}
                className="flex-1 py-3.5 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">schedule</span>
                预约开始
              </button>
              <button
                onClick={handleStartTask}
                className="flex-1 py-3.5 rounded-xl bg-[#0ea5e9] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#0ea5e9]/30 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                立即开始
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowChallengeModal(true)}
              className="w-full py-4 rounded-2xl bg-[#0ea5e9] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:bg-sky-500 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
              开始探险
            </button>
          )}
        </div>
      )}

      {/* Action Sheet */}
      {showActionSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
          <div onClick={() => setShowActionSheet(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-800 rounded-t-[24px] p-4 pb-8">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>
            <div className="space-y-2">
              <button
                onClick={openSchedulePicker}
                className="w-full py-4 text-left px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-orange-500">schedule</span>
                <span className="font-medium">预约出发</span>
              </button>
              <button
                onClick={() => { setShowActionSheet(false); onRemix?.(taskId); }}
                className="w-full py-4 text-left px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-purple-500">edit_note</span>
                <span className="font-medium">魔改路线</span>
              </button>
              <button
                onClick={handleShare}
                className="w-full py-4 text-left px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-blue-500">share</span>
                <span className="font-medium">分享任务</span>
              </button>
              <button
                onClick={handleReportTask}
                className="w-full py-4 text-left px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-red-500">flag</span>
                <span className="font-medium">举报任务</span>
              </button>
              <button
                onClick={() => setShowActionSheet(false)}
                className="w-full py-4 text-center text-slate-500 font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {activePostId && (
        <CommentModal
          postId={activePostId}
          onClose={() => setActivePostId(null)}
          onUserClick={(user) => setSelectedUser(user)}
        />
      )}

      {/* Prep List Modal */}
      {showPrepModal && task && (
        <PrepListModal
          task={task}
          onClose={() => setShowPrepModal(false)}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-80 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">选择预约时间</h3>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full mb-4 p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full mb-6 p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                取消
              </button>
              <button
                onClick={confirmSchedule}
                className="flex-1 py-3 rounded-xl bg-[#0ea5e9] text-white hover:bg-sky-500"
              >
                确认预约
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end max-w-md mx-auto">
          <div onClick={() => setShowChallengeModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl">
            <div className="flex justify-center pt-3 pb-2" onClick={() => setShowChallengeModal(false)}>
              <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer" />
            </div>
            <div className="px-6 pb-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="material-symbols-outlined text-white text-3xl">auto_fix_high</span>
              </div>
              <h3 className="text-xl font-bold mb-1">同款挑战</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">选择你的挑战方式</p>
            </div>
            <div className="px-6 pb-8 flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowChallengeModal(false);
                  setShowExecuteModal(true);
                }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-lg shadow-[#0ea5e9]/30 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-center size-12 rounded-full bg-white/20">
                  <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-lg">直接挑战</h4>
                  <p className="text-sm text-white/80">按原版路线出发探索</p>
                </div>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              <button
                onClick={() => {
                  setShowChallengeModal(false);
                  onRemix?.(taskId);
                }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-center size-12 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-500">
                  <span className="material-symbols-outlined text-2xl">edit_note</span>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">魔改路线</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">基于此任务定制专属路线</p>
                </div>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execute Modal */}
      {showExecuteModal && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end max-w-md mx-auto">
          <div onClick={() => setShowExecuteModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl">
            <div className="flex justify-center pt-3 pb-2" onClick={() => setShowExecuteModal(false)}>
              <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer" />
            </div>
            <div className="px-6 pb-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center shadow-lg shadow-[#0ea5e9]/30">
                <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </div>
              <h3 className="text-xl font-bold mb-1">准备出发</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">选择你的挑战时机</p>
            </div>
            <div className="px-6 pb-8 flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowExecuteModal(false);
                  handleStartTask();
                }}
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
              {/* 从"已预约"进入时不显示"预约出发"和"加入收藏" */}
              {!fromScheduled && (
                <>
                  <button
                    onClick={() => {
                      setShowExecuteModal(false);
                      openSchedulePicker();
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center justify-center size-12 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500">
                      <span className="material-symbols-outlined text-2xl">schedule</span>
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">预约出发</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">安排到日程中</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                  </button>
                  {/* 社团任务不显示收藏选项 */}
                  {!task?.clubId && (
                    <button
                      onClick={() => {
                        setShowExecuteModal(false);
                        handleToggleSave();
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center justify-center size-12 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}>bookmark</span>
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">{isSaved ? '已收藏' : '加入收藏'}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{isSaved ? '任务已在收藏夹中' : '以后再来挑战'}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-400">{isSaved ? 'check' : 'chevron_right'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prep Confirm Modal */}
      {showPrepConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-80 rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-3xl">inventory_2</span>
              </div>
              <h3 className="text-lg font-bold mb-2">是否先进行备战？</h3>
              <p className="text-sm text-slate-500 font-medium">该任务包含备战清单</p>
              <p className="text-xs text-slate-400 mt-1">做好准备能让体验更完美哦</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDirectStart}
                className="flex-1 py-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-sm"
              >
                直接出发
              </button>
              <button
                onClick={handleConfirmPrep}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white font-bold hover:shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all"
              >
                去备战
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Mini Profile Modal */}
      {selectedUser && (
        <UserMiniProfileModal
          userId={selectedUser.id}
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onViewProfile={() => {
            setSelectedUser(null);
            onUserProfile?.(selectedUser.id);
          }}
        />
      )}
    </div>
  );
};

export default TaskPreviewScreen;
