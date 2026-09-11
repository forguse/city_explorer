import React, { useState, useEffect, useRef } from 'react';
import TaskStartModal from './TaskStartModal';
import TaskMoreMenu from './TaskMoreMenu';
import UserMiniProfileModal from './UserMiniProfileModal';
import { user as userApi, community, task, execution } from '../services/api';
import { useImageUpload } from '../src/hooks/useImageUpload';
import { getImageUrl } from '../src/utils/imageUrl';
import { useCapacitorImageUrl, clearCapacitorImageCache } from '../src/hooks/useCapacitorImage';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ProfileScreenProps {
  onBack: () => void;
  onHonor?: () => void;
  onSettings?: () => void;
  isOwnProfile?: boolean;
  userId?: string; // 要查看的用户ID
  onEditProfile?: () => void;
  onMessage?: (user: any) => void;
  onUserPosts?: (userId: string, userName: string) => void;
  onUserFollowing?: (userId: string, userName: string) => void;
  onStartTask?: (taskId: string) => void;
  onTaskPreview?: (taskId: string) => void; // 导航到任务预览页
  onTaskReview?: (executionId: string, targetUserId: string) => void; // 导航到任务回顾页
  onEncounterHistory?: () => void;
  onRemix?: (taskId?: string) => void; // 魔改路线入口
  onPostDetail?: (postId: string) => void; // 导航到帖子详情页
  onFriends?: () => void;
  onShowcaseAll?: (userId: string) => void; // 查看全部奇遇展示
  onLogin?: () => void; // 导航到登录页面
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onHonor,
  onSettings,
  isOwnProfile = true,
  userId,
  onEditProfile,
  onMessage,
  onUserPosts,
  onUserFollowing,
  onStartTask,
  onTaskPreview,
  onTaskReview,
  onEncounterHistory,
  onRemix,
  onPostDetail,
  onFriends,
  onShowcaseAll,
  onLogin
}) => {
  // --- Loading & Error States ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false); // 是否是认证错误

  // --- Data States ---
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    following: 0,
    followers: 0,
    posts: 0,
    publishedTasks: 0,
    completedTasks: 0,
    savedByOthers: 0
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [publishedTasks, setPublishedTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [showcaseTasks, setShowcaseTasks] = useState<any[]>([]); // 用户展示的任务
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // --- UI States ---
  const [activeTab, setActiveTab] = useState<'posts' | 'completed' | 'published' | 'saved'>('posts');
  const [showTaskStartModal, setShowTaskStartModal] = useState(false);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('任务');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [menuTaskTitle, setMenuTaskTitle] = useState<string>('任务');
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false); // 同款挑战弹窗
  const [showExecuteModal, setShowExecuteModal] = useState(false);     // 执行方式弹窗
  const [showDatePicker, setShowDatePicker] = useState(false);         // 预约日期选择弹窗
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({}); // 评论输入内容
  const [commentLoading, setCommentLoading] = useState<string | null>(null); // 正在提交评论的帖子ID
  const [selectedUser, setSelectedUser] = useState<any>(null); // 用户弹窗

  // Capacitor 环境下的图片 URL 处理
  const userAvatarUrl = useCapacitorImageUrl(user?.avatarUrl);
  const userCoverUrl = useCapacitorImageUrl(user?.coverUrl);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 先检查是否有 token，如果没有则直接显示登录提示
        const token = localStorage.getItem('token');
        if (!token && isOwnProfile) {
          setIsAuthError(true);
          setError('请先登录');
          setLoading(false);
          return;
        }

        // 获取当前登录用户信息
        const meRes = await userApi.getMe();
        setCurrentUserId(meRes.data._id);

        // 确定要查看的用户ID
        const targetUserId = userId || meRes.data._id;

        // 获取目标用户信息
        let userData;
        if (targetUserId === meRes.data._id) {
          userData = meRes.data;
        } else {
          const userRes = await userApi.getById(targetUserId);
          userData = userRes.data;
        }
        setUser(userData);

        // 检查是否已关注
        if (meRes.data.following?.some((f: any) => f.toString() === targetUserId || f === targetUserId)) {
          setIsFollowing(true);
        }

        // 获取用户统计
        const statsRes = await userApi.getStats(targetUserId);
        setStats(statsRes.data);

        // 获取用户帖子
        const postsRes = await userApi.getPosts(targetUserId);
        // 转换数据格式：将 likes 数组转换为 likeCount 和 isLiked
        const postsWithLikeInfo = postsRes.data.map((post: any) => ({
          ...post,
          likeCount: post.likes?.length || 0,
          isLiked: post.likes?.some((likeId: any) => likeId.toString() === meRes.data._id.toString()) || false
        }));
        setPosts(postsWithLikeInfo);

        // 获取用户发布的任务
        const tasksRes = await userApi.getTasks(targetUserId);
        // 过滤掉已下架(off_shelf)或已删除(isDeleted)的任务
        const validTasks = (tasksRes.data || []).filter((t: any) => t.status !== 'off_shelf' && !t.isDeleted);
        setPublishedTasks(validTasks);

        // 获取用户完成的任务
        // 获取用户完成的任务
        const completionsRes = await userApi.getCompletions(targetUserId);
        // 按时间倒序排列(最新的在前面)
        const sortedCompletions = (completionsRes.data || []).sort((a: any, b: any) => {
          const timeA = new Date(a.completedAt || a.updatedAt).getTime();
          const timeB = new Date(b.completedAt || b.updatedAt).getTime();
          return timeB - timeA;
        });
        setCompletedTasks(sortedCompletions);

        // 如果是自己的主页，获取收藏的帖子
        if (targetUserId === meRes.data._id) {
          const savedRes = await userApi.getSavedPosts();
          // 转换数据格式
          const savedPostsWithLikeInfo = savedRes.data.map((post: any) => ({
            ...post,
            likeCount: post.likes?.length || 0,
            isLiked: post.likes?.some((likeId: any) => likeId.toString() === meRes.data._id.toString()) || false
          }));
          setSavedPosts(savedPostsWithLikeInfo);
        }

        // 获取用户展示的任务
        try {
          const showcaseRes = await userApi.getShowcase(targetUserId);
          setShowcaseTasks(showcaseRes.data || []);
        } catch (err) {
          console.error('Failed to fetch showcase:', err);
          // 如果获取失败，使用空数组
          setShowcaseTasks([]);
        }

      } catch (err: any) {
        console.error('Failed to fetch profile data:', err);
        // 检查是否是认证错误 (401 或 token 相关错误)
        const status = err.response?.status || err.status;
        const errorMessage = (err.response?.data?.error || err.message || '').toLowerCase();
        const isAuth = status === 401 ||
                       status === 403 ||
                       errorMessage.includes('token') ||
                       errorMessage.includes('认证') ||
                       errorMessage.includes('登录') ||
                       errorMessage.includes('unauthorized') ||
                       errorMessage.includes('authentication') ||
                       errorMessage.includes('jwt') ||
                       !localStorage.getItem('token');
        if (isAuth && isOwnProfile) {
          setIsAuthError(true);
          setError('请先登录');
        } else {
          setError(err.response?.data?.error || '加载失败');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const badges = [
    { id: 1, name: '山川征服者', icon: 'landscape', gradient: 'from-amber-300 to-orange-500', dotColor: 'bg-red-500', shadow: 'shadow-orange-500/20' },
    { id: 2, name: '飞行大师', icon: 'flight_takeoff', gradient: 'from-sky-300 to-[#257bf4]', shadow: 'shadow-blue-500/20' },
    { id: 3, name: '光影捕手', icon: 'camera', gradient: 'from-gray-300 to-gray-500', shadow: 'shadow-gray-500/20' }
  ];

  // 关注/取消关注
  const handleFollow = async () => {
    if (!user || actionLoading) return;
    try {
      setActionLoading(true);
      await userApi.toggleFollow(user._id);
      setIsFollowing(!isFollowing);
      setStats((prev: any) => ({
        ...prev,
        followers: isFollowing ? prev.followers - 1 : prev.followers + 1
      }));
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 点赞帖子
  const handleLikeItem = async (postId: string) => {
    try {
      const res = await community.likePost(postId);
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            isLiked: res.data.isLiked,
            likeCount: res.data.likeCount
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleToggleComments = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        return { ...post, showComments: !post.showComments };
      }
      return post;
    }));
  };

  // 提交评论
  const handleSubmitComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content || commentLoading) return;

    try {
      setCommentLoading(postId);
      const res = await community.commentPost(postId, content);

      // 更新帖子的评论列表
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: res.data.comments || [...(post.comments || []), res.data]
          };
        }
        return post;
      }));

      // 清空输入框
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Failed to submit comment:', err);
      alert('评论失败，请重试');
    } finally {
      setCommentLoading(null);
    }
  };

  // 切换收藏状态 (仅用于收藏列表)
  const handleToggleSave = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionLoading) return;

    try {
      // Optimistic update or wait for API?
      // Since we are in "Saved" tab, clicking it implies un-saving.
      // We can optimistically remove it or wait. Let's wait to be safe.
      // But to make it snappy, we could remove it immediately?
      // Let's call API.
      await community.toggleSave(postId);

      // Remove from saved list
      setSavedPosts(prev => prev.filter(p => p._id !== postId));

      // Update stats (Saved posts count? Stats usuall tracks how many times *my* posts are saved, or how many I saved?)
      // The stats.savedByOthers is about my posts.
      // There isn't a stat displayed for "How many I saved".
    } catch (err) {
      console.error('Failed to toggle save:', err);
      alert('操作失败');
    }
  };

  // 背景图上传
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadCover, loading: coverUploading, error: coverError } = useImageUpload();

  const handleCoverClick = () => {
    if (isOwnProfile) {
      coverInputRef.current?.click();
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadCover(file);
    if (result.url) {
      // 更新后端
      try {
        await userApi.updateMe({ coverUrl: result.url });
        // 清除图片缓存，确保显示新图片
        clearCapacitorImageCache();
        // 更新本地状态
        setUser((prev: any) => ({ ...prev, coverUrl: result.url }));
        // 更新本地缓存
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({
          ...currentUser,
          coverUrl: result.url
        }));
      } catch (err) {
        console.error('Failed to update cover:', err);
        alert('背景图更新失败，请重试');
      }
    } else {
      // 显示具体的错误信息（直接从返回值获取，不依赖异步状态）
      alert(result.error || '图片上传失败，请重试');
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const handleStatClick = (type: string) => {
    if (type === 'posts') {
      // 跳转到发帖页面
      if (onUserPosts) {
        onUserPosts(user._id || 'self', user.username || user.name || '用户');
      } else {
        setActiveTab('posts');
      }
    } else if (type === 'following') {
      if (onUserFollowing) {
        onUserFollowing(user._id || 'self', user.username || user.name || '用户');
      }
    } else if (type === 'friends') {
      onFriends?.();
    } else {
      console.log(`View ${type}`);
    }
  };

  const handleOpenTaskStart = (taskId: string, taskTitle?: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // 阻止冒泡，避免触发卡片点击
    setSelectedTaskId(taskId);
    setSelectedTaskTitle(taskTitle || '任务');
    setShowChallengeModal(true); // 显示同款挑战弹窗
  };

  // 点击任务卡片其他区域，进入详情页
  const handleTaskCardClick = (taskId: string) => {
    if (onTaskPreview) {
      onTaskPreview(taskId);
    }
  };

  // 执行任务
  const handleExecute = async (type: 'immediate' | 'schedule' | 'favorite') => {
    if (type === 'immediate') {
      setShowExecuteModal(false);
      if (selectedTaskId) {
        try {
          await execution.start(selectedTaskId);
        } catch (err) {
          console.error('Start task failed:', err);
        }
      }
      if (selectedTaskId && onStartTask) {
        onStartTask(selectedTaskId);
      }
    } else if (type === 'schedule') {
      // 显示日期选择弹窗
      const now = new Date();
      setScheduleDate(now.toISOString().slice(0, 10));
      setScheduleTime(now.toTimeString().slice(0, 5));
      setShowDatePicker(true);
    } else if (type === 'favorite') {
      setShowExecuteModal(false);
      alert(`已收藏：${selectedTaskTitle}`);
    }
  };

  // 确认预约
  const confirmSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      alert('请选择预约时间');
      return;
    }
    if (!selectedTaskId) {
      alert('无法预约：任务不存在');
      return;
    }
    try {
      const scheduledStartTime = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      await execution.schedule(selectedTaskId, scheduledStartTime);
      setShowDatePicker(false);
      setShowExecuteModal(false);
      alert('任务已预约成功！请在"我的任务-已预约"中查看');
    } catch (err) {
      console.error('Schedule failed:', err);
      alert('预约失败，请重试');
    }
  };

  const handleOpenTaskMenu = (taskId?: string, taskTitle?: string) => {
    setMenuTaskId(taskId || null);
    setMenuTaskTitle(taskTitle || '任务');
    setShowTaskMenu(true);
  };

  const handleStartNow = () => {
    setShowTaskStartModal(false);
    if (selectedTaskId !== null && onStartTask) {
      onStartTask(selectedTaskId);
    }
  };

  const handleAddToFavorites = () => {
    setShowTaskStartModal(false);
    console.log('Added to favorites:', selectedTaskId);
  };

  const handleShareTask = async () => {
    setShowTaskMenu(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: menuTaskTitle,
          text: `来看看这个任务：${menuTaskTitle}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('分享已取消');
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  const handleFavoriteTask = async () => {
    setShowTaskMenu(false);
    if (!menuTaskId) {
      alert('无法收藏：任务ID不存在');
      return;
    }
    try {
      await task.join(menuTaskId);
      alert(`已收藏：${menuTaskTitle}`);
    } catch (error) {
      console.error('Failed to favorite task:', error);
      alert('收藏失败，请重试');
    }
  };

  const handleReportTask = async () => {
    setShowTaskMenu(false);
    if (!menuTaskId) {
      alert('无法举报：任务ID不存在');
      return;
    }
    try {
      await task.report(menuTaskId);
      alert(`已举报：${menuTaskTitle}，感谢您的反馈`);
    } catch (error) {
      console.error('Failed to report task:', error);
      alert('举报失败，请重试');
    }
  };

  const handleDeleteExecution = async (executionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条完成记录吗？这将无法恢复。')) return;

    try {
      await execution.delete(executionId);
      // Update local state
      setCompletedTasks(prev => prev.filter(t => t._id !== executionId));
      // Update stats
      setStats((prev: any) => ({
        ...prev,
        completedTasks: Math.max(0, prev.completedTasks - 1)
      }));
    } catch (err) {
      console.error('Failed to delete execution:', err);
      alert('删除失败，请重试');
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="bg-[#f5f7f8] dark:bg-[#101722] font-display text-[#1b130d] dark:text-[#f3ece7] antialiased transition-colors duration-200">
        <div className="relative flex min-h-screen w-full flex-col w-full sm:max-w-md mx-auto bg-white dark:bg-[#1e293b] shadow-2xl items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#257bf4]"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    // 如果是认证错误，显示登录/注册入口
    if (isAuthError) {
      return (
        <div className="bg-[#f5f7f8] dark:bg-[#101722] font-display text-[#1b130d] dark:text-[#f3ece7] antialiased transition-colors duration-200">
          <div className="relative flex min-h-screen w-full flex-col w-full sm:max-w-md mx-auto bg-white dark:bg-[#1e293b] shadow-2xl items-center justify-center p-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#257bf4] to-[#6366f1] flex items-center justify-center mb-6 shadow-lg shadow-[#257bf4]/30">
              <span className="material-symbols-outlined text-white text-[48px]">person</span>
            </div>
            <h2 className="text-xl font-bold text-[#1b130d] dark:text-[#f3ece7] mb-2">还未登录</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">登录后可以查看个人主页、发布任务、参与社区互动</p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={onLogin}
                className="w-full px-6 py-3 bg-[#257bf4] text-white rounded-full font-bold hover:bg-[#1e6ad4] transition-colors shadow-lg shadow-[#257bf4]/30"
              >
                登录 / 注册
              </button>
              <button
                onClick={onBack}
                className="w-full px-6 py-2 text-gray-500 dark:text-gray-400 hover:text-[#257bf4] transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 其他错误显示通用错误页面
    return (
      <div className="bg-[#f5f7f8] dark:bg-[#101722] font-display text-[#1b130d] dark:text-[#f3ece7] antialiased transition-colors duration-200">
        <div className="relative flex min-h-screen w-full flex-col w-full sm:max-w-md mx-auto bg-white dark:bg-[#1e293b] shadow-2xl items-center justify-center p-4">
          <span className="material-symbols-outlined text-red-500 text-[48px] mb-4">error</span>
          <p className="text-red-500 text-center mb-4">{error}</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={onBack}
              className="w-full px-6 py-2 bg-[#257bf4] text-white rounded-full font-medium hover:bg-[#1e6ad4] transition-colors"
            >
              返回
            </button>
            <button
              onClick={() => {
                if (window.confirm('确定要清除登录数据吗？清除后需要重新登录。')) {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  window.location.reload();
                }
              }}
              className="w-full px-6 py-2 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors text-sm"
            >
              清除数据并重新登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- No User State ---
  if (!user) {
    return (
      <div className="bg-[#f5f7f8] dark:bg-[#101722] font-display text-[#1b130d] dark:text-[#f3ece7] antialiased transition-colors duration-200">
        <div className="relative flex min-h-screen w-full flex-col w-full sm:max-w-md mx-auto bg-white dark:bg-[#1e293b] shadow-2xl items-center justify-center p-4">
          <span className="material-symbols-outlined text-gray-400 text-[48px] mb-4">person_off</span>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-4">用户不存在</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-[#257bf4] text-white rounded-full font-medium hover:bg-[#1e6ad4] transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f7f8] dark:bg-[#101722] font-display text-[#1b130d] dark:text-[#f3ece7] antialiased transition-colors duration-200">
      {/* 隐藏的背景图上传 input */}
      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
      <div className="relative flex min-h-screen w-full flex-col w-full sm:max-w-md mx-auto bg-white dark:bg-[#1e293b] shadow-2xl overflow-hidden pb-20">

        {/* Top Nav Overlay */}
        <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
          <button
            onClick={onBack}
            className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex gap-3 pointer-events-auto">
            {/* Friends Button */}
            <button
              onClick={onFriends}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">group</span>
            </button>

            <button
              onClick={onSettings}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">{isOwnProfile ? 'settings' : 'more_horiz'}</span>
            </button>
          </div>
        </div>

        {/* Cover Image */}
        <div
          className="relative w-full h-64 bg-slate-200 dark:bg-slate-800 cursor-pointer group overflow-hidden"
          onClick={handleCoverClick}
        >
          {userCoverUrl && (
            <CapacitorImage
              src={userCoverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
          {isOwnProfile && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">点击更换背景</span>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="relative px-5 pb-4">
          {/* Avatar and Edit Button Row */}
          <div className="flex justify-between items-end -mt-10 mb-4">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full border-[4px] border-white dark:border-[#1e293b] bg-slate-200 shadow-md overflow-hidden flex-shrink-0">
              {userAvatarUrl ? (
                <CapacitorImage
                  src={userAvatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl">person</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pb-1">
              {!isOwnProfile && (
                <button
                  onClick={handleFollow}
                  disabled={actionLoading}
                  className={`flex items-center justify-center h-9 px-5 rounded-full text-sm font-bold shadow-lg active:scale-95 transition-all ${isFollowing
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-none'
                    : 'bg-[#257bf4] text-white shadow-[#257bf4]/30'
                    }`}
                >
                  {actionLoading ? (
                    <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                  ) : isFollowing ? (
                    <>已关注</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px] mr-1">add</span> 关注</>
                  )}
                </button>
              )}
              {isOwnProfile && (
                <button
                  onClick={onEditProfile}
                  className="flex items-center justify-center h-9 px-5 rounded-full bg-slate-100 dark:bg-slate-700 text-[#1b130d] dark:text-[#f3ece7] text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-colors"
                >
                  编辑资料
                </button>
              )}
            </div>
          </div>

          {/* User Info - Full Width Below Avatar */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#1b130d] dark:text-[#f3ece7] flex items-center gap-2 flex-wrap">
              <span className="whitespace-nowrap">{user.username || user.name || '用户'}</span>
              {user.isAdmin && (
                <span className="material-symbols-outlined text-[#257bf4] text-[20px]" title="Verified User">verified</span>
              )}
              <span className="text-xs text-gray-400 font-normal select-all cursor-text" title="点击复制">ID: {user._id}</span>
            </h1>
            <p className={`text-sm leading-relaxed ${user.bio ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600 italic'}`}>
              {user.bio || '还没有设置冒险格言'}
            </p>
            {user.tags && user.tags.length > 0 && (
              <div className="flex gap-2 mt-2">
                {user.tags.map((tag: string, index: number) => (
                  <div key={index} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-[#257bf4] text-xs font-semibold rounded-md">
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-2 px-4">
          <div className="flex w-full overflow-x-auto no-scrollbar py-3 gap-6 items-center">
            <div className="flex flex-col items-center min-w-[60px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleStatClick('following')}>
              <span className="text-lg font-bold text-[#1b130d] dark:text-[#f3ece7]">{formatNumber(stats.following)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">关注</span>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
            <div className="flex flex-col items-center min-w-[60px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleStatClick('friends')}>
              <span className="text-lg font-bold text-[#1b130d] dark:text-[#f3ece7]">{formatNumber(user.friends?.length || 0)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">好友</span>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
            <div className="flex flex-col items-center min-w-[60px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleStatClick('followers')}>
              <span className="text-lg font-bold text-[#1b130d] dark:text-[#f3ece7]">{formatNumber(stats.followers)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">粉丝</span>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
            <div className="flex flex-col items-center min-w-[60px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleStatClick('posts')}>
              <span className="text-lg font-bold text-[#1b130d] dark:text-[#f3ece7]">{formatNumber(stats.posts)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">发帖</span>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
            <div className="flex flex-col items-center min-w-[60px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleStatClick('favorites')}>
              <span className="text-lg font-bold text-[#1b130d] dark:text-[#f3ece7]">{formatNumber(stats.savedByOthers)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">被收藏</span>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
            <div className="flex flex-col items-center min-w-[60px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleStatClick('completed')}>
              <span className="text-lg font-bold text-[#257bf4]">{formatNumber(stats.completedTasks)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">完成任务</span>
            </div>
          </div>
        </div>

        <div className="h-2 bg-[#f5f7f8] dark:bg-[#101722] w-full mt-2"></div>

        {/* Badges Section - 已注释，保留供未来使用 */}
        {/* <div className="px-5 py-5 bg-white dark:bg-[#1e293b]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1b130d] dark:text-[#f3ece7] flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">emoji_events</span>
              稀有勋章
            </h2>
            <button
              onClick={onHonor}
              className="text-xs text-gray-500 dark:text-gray-400 flex items-center hover:text-[#257bf4] transition-colors"
            >
              全部
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center gap-2 group cursor-pointer"
                onClick={onHonor}
              >
                <div
                  className={`relative w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-300 bg-gradient-to-br ${badge.gradient} ${badge.shadow}`}
                >
                  <span className="material-symbols-outlined text-white text-[32px] drop-shadow-md">{badge.icon}</span>
                  {badge.dotColor && (
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#1e293b] ${badge.dotColor}`}></div>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#1b130d] dark:text-[#f3ece7]">{badge.name}</span>
              </div>
            ))}
          </div>
        </div> */}

        {/* 精彩瞬间 Section */}
        <div className="px-5 py-5 bg-white dark:bg-[#1e293b]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1b130d] dark:text-[#f3ece7] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#257bf4]">auto_awesome</span>
              精彩瞬间
            </h2>
            <button
              onClick={() => onShowcaseAll?.(user._id)}
              className="text-xs text-gray-500 dark:text-gray-400 flex items-center hover:text-[#257bf4] transition-colors"
            >
              全部
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {showcaseTasks.length > 0 ? (
              // 显示用户设置的展示任务（最多3个）
              showcaseTasks.slice(0, 3).map((execution: any) => (
                <div
                  key={execution._id}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                  onClick={() => onTaskReview?.(execution._id, user._id)}
                >
                  <div className="relative w-16 h-16 rounded-2xl shadow-lg overflow-hidden transform group-hover:-translate-y-1 transition-transform duration-300">
                    {execution.task?.coverImageUrl ? (
                      <CapacitorImage
                        src={getImageUrl(execution.task.coverImageUrl)}
                        alt={execution.task?.title || '任务'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#257bf4] to-[#6366f1] flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[24px]">explore</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[#1b130d] dark:text-[#f3ece7] text-center line-clamp-1 max-w-[64px]">
                    {execution.task?.title || '未知任务'}
                  </span>
                </div>
              ))
            ) : (
              // 没有设置展示时显示占位符
              [1, 2, 3].map((i) => (
                <div
                  key={`placeholder-${i}`}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative w-16 h-16 rounded-2xl shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-[28px]">
                      image
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 text-center">
                    未设置
                  </span>
                </div>
              ))
            )}
          </div>
          {showcaseTasks.length === 0 && completedTasks.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
              完成任务后，可以在这里展示你的精彩瞬间
            </p>
          )}
        </div>

        {isOwnProfile && (
          <div className="px-5 py-4 bg-white dark:bg-[#1e293b] border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onEncounterHistory}
              className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#257bf4]">explore</span>
                <div className="text-left">
                  <div className="text-sm font-bold text-[#1b130d] dark:text-[#f3ece7]">我的奇遇记录</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">查看全部奇遇与赠言</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        )}

        {/* Sticky Tabs */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1e293b] border-b border-slate-100 dark:border-slate-800">
          <div className="flex px-4">
            <button
              onClick={() => setActiveTab('posts')}
              className="flex-1 relative py-4 text-center group"
            >
              <span className={`text-base transition-colors ${activeTab === 'posts' ? 'text-[#257bf4] font-bold' : 'text-gray-500 dark:text-gray-400 font-medium group-hover:text-[#1b130d] dark:group-hover:text-[#f3ece7]'}`}>动态</span>
              {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-[#257bf4] rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className="flex-1 relative py-4 text-center group"
            >
              <span className={`text-base transition-colors ${activeTab === 'completed' ? 'text-[#257bf4] font-bold' : 'text-gray-500 dark:text-gray-400 font-medium group-hover:text-[#1b130d] dark:group-hover:text-[#f3ece7]'}`}>完成任务</span>
              {activeTab === 'completed' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-[#257bf4] rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('published')}
              className="flex-1 relative py-4 text-center group"
            >
              <span className={`text-base transition-colors ${activeTab === 'published' ? 'text-[#257bf4] font-bold' : 'text-gray-500 dark:text-gray-400 font-medium group-hover:text-[#1b130d] dark:group-hover:text-[#f3ece7]'}`}>发布任务</span>
              {activeTab === 'published' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-[#257bf4] rounded-t-full"></div>}
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className="flex-1 relative py-4 text-center group"
              >
                <span className={`text-base transition-colors ${activeTab === 'saved' ? 'text-[#257bf4] font-bold' : 'text-gray-500 dark:text-gray-400 font-medium group-hover:text-[#1b130d] dark:group-hover:text-[#f3ece7]'}`}>我的收藏</span>
                {activeTab === 'saved' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-[#257bf4] rounded-t-full"></div>}
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-[#f5f7f8] dark:bg-[#101722] min-h-[500px] p-4 flex flex-col gap-4">

          {/* 动态 Tab - 合并显示帖子和发布的任务 */}
          {activeTab === 'posts' && (() => {
            // 合并帖子和发布的任务，按时间排序
            const combinedItems = [
              ...posts.map((post: any) => ({ ...post, itemType: 'post' })),
              ...publishedTasks.map((task: any) => ({ ...task, itemType: 'task' }))
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return combinedItems.length > 0 ? (
              combinedItems.map((item: any) => (
                item.itemType === 'post' ? (
                  // 帖子渲染
                  <div
                    key={`post-${item._id}`}
                    className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onPostDetail?.(item._id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                          <CapacitorImage
                            src={getImageUrl(item.author?.avatarUrl)}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#1b130d] dark:text-[#f3ece7]">{item.author?.username || '未知用户'}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(item.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenTaskMenu(item._id || item.id, item.title || '帖子'); }}
                        className="text-gray-500 dark:text-gray-400"
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                    </div>
                    <p className="text-sm text-[#1b130d] dark:text-[#f3ece7] mb-3 leading-relaxed">{item.content}</p>
                    {item.imageUrls && item.imageUrls.length > 0 && (
                      <div className={`grid ${item.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-3 rounded-lg overflow-hidden`}>
                        {item.imageUrls.map((img: string, idx: number) => (
                          <div key={idx} className="aspect-[4/3] bg-slate-200 overflow-hidden">
                            <CapacitorImage
                              src={getImageUrl(img)}
                              alt={`Post image ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800">
                      <div className="flex gap-6">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLikeItem(item._id); }}
                          className={`flex items-center gap-1.5 transition-colors ${item.isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-[#257bf4]'}`}
                        >
                          <span
                            className="material-symbols-outlined text-[20px]"
                            style={item.isLiked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                          >
                            favorite
                          </span>
                          <span className="text-xs font-medium">{item.likeCount || 0}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleComments(item._id); }}
                          className={`flex items-center gap-1.5 transition-colors ${item.showComments ? 'text-[#257bf4]' : 'text-gray-500 dark:text-gray-400 hover:text-[#257bf4]'}`}
                        >
                          <span
                            className="material-symbols-outlined text-[20px]"
                            style={item.showComments ? { fontVariationSettings: "'FILL' 1" } : undefined}
                          >
                            chat_bubble
                          </span>
                          <span className="text-xs font-medium">{item.comments?.length || 0}</span>
                        </button>

                      </div>
                    </div>

                    {/* 评论区域 */}
                    {item.showComments && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        {/* 评论列表 */}
                        {item.comments && item.comments.length > 0 ? (
                          <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                            {item.comments.map((comment: any, idx: number) => (
                              <div key={comment._id || idx} className="flex gap-2">
                                <div
                                  className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 cursor-pointer"
                                  onClick={() => {
                                    if (comment.user?._id) {
                                      setSelectedUser({
                                        id: comment.user._id,
                                        name: comment.user.username || '用户',
                                        avatar: comment.user.avatarUrl || '',
                                        bio: comment.user.bio || ''
                                      });
                                    }
                                  }}
                                >
                                  {comment.user?.avatarUrl ? (
                                    <CapacitorImage
                                      src={getImageUrl(comment.user.avatarUrl)}
                                      alt="Avatar"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <span className="material-symbols-outlined text-sm">person</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-[#1b130d] dark:text-[#f3ece7]">
                                      {comment.user?.username || '用户'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      {formatTime(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 break-words">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 text-center py-2 mb-3">暂无评论，快来抢沙发吧~</p>
                        )}

                        {/* 评论输入框 */}
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={commentInputs[item._id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [item._id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitComment(item._id);
                              }
                            }}
                            placeholder="写下你的评论..."
                            className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 rounded-full border-none outline-none focus:ring-2 focus:ring-[#257bf4]/50 placeholder-gray-400"
                          />
                          <button
                            onClick={() => handleSubmitComment(item._id)}
                            disabled={!commentInputs[item._id]?.trim() || commentLoading === item._id}
                            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${commentInputs[item._id]?.trim() && commentLoading !== item._id
                              ? 'bg-[#257bf4] text-white hover:bg-[#1e6ad4]'
                              : 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed'
                              }`}
                          >
                            {commentLoading === item._id ? (
                              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            ) : (
                              '发送'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // 发布任务渲染
                  <div
                    key={`task-${item._id}`}
                    className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTaskCardClick(item._id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser({
                              id: user._id,
                              name: user.username || '未知用户',
                              avatar: user.avatarUrl || '',
                              level: user.level || 1,
                              title: user.title || '城市探险家',
                              bio: user.bio || '',
                              isFollowing: isFollowing
                            });
                          }}
                        >
                          {userAvatarUrl ? (
                            <CapacitorImage src={userAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400"><span className="material-symbols-outlined text-lg">person</span></div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#1b130d] dark:text-[#f3ece7]">{user.username}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(item.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenTaskMenu(item._id || item.id, item.title); }}
                        className="text-gray-500 dark:text-gray-400"
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                      <div className="relative aspect-[2/1] w-full">
                        {item.coverImageUrl ? (
                          <CapacitorImage src={getImageUrl(item.coverImageUrl)} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-slate-300"></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-3 left-3 text-white">
                          <h3 className="text-base font-bold mb-0.5">{item.title}</h3>
                          <div className="flex items-center gap-2 text-xs opacity-90">
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">location_on</span>
                              {item.location?.address || '未知位置'}
                            </span>
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 bg-[#0ea5e9] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                          发布的任务
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{item.completedCount || 0} 人已完成</span>
                          </div>
                          <button
                            onClick={(e) => handleOpenTaskStart(item._id, item.title, e)}
                            className="text-[#0ea5e9] text-xs font-bold border border-[#0ea5e9] px-3 py-1.5 rounded-full hover:bg-[#0ea5e9] hover:text-white transition-colors"
                          >
                            去挑战
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined text-[48px] mb-2 block">article</span>
                <p>暂无动态...</p>
              </div>
            );
          })()}

          {/* 收藏 Tab */}
          {activeTab === 'saved' && (
            savedPosts.length > 0 ? (
              savedPosts.map((item: any) => (
                <div key={`saved-${item._id}`} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                        <CapacitorImage
                          src={getImageUrl(item.author?.avatarUrl)}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#1b130d] dark:text-[#f3ece7]">{item.author?.username || '未知用户'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(item.createdAt)}</span>
                      </div>
                    </div>
                    {/* 收藏列表可能不需要太多操作，或者可以加一个取消收藏的按钮 */}
                    <button
                      className="text-[#257bf4] hover:text-gray-400 transition-colors"
                      title="取消收藏"
                      onClick={(e) => handleToggleSave(item._id, e)}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                    </button>
                  </div>
                  <p className="text-sm text-[#1b130d] dark:text-[#f3ece7] mb-3 leading-relaxed">{item.content}</p>
                  {item.imageUrls && item.imageUrls.length > 0 && (
                    <div className={`grid ${item.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-3 rounded-lg overflow-hidden`}>
                      {item.imageUrls.map((img: string, idx: number) => (
                        <div key={idx} className="aspect-[4/3] bg-slate-200 overflow-hidden">
                          <CapacitorImage
                            src={getImageUrl(img)}
                            alt={`Saved item image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex gap-6">
                      <div className={`flex items-center gap-1.5 text-gray-500 dark:text-gray-400`}>
                        <span className="material-symbols-outlined text-[20px]">favorite</span>
                        <span className="text-xs font-medium">{item.likeCount || 0}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 text-gray-500 dark:text-gray-400`}>
                        <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                        <span className="text-xs font-medium">{item.comments?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined text-[48px] mb-2 block">bookmark_border</span>
                <p>暂无收藏...</p>
              </div>
            )
          )}

          {/* 完成任务 Tab */}
          {activeTab === 'completed' && (
            completedTasks.length > 0 ? (
              completedTasks.map((execution: any) => (
                <div key={execution._id} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[18px]">check_circle</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1b130d] dark:text-[#f3ece7]">
                      完成了任务 <span className="text-[#257bf4]">"{execution.task?.title || '未知任务'}"</span>
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{formatTime(execution.completedAt || execution.updatedAt)}</span>
                    {isOwnProfile && (
                      <button
                        onClick={(e) => handleDeleteExecution(execution._id, e)}
                        className="ml-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="删除记录"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 bg-[#f5f7f8] dark:bg-[#101722] p-3 rounded-lg">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-300">
                      {execution.task?.coverImageUrl ? (
                        <CapacitorImage
                          src={getImageUrl(execution.task.coverImageUrl)}
                          alt={execution.task.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-2xl">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-1">
                      <h4 className="text-sm font-bold text-[#1b130d] dark:text-[#f3ece7] line-clamp-1">{execution.task?.title || '未知任务'}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{execution.task?.description || ''}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] bg-[#257bf4]/10 text-[#257bf4] px-1.5 py-0.5 rounded">
                          任务奖励 +{execution.task?.experienceReward || 0} 经验
                        </span>
                        {execution.task?.pointsReward > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">
                            +{execution.task.pointsReward} 积分
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined text-[48px] mb-2 block">task_alt</span>
                <p>暂无完成的任务...</p>
              </div>
            )
          )}

          {/* 发布任务 Tab */}
          {activeTab === 'published' && (
            publishedTasks.length > 0 ? (
              publishedTasks.map((task: any) => (
                <div
                  key={task._id}
                  className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleTaskCardClick(task._id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                        {userAvatarUrl ? (
                          <CapacitorImage
                            src={userAvatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-lg">person</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#1b130d] dark:text-[#f3ece7]">{user.username}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(task.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenTaskMenu(task._id || task.id, task.title); }}
                      className="text-gray-500 dark:text-gray-400"
                    >
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                    <div className="relative aspect-[2/1] w-full">
                      {task.coverImageUrl ? (
                        <CapacitorImage
                          src={getImageUrl(task.coverImageUrl)}
                          alt={task.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-slate-300"></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 text-white">
                        <h3 className="text-base font-bold mb-0.5">{task.title}</h3>
                        <div className="flex items-center gap-2 text-xs opacity-90">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">location_on</span>
                            {task.location?.address || '未知位置'}
                          </span>
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 bg-[#0ea5e9] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                        发布的任务
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{task.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{task.completedCount || 0} 人已完成</span>
                        </div>
                        <button
                          onClick={(e) => handleOpenTaskStart(task._id, task.title, e)}
                          className="text-[#0ea5e9] text-xs font-bold border border-[#0ea5e9] px-3 py-1.5 rounded-full hover:bg-[#0ea5e9] hover:text-white transition-colors"
                        >
                          去挑战
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <span className="material-symbols-outlined text-[48px] mb-2 block">add_task</span>
                <p>暂无发布的任务...</p>
              </div>
            )
          )}

          {/* 收藏任务 Tab */}
          {/* End of tabs */}

        </div>
      </div>

      {/* 同款挑战选择弹窗 */}
      {
        showChallengeModal && (
          <div className="fixed inset-0 z-[70] flex flex-col justify-end w-full sm:max-w-md mx-auto">
            <div
              onClick={() => setShowChallengeModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            ></div>

            <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center pt-3 pb-2" onClick={() => setShowChallengeModal(false)}>
                <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></div>
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
                    onRemix?.(selectedTaskId || undefined);
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
        )
      }

      {/* 执行方式选择弹窗 */}
      {
        showExecuteModal && (
          <div className="fixed inset-0 z-[70] flex flex-col justify-end w-full sm:max-w-md mx-auto">
            <div
              onClick={() => setShowExecuteModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            ></div>

            <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center pt-3 pb-2" onClick={() => setShowExecuteModal(false)}>
                <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></div>
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
                  onClick={() => handleExecute('immediate')}
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

                <button
                  onClick={() => handleExecute('schedule')}
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

                <button
                  onClick={async () => {
                    try {
                      if (selectedTaskId) {
                        await userApi.toggleSaveTask(selectedTaskId);
                        setShowExecuteModal(false);
                        alert(`已收藏：${selectedTaskTitle}`);
                        // Refresh list if needed or update local state
                        // In a real app we might want to update the 'isFavorite' status in the UI
                      }
                    } catch (error) {
                      console.error('Failed to toggle favorite:', error);
                      alert('收藏失败，请稍后重试');
                    }
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-center size-12 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500">
                    <span className="material-symbols-outlined text-2xl">bookmark</span>
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
        )
      }

      {/* 日期选择弹窗 */}
      {
        showDatePicker && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1e293b] w-80 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">选择执行时间</h3>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full mb-4 p-2 border rounded dark:bg-slate-800 dark:text-white dark:border-slate-600"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full mb-6 p-2 border rounded dark:bg-slate-800 dark:text-white dark:border-slate-600"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmSchedule}
                  className="px-4 py-2 bg-[#0ea5e9] text-white rounded-lg hover:bg-sky-600 transition-colors"
                >
                  确认预约
                </button>
              </div>
            </div>
          </div>
        )
      }

      <TaskStartModal
        isOpen={showTaskStartModal}
        onClose={() => setShowTaskStartModal(false)}
        onStartNow={handleStartNow}
        onAddToFavorites={handleAddToFavorites}
        taskTitle={selectedTaskTitle}
      />

      <TaskMoreMenu
        isOpen={showTaskMenu}
        taskTitle={menuTaskTitle}
        onClose={() => setShowTaskMenu(false)}
        onShare={handleShareTask}
        onFavorite={handleFavoriteTask}
        onReport={handleReportTask}
      />

      {/* User Mini Profile Modal */}
      {selectedUser && (
        <UserMiniProfileModal
          userId={selectedUser.id}
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onViewProfile={() => {
            setSelectedUser(null);
          }}
        />
      )}
    </div >
  );
};

export default ProfileScreen;
