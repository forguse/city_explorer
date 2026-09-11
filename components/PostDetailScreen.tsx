import React, { useState, useEffect, useRef } from 'react';
import UserMiniProfileModal from './UserMiniProfileModal';
import PostActionModal from './PostActionModal';
import SerendipityTaskCard from './SerendipityTaskCard';
import { community, user as userApi, execution } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface PostDetailScreenProps {
  postId: string;
  onBack: () => void;
  onStartMission: (taskId: string) => void;
  onUserProfile?: (userId: string) => void;
  onMessage?: (user: any) => void;
  onRemix?: () => void; // 魔改路线入口
}

interface Author {
  _id: string;
  username: string;
  avatarUrl?: string;
  level: number;
  isFollowing?: boolean;
}

interface Comment {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
  likes?: string[];  // 点赞用户ID列表
  parentComment?: string;  // 父评论ID
  replyTo?: {  // 被回复的用户信息
    userId: string;
    username: string;
  };
}

interface RelatedTask {
  _id: string;
  title: string;
  description?: string;
  xp?: number;
  coverImageUrl?: string;
  nodes?: Array<{
    description: string;
    isLocationSpecific?: boolean;
    referenceImageUrl?: string;
  }>;
  prepListConfig?: Array<{
    icon: string;
    title: string;
    note?: string;
  }>;
}

// 🆕 关联奇遇接口
interface RelatedSerendipity {
  _id: string;
  completedAt: string;
  serendipityTask: {
    _id: string;
    title: string;
    description?: string;
    coverImageUrl?: string;
    qaModule?: {
      enabled?: boolean;
      question?: string;
    };
    serendipityConfig?: {
      successMessage?: string;
    };
  };
}

interface Post {
  _id: string;
  content: string;
  imageUrls: string[];
  author: Author;
  relatedTask?: RelatedTask;
  remixTask?: RelatedTask; // New: User's remixed version
  relatedSerendipity?: RelatedSerendipity;  // 🆕 关联的奇遇
  likes: string[];
  comments: Comment[];
  createdAt: string;
  isSaved?: boolean;
  saveCount?: number;
}

// ============= TaskDisplayCard Subcomponent =============
interface TaskDisplayCardProps {
  task: RelatedTask;
  label: string;
  labelColor: string;
  isRemix?: boolean; // If true, use purple gradient; otherwise gray-white
  onPrepClick?: () => void;
}

const TaskDisplayCard: React.FC<TaskDisplayCardProps> = ({ task, label, labelColor, isRemix = false, onPrepClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Colors based on type
  const bgColor = isRemix ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-slate-100 to-slate-200';
  const textColor = isRemix ? 'text-white' : 'text-slate-800';
  const textMuted = isRemix ? 'text-white/70' : 'text-slate-500';
  const borderColor = isRemix ? 'border-white/20' : 'border-slate-200';
  const nodeBg = isRemix ? 'bg-white/15' : 'bg-slate-100';
  const nodeNumBg = isRemix ? 'bg-white/30 text-white' : 'bg-slate-300 text-slate-700';
  const hoverBg = isRemix ? 'hover:from-purple-600 hover:to-indigo-600' : 'hover:from-slate-200 hover:to-slate-300';

  // Collapsed View - Compact Button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full flex items-center justify-between p-3 rounded-xl ${bgColor} ${hoverBg} transition-all duration-200 group border ${isRemix ? 'border-purple-400/30' : 'border-slate-200'} shadow-sm`}
      >
        <div className="flex items-center gap-3">
          {task.coverImageUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200">
              <CapacitorImage src={getImageUrl(task.coverImageUrl)} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-lg ${isRemix ? 'bg-white/20' : 'bg-slate-300'} flex items-center justify-center`}>
              <span className={`material-symbols-outlined ${isRemix ? 'text-white' : 'text-slate-600'}`}>
                {isRemix ? 'auto_fix_high' : 'flag'}
              </span>
            </div>
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${labelColor}`}>
                {label}
              </span>
            </div>
            <h4 className={`font-bold text-sm ${textColor} mt-1 line-clamp-1`}>{task.title}</h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.nodes && task.nodes.length > 0 && (
            <span className={`text-xs ${textMuted}`}>{task.nodes.length}步</span>
          )}
          <span className={`material-symbols-outlined ${textMuted} group-hover:translate-x-0.5 transition-transform`}>
            chevron_right
          </span>
        </div>
      </button>
    );
  }

  // Expanded View - Full Card
  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-xl ${isRemix ? '' : 'border border-slate-200'} ${bgColor}`}>
      {/* Content */}
      <div className="relative z-10 p-5">
        {/* Header with collapse button */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${labelColor} shadow-sm`}>
            {label}
          </span>
          <button
            onClick={() => setIsExpanded(false)}
            className={`flex items-center gap-1 text-xs ${textMuted} hover:opacity-80 transition-colors`}
          >
            <span>收起</span>
            <span className="material-symbols-outlined text-sm">expand_less</span>
          </button>
        </div>

        {/* Title & Description */}
        <h3 className={`font-bold text-lg mb-1 ${textColor}`}>{task.title}</h3>
        {task.description && (
          <p className={`text-sm leading-relaxed mb-4 ${textMuted}`}>{task.description}</p>
        )}

        {/* XP Badge */}
        {task.xp && (
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full mb-4 ${isRemix ? 'bg-white/10 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
            <span className="material-symbols-outlined text-sm">stars</span>
            <span>{task.xp} XP</span>
          </div>
        )}

        {/* Node Preview - Vertical layout */}
        {task.nodes && task.nodes.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className={`material-symbols-outlined text-sm ${textMuted}`}>route</span>
              <span className={`text-xs font-medium ${textMuted}`}>路线预览</span>
              <span className={`text-xs ${textMuted}`}>({task.nodes.length}步)</span>
            </div>
            <div className="space-y-2">
              {task.nodes.map((node, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-xl ${nodeBg} backdrop-blur-sm border ${borderColor}`}
                >
                  <span className={`w-6 h-6 rounded-full ${nodeNumBg} text-xs font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textColor}`}>
                      {node.description || `节点 ${idx + 1}`}
                    </p>
                    {node.isLocationSpecific && (
                      <p className={`text-xs mt-1 ${textMuted}`}>
                        <span className="material-symbols-outlined text-xs align-middle mr-0.5">location_on</span>
                        需要到达指定地点
                      </p>
                    )}
                    {node.referenceImageUrl && (
                      <div className="mt-2 w-full rounded-lg overflow-hidden">
                        <CapacitorImage
                          src={getImageUrl(node.referenceImageUrl)}
                          alt=""
                          className="w-full h-auto max-h-32 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Row: Prep Entry */}
        {task.prepListConfig && task.prepListConfig.length > 0 && (
          <div className={`flex items-center pt-3 border-t ${borderColor}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrepClick?.();
              }}
              className={`flex items-center gap-1.5 text-xs ${textMuted} hover:opacity-80 transition-colors group`}
            >
              <span className={`material-symbols-outlined text-base ${isRemix ? 'text-amber-400' : 'text-amber-500'} group-hover:scale-110 transition-transform`}>
                backpack
              </span>
              <span>备战清单</span>
              <span className={`${isRemix ? 'text-white/50' : 'text-slate-400'}`}>({task.prepListConfig.length}项)</span>
              <span className={`material-symbols-outlined text-sm ${isRemix ? 'text-white/40' : 'text-slate-400'}`}>chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


const PostDetailScreen: React.FC<PostDetailScreenProps> = ({ postId, onBack, onStartMission, onUserProfile, onMessage, onRemix }) => {
  // --- Data & State ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showChallengeModal, setShowChallengeModal] = useState(false); // 同款挑战选择弹窗
  const [showExecuteModal, setShowExecuteModal] = useState(false);     // 执行方式选择弹窗
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTarget, setReplyTarget] = useState<{
    commentId: string;
    userId: string;
    username: string;
  } | null>(null);  // 回复目标
  const [commentSort, setCommentSort] = useState<'time' | 'likes'>('time');  // 评论排序方式

  // Action Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [showPrepModal, setShowPrepModal] = useState(false); // For viewing prep list
  const [prepModalTask, setPrepModalTask] = useState<RelatedTask | null>(null); // Which task's prep to show

  const commentsRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [sheetPosition, setSheetPosition] = useState(45); // 抽屉位置百分比
  const [imageHeight, setImageHeight] = useState(45); // 图片实际高度百分比

  // 图片加载完成后计算高度
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const vh = window.innerHeight;
    const containerWidth = window.innerWidth;
    const imgDisplayHeight = (img.naturalHeight / img.naturalWidth) * containerWidth;
    const heightPercent = (imgDisplayHeight / vh) * 100;

    setImageHeight(heightPercent);

    // 如果图片高度小于45vh，抽屉就在图片底部，不允许向下拉
    // 如果图片高度大于等于45vh，抽屉初始位置在45vh
    if (heightPercent < 45) {
      setSheetPosition(heightPercent); // 短图片：抽屉在图片底部
    } else {
      setSheetPosition(45); // 长图片：抽屉在45vh
    }
  };

  // 处理抽屉拖动
  const handleSheetTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    sheetRef.current?.setAttribute('data-start-y', touch.clientY.toString());
    sheetRef.current?.setAttribute('data-start-pos', sheetPosition.toString());
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (!sheetRef.current) return;
    const startY = parseFloat(sheetRef.current.getAttribute('data-start-y') || '0');
    const startPos = parseFloat(sheetRef.current.getAttribute('data-start-pos') || '45');
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    const viewportHeight = window.innerHeight;
    const deltaPercent = (deltaY / viewportHeight) * 100;

    // 如果图片高度小于45vh，只允许向上拉（查看评论），不允许向下拉
    // 如果图片高度大于等于45vh，允许向下拉到10vh（查看完整图片）
    const minPosition = imageHeight < 45 ? imageHeight : 10;
    const newPosition = Math.max(minPosition, Math.min(imageHeight, startPos + deltaPercent));
    setSheetPosition(newPosition);
  };

  const handleSheetTouchEnd = () => {
    const initialPosition = imageHeight < 45 ? imageHeight : 45;

    // 吸附逻辑
    if (imageHeight < 45) {
      // 短图片：只有两个位置 - 图片底部或最大化
      if (sheetPosition > initialPosition + 10) {
        setSheetPosition(Math.min(imageHeight + 40, 85)); // 最大化 - 显示更多评论
      } else {
        setSheetPosition(initialPosition); // 回到图片底部
      }
    } else {
      // 长图片：三个位置 - 最小化(10vh)、默认(45vh)、最大化
      if (sheetPosition < initialPosition - 10) {
        setSheetPosition(10); // 最小化 - 显示完整图片
      } else if (sheetPosition > initialPosition + 10) {
        setSheetPosition(Math.min(imageHeight, 85)); // 最大化 - 显示更多评论
      } else {
        setSheetPosition(initialPosition); // 回到默认位置
      }
    }
  };

  // 获取帖子数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 获取当前用户信息
        const userRes = await userApi.getMe();
        setCurrentUserId(userRes.data._id);

        // 获取帖子详情
        const postRes = await community.getPostById(postId);
        const postData = postRes.data;
        setPost(postData);

        // 设置点赞状态 - 使用 toString() 确保 ObjectId 比较正确
        const userId = userRes.data._id;
        const isLikedByUser = postData.likes?.some((likeId: any) => likeId.toString() === userId.toString()) || false;
        setIsLiked(isLikedByUser);
        setLikesCount(postData.likes?.length || 0);
        setIsStarred(postData.isSaved || false);

      } catch (err: any) {
        console.error('Failed to fetch post:', err);
        setError(err.response?.data?.error || '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [postId]);

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

  // --- Handlers ---
  const handleAvatarClick = (user: any) => {
    setSelectedUser(user);
  };

  const toggleFollow = async () => {
    // TODO: 实现关注 API
    setIsFollowing(prev => !prev);
  };

  const toggleLike = async () => {
    if (!post || actionLoading) return;
    try {
      setActionLoading(true);
      const res = await community.likePost(post._id);
      // 使用 API 返回值更新状态，确保所有页面同步
      setIsLiked(res.data.isLiked);
      setLikesCount(res.data.likeCount);
    } catch (err) {
      console.error('Failed to like post:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSave = async () => {
    if (!post || actionLoading) return;
    try {
      setActionLoading(true);
      const res = await community.toggleSave(post._id);
      setIsStarred(res.data.isSaved);
    } catch (err) {
      console.error('Toggle save failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const scrollToComments = () => {
    if (commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cycleImage = () => {
    if (post && post.imageUrls.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % post.imageUrls.length);
    }
  };

  const handleAddComment = async () => {
    if (!post || !newComment.trim() || actionLoading) return;
    try {
      setActionLoading(true);
      // 如果有回复目标，传递回复参数
      const replyData = replyTarget ? {
        parentCommentId: replyTarget.commentId,
        replyToUserId: replyTarget.userId,
        replyToUsername: replyTarget.username
      } : undefined;
      const res = await community.commentPost(post._id, newComment.trim(), replyData);
      setPost(res.data);
      setNewComment('');
      setReplyTarget(null);  // 清除回复目标
    } catch (err: any) {
      alert(err.response?.data?.error || '评论失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 评论点赞处理
  const handleLikeComment = async (commentId: string) => {
    if (!post || actionLoading) return;
    try {
      const res = await community.likeComment(post._id, commentId);
      setPost(res.data);
    } catch (err: any) {
      console.error('Failed to like comment:', err);
    }
  };

  const handleExecute = async (type: 'immediate' | 'schedule' | 'favorite') => {
    if (type === 'immediate') {
      setShowExecuteModal(false);
      try {
        if (post?.relatedTask?._id) {
          await execution.start(post.relatedTask._id);
        }
      } catch (err) {
        console.error('Start task failed:', err);
      }
      if (post?.relatedTask?._id) {
        onStartMission(post.relatedTask._id);
      }
    } else if (type === 'schedule') {
      const now = new Date();
      setScheduleDate(now.toISOString().slice(0, 10));
      setScheduleTime(now.toTimeString().slice(0, 5));
      setShowDatePicker(true);
    } else if (type === 'favorite') {
      toggleSave();
      setShowExecuteModal(false);
      alert('已添加至收藏');
    }
  };

  const confirmSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      alert('请选择预约时间');
      return;
    }
    if (!post?.relatedTask?._id) {
      alert('无法预约：任务不存在');
      return;
    }
    try {
      const scheduledStartTime = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      await execution.schedule(post.relatedTask._id, scheduledStartTime);
      setShowDatePicker(false);
      setShowExecuteModal(false);
      alert('任务已预约成功！请在“我的任务-已预约”中查看');
    } catch (err) {
      console.error('Schedule failed:', err);
      alert('预约失败，请重试');
    }
  };

  // Delete Post Handler
  const handleDeletePost = async () => {
    if (!post) return;
    if (!window.confirm('确定要删除这条动态吗？')) return;
    try {
      setActionLoading(true);
      await community.deletePost(post._id);
      alert('删除成功');
      onBack(); // Return to previous screen
    } catch (err) {
      console.error('Delete post failed:', err);
      alert('删除失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // Report Post Handler
  const handleReportPost = async () => {
    if (!post) return;
    const confirmed = window.confirm('确定要举报此帖子吗？恶意举报可能会影响您的账号。');
    if (!confirmed) return;
    try {
      await community.reportPost(post._id);
      alert('举报已收到，我们将尽快处理');
    } catch (err: any) {
      console.error('Report failed:', err);
      alert(err.response?.data?.error || '举报失败，请重试');
    }
  };

  // Loading 状态
  if (loading) {
    return (
      <div className="bg-[#f8f7f5] dark:bg-[#221910] font-display text-[#1b130d] dark:text-[#f3ece7] flex flex-col h-full items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">加载中...</p>
      </div>
    );
  }

  // 错误状态
  if (error || !post) {
    return (
      <div className="bg-[#f8f7f5] dark:bg-[#221910] font-display text-[#1b130d] dark:text-[#f3ece7] flex flex-col h-full items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-gray-400 mb-4">error_outline</span>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error || '帖子不存在'}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-[#0ea5e9] text-white rounded-full"
        >
          返回
        </button>
      </div>
    );
  }

  const author = post.author;
  const images = post.imageUrls || [];
  const hasImages = images.length > 0;
  const relatedTask = post.relatedTask;

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#221910] font-display text-[#1b130d] dark:text-[#f3ece7] flex flex-col h-full overflow-hidden relative">
      <div className="relative flex-1 w-full flex flex-col overflow-hidden">

        {/* Navigation Bar Overlay */}
        <div className={`${hasImages ? 'absolute' : 'sticky'} top-0 left-0 right-0 z-20 flex items-center justify-between p-4 ${hasImages ? 'pt-12 bg-gradient-to-b from-black/60 to-transparent' : 'pt-12 bg-[#f8f7f5] dark:bg-[#221910]'} pointer-events-none`}>
          <button
            onClick={onBack}
            className={`pointer-events-auto flex size-10 items-center justify-center rounded-full ${hasImages ? 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors`}
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
          </button>
          <div className="flex gap-3 pointer-events-auto">

            <button
              onClick={toggleSave}
              className={`flex size-10 items-center justify-center rounded-full ${hasImages ? 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors`}
            >
              <span className={`material-symbols-outlined text-[24px] ${!hasImages && isStarred ? 'text-[#0ea5e9]' : ''}`} style={{ fontVariationSettings: isStarred ? "'FILL' 1" : "'FILL' 0" }}>bookmark</span>
            </button>
            <button
              onClick={() => setShowActionModal(true)}
              className={`flex size-10 items-center justify-center rounded-full ${hasImages ? 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors`}
            >
              <span className="material-symbols-outlined text-[24px]">more_vert</span>
            </button>
          </div>
        </div>

        {/* Image Carousel - 全屏背景图片 */}
        {hasImages && (
          <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-start justify-center">
            <CapacitorImage
              src={getImageUrl(images[currentImageIndex])}
              alt="Post image"
              className="w-full h-auto object-contain"
              onClick={cycleImage}
              onLoad={handleImageLoad}
            />
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white tracking-wide z-10">
                {currentImageIndex + 1}/{images.length}
              </div>
            )}
          </div>
        )}

        {/* 抽屉式内容区 */}
        <div
          ref={sheetRef}
          className="absolute left-0 right-0 bg-[#f8f7f5] dark:bg-[#221910] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out flex flex-col"
          style={{
            top: `${sheetPosition}vh`,
            bottom: 0,
          }}
        >
          {/* 拖动手柄 */}
          <div
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
          >
            <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          </div>

          {/* 可滚动内容区 */}
          <div className="flex-1 overflow-y-auto px-4 pb-32">

          {/* Author */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full bg-gray-300 overflow-hidden border border-white dark:border-gray-700 shadow-sm cursor-pointer"
                onClick={() => handleAvatarClick({ name: author.username, avatar: author.avatarUrl, id: author._id })}
              >
                <CapacitorImage src={getImageUrl(author.avatarUrl) || 'https://via.placeholder.com/40'} alt="Author avatar" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{author.username}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(post.createdAt)} • Lv.{author.level}</span>
              </div>
            </div>
            <button
              onClick={toggleFollow}
              className={`text-xs font-bold py-1.5 px-4 rounded-full transition-all duration-300 ${isFollowing
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-[#0ea5e9]/10 text-[#0ea5e9] hover:bg-[#0ea5e9]/20'
                }`}
            >
              {isFollowing ? '已关注' : '关注'}
            </button>
          </div>

          {/* Post Body */}
          <div className="mb-6">
            <p className="text-base font-normal leading-relaxed text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">
              {post.content}
            </p>
          </div>

          {/* Mission Cards - Support: no task, single task, dual tasks (original + remix), or serendipity */}
          {(post.relatedTask || post.remixTask || post.relatedSerendipity) && (
            <div className="mb-6 space-y-4">
              {/* Original Task Card */}
              {post.relatedTask && (
                <TaskDisplayCard
                  task={post.relatedTask}
                  label={post.remixTask ? "原版任务" : "关联任务"}
                  labelColor="bg-sky-500/80"
                  onPrepClick={() => {
                    setPrepModalTask(post.relatedTask!);
                    setShowPrepModal(true);
                  }}
                />
              )}

              {/* Remix Task Card */}
              {post.remixTask && (
                <TaskDisplayCard
                  task={post.remixTask}
                  label="TA的改写版"
                  labelColor="bg-purple-500/80"
                  isRemix={true}
                  onPrepClick={() => {
                    setPrepModalTask(post.remixTask!);
                    setShowPrepModal(true);
                  }}
                />
              )}

              {/* 🆕 Serendipity Task Card */}
              {post.relatedSerendipity && (
                <SerendipityTaskCard
                  serendipityTask={post.relatedSerendipity.serendipityTask}
                  completedAt={post.relatedSerendipity.completedAt}
                />
              )}
            </div>
          )}

          {/* Comments */}
          <div className="mb-4" ref={commentsRef}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">评论 ({post.comments.length})</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCommentSort('time')}
                  className={`text-xs px-2 py-1 rounded ${commentSort === 'time' ? 'bg-[#0ea5e9] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  按时间
                </button>
                <button
                  onClick={() => setCommentSort('likes')}
                  className={`text-xs px-2 py-1 rounded ${commentSort === 'likes' ? 'bg-[#0ea5e9] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  按热度
                </button>
              </div>
            </div>

            {post.comments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">暂无评论，快来发表第一条评论吧！</p>
            )}

            {/* 只显示一级评论（没有parentComment的），根据排序方式排序 */}
            {post.comments
              .filter(c => !c.parentComment)
              .sort((a, b) => {
                if (commentSort === 'likes') {
                  return (b.likes?.length || 0) - (a.likes?.length || 0);
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .map((comment) => {
                // 获取该评论的所有回复
                const replies = post.comments.filter(c => c.parentComment === comment._id);
                // 使用 some + toString 比较，因为 likes 可能是 ObjectId 数组
                const isLiked = comment.likes?.some(likeId => likeId.toString() === currentUserId) || false;
                return (
                  <div key={comment._id} className="mb-4">
                    {/* 一级评论 */}
                    <div className="flex gap-3">
                      <div
                        className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden shrink-0 cursor-pointer"
                        onClick={() => handleAvatarClick({ name: comment.user.username, avatar: comment.user.avatarUrl, id: comment.user._id })}
                      >
                        <CapacitorImage src={getImageUrl(comment.user.avatarUrl) || 'https://via.placeholder.com/32'} alt="User avatar" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{comment.user.username}</span>
                          <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{comment.content}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div
                            className={`flex items-center gap-1 cursor-pointer transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                            onClick={() => handleLikeComment(comment._id)}
                          >
                            <span className="material-symbols-outlined text-sm">{isLiked ? 'favorite' : 'favorite_border'}</span>
                            <span className="text-xs">{comment.likes?.length || 0}</span>
                          </div>
                          <div
                            className="flex items-center gap-1 text-gray-400 cursor-pointer hover:text-[#0ea5e9] transition-colors"
                            onClick={() => setReplyTarget({
                              commentId: comment._id,
                              userId: comment.user._id,
                              username: comment.user.username
                            })}
                          >
                            <span className="material-symbols-outlined text-sm">chat_bubble</span>
                            <span className="text-xs">回复</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 该评论的回复列表 */}
                    {replies.length > 0 && (
                      <div className="ml-11 mt-3 space-y-3 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                        {replies.map((reply) => (
                          <div key={reply._id} className="flex gap-3">
                            <div
                              className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden shrink-0 cursor-pointer"
                              onClick={() => handleAvatarClick({ name: reply.user.username, avatar: reply.user.avatarUrl, id: reply.user._id })}
                            >
                              <CapacitorImage src={getImageUrl(reply.user.avatarUrl) || 'https://via.placeholder.com/24'} alt="User avatar" className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{reply.user.username}</span>
                                {reply.replyTo && (
                                  <>
                                    <span className="text-xs text-gray-400">回复</span>
                                    <span className="text-xs text-[#0ea5e9]">@{reply.replyTo.username}</span>
                                  </>
                                )}
                                <span className="text-xs text-gray-400">{formatTime(reply.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{reply.content}</p>
                              {/* 二级评论不显示点赞和回复按钮 */}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar - 评论框始终可见 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a120b] border-t border-gray-100 dark:border-gray-800 px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* 回复提示条 */}
        {replyTarget && (
          <div className="flex items-center justify-between mb-2 px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-xs text-gray-500">
              回复 <span className="text-[#0ea5e9]">@{replyTarget.username}</span>
            </span>
            <button
              onClick={() => setReplyTarget(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* 评论输入框 */}
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTarget ? `回复 @${replyTarget.username}...` : "写评论..."}
            className="flex-1 min-w-0 h-10 px-4 bg-gray-100 dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
          />
          {/* 发送按钮 */}
          <button
            onClick={handleAddComment}
            disabled={actionLoading || !newComment.trim()}
            className="px-4 h-10 bg-[#0ea5e9] text-white rounded-full text-sm font-medium disabled:opacity-50 shrink-0"
          >
            发送
          </button>
          {/* 开启同款任务按钮 - 仅当有关联任务时显示 */}
          {relatedTask && (
            <button
              onClick={() => setShowChallengeModal(true)}
              className="h-10 px-4 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] active:scale-[0.98] transition-all text-white rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#0ea5e9]/30 shrink-0"
            >
              <span className="material-symbols-outlined text-lg">rocket_launch</span>
              <span className="font-bold text-sm whitespace-nowrap">挑战</span>
            </button>
          )}
        </div>
      </div>
        </div>

      {/* 同款挑战选择弹窗：直接用 vs 魔改 */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div
            onClick={() => setShowChallengeModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
          ></div>

          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2" onClick={() => setShowChallengeModal(false)}>
              <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></div>
            </div>

            {/* Header */}
            <div className="px-6 pb-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="material-symbols-outlined text-white text-3xl">auto_fix_high</span>
              </div>
              <h3 className="text-xl font-bold mb-1">同款挑战</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">选择你的挑战方式</p>
            </div>

            {/* Options */}
            <div className="px-6 pb-8 flex flex-col gap-3">
              {/* 直接挑战 */}
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

              {/* 魔改路线 */}
              <button
                onClick={() => {
                  setShowChallengeModal(false);
                  onRemix?.();
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

      {/* 执行方式选择弹窗：立即出发 / 预约出发 / 加入收藏 */}
      {showExecuteModal && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div
            onClick={() => setShowExecuteModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
          ></div>

          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2" onClick={() => setShowExecuteModal(false)}>
              <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></div>
            </div>

            {/* Header */}
            <div className="px-6 pb-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center shadow-lg shadow-[#0ea5e9]/30">
                <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </div>
              <h3 className="text-xl font-bold mb-1">准备出发</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">选择你的挑战时机</p>
            </div>

            {/* Options */}
            <div className="px-6 pb-8 flex flex-col gap-3">
              {/* 立即出发 */}
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

              {/* 预约出发 */}
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

              {/* 加入收藏 */}
              <button
                onClick={() => handleExecute('favorite')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-center size-12 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: isStarred ? "'FILL' 1" : "'FILL' 0" }}>bookmark</span>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{isStarred ? '已收藏' : '加入收藏'}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{isStarred ? '任务已在收藏夹中' : '以后再来挑战'}</p>
                </div>
                <span className="material-symbols-outlined text-gray-400">{isStarred ? 'check' : 'chevron_right'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal (Mock) */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#221910] w-80 rounded-2xl p-6 shadow-2xl">
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
      )}

      {/* Mini Profile Modal */}
      {selectedUser && (
        <UserMiniProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onViewProfile={() => {
            setSelectedUser(null);
            if (onUserProfile) onUserProfile(selectedUser.id);
          }}
          onMessage={() => {
            setSelectedUser(null);
            if (onMessage) onMessage(selectedUser);
          }}
        />
      )}

      {/* Post Action Modal */}
      <PostActionModal
        visible={showActionModal}
        onClose={() => setShowActionModal(false)}
        isOwner={!!post && (post.author._id === currentUserId || JSON.parse(localStorage.getItem('user') || '{}').isAdmin)}
        onDelete={handleDeletePost}
        onReport={handleReportPost}
      />

      {/* Prep List Modal */}
      {showPrepModal && prepModalTask && prepModalTask.prepListConfig && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center max-w-md mx-auto">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPrepModal(false)}
          ></div>
          <div className="relative w-[90%] max-h-[70vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">backpack</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">备战清单</h3>
              </div>
              <button
                onClick={() => setShowPrepModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>

            {/* Task Title */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">任务</p>
              <p className="font-medium text-slate-900 dark:text-white">{prepModalTask.title}</p>
            </div>

            {/* Prep Items */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="space-y-3">
                {prepModalTask.prepListConfig.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
                        {item.icon || 'inventory_2'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 dark:text-white">{item.title}</h4>
                      {item.note && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <p className="text-xs text-center text-slate-400">
                共 {prepModalTask.prepListConfig.length} 项备战物资
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PostDetailScreen;
