
import React, { useState, useEffect } from 'react';
import { user as userApi, task as taskApi, community as communityApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import LoadingScreen from './LoadingScreen';
import PostActionModal from './PostActionModal';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface UserPostsScreenProps {
  onBack: () => void;
  userId?: string;
  userName?: string;
  onPostDetail?: (id: string) => void;
  onTaskDetail?: (id: string) => void;
}

interface Post {
  _id: string;
  title?: string;
  content: string;
  images?: string[];
  likes: string[];
  comments: any[];
  createdAt: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  distance?: number;
  nodes?: any[];
  rating?: number;
  completionCount?: number;
}

const UserPostsScreen: React.FC<UserPostsScreenProps> = ({
  onBack,
  userId,
  userName = '用户',
  onPostDetail,
  onTaskDetail
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'tasks' | 'saved'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionPostId, setActionPostId] = useState<string | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setError('用户ID不存在');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);


        const promises = [
          userApi.getPosts(userId),
          userApi.getTasks(userId)
        ];

        // Fetch saved posts only if viewing own profile
        const isOwnProfile = userId === currentUser.id;
        if (isOwnProfile) {
          promises.push(userApi.getSavedPosts());
        }

        const results = await Promise.all(promises);
        setPosts(results[0].data);
        // 过滤掉已下架(off_shelf)或已删除(isDeleted)的任务
        const validTasks = (results[1].data || []).filter((t: any) => t.status !== 'off_shelf' && !t.isDeleted);
        setTasks(validTasks);
        if (isOwnProfile && results[2]) {
          setSavedPosts(results[2].data);
        }
      } catch (err: any) {
        console.error('Fetch user content error:', err);
        setError(err.response?.data?.error || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Handle Task Delete
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('确定要下架此任务吗？已收藏的用户仍可查看，但不再公开显示。')) return;

    try {
      await taskApi.delete(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      alert('任务已下架');
    } catch (err) {
      console.error('Delete task failed:', err);
      alert('操作失败，请重试');
    }
  };

  // Handle Post Delete
  const handleDeletePost = async () => {
    if (!actionPostId) return;
    if (!window.confirm('确定要删除这条动态吗？')) return;

    try {
      await communityApi.deletePost(actionPostId);
      setPosts(prev => prev.filter(p => p._id !== actionPostId));
      alert('删除成功');
    } catch (err) {
      console.error('Delete post failed:', err);
      alert('删除失败，请重试');
    }
  };

  // Handle Post Report
  const handleReportPost = async () => {
    if (!actionPostId) return;
    try {
      await communityApi.reportPost(actionPostId);
      alert('举报已收到，我们将尽快处理');
    } catch (err) {
      console.error('Report failed:', err);
      alert('举报失败，请重试');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const isOwnProfile = userId === currentUser.id;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-[#2d241c] border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center px-4 py-3 gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold flex-1">{userName}的发布</h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-around px-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#2d241c]">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-center text-sm font-bold relative transition-colors ${activeTab === 'posts' ? 'text-[#0ea5e9]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            心得动态
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#0ea5e9] rounded-full shadow-[0_0_8px_rgba(14,165,233,0.4)]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-3 text-center text-sm font-bold relative transition-colors ${activeTab === 'tasks' ? 'text-[#0ea5e9]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            发布的任务
            {activeTab === 'tasks' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#0ea5e9] rounded-full shadow-[0_0_8px_rgba(14,165,233,0.4)]"></div>
            )}
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-3 text-center text-sm font-bold relative transition-colors ${activeTab === 'saved' ? 'text-[#0ea5e9]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              我的收藏贴
              {activeTab === 'saved' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#0ea5e9] rounded-full shadow-[0_0_8px_rgba(14,165,233,0.4)]"></div>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#0ea5e9] text-white rounded-full text-sm font-bold"
            >
              重试
            </button>
          </div>
        ) : activeTab === 'posts' ? (
          posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-4">article</span>
              <p className="text-gray-500 dark:text-gray-400">还没有发布任何动态</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map(post => (
                <div
                  key={post._id}
                  onClick={() => onPostDetail?.(post._id)}
                  className="bg-white dark:bg-[#2d241c] rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
                >
                  {post.images && post.images.length > 0 && (
                    <div className="aspect-video bg-gray-100 relative">
                      <CapacitorImage src={getImageUrl(post.images[0])} alt="" className="w-full h-full object-cover" />
                      {/* More / Action Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionPostId(post._id);
                          setShowActionModal(true);
                        }}
                        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">more_horiz</span>
                      </button>
                    </div>
                  )}
                  <div className="p-4 relative">
                    {/* Add More button if no image is present */}
                    {(!post.images || post.images.length === 0) && (
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionPostId(post._id);
                            setShowActionModal(true);
                          }}
                          className="flex size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">more_horiz</span>
                        </button>
                      </div>
                    )}
                    {post.title && <h3 className="font-bold mb-1">{post.title}</h3>}
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{post.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{formatTime(post.createdAt)}</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">favorite</span>
                          {post.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">chat_bubble</span>
                          {post.comments?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'saved' ? (
          savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-4">bookmark_border</span>
              <p className="text-gray-500 dark:text-gray-400">还没有收藏任何帖子</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {savedPosts.map(post => (
                <div
                  key={post._id}
                  onClick={() => onPostDetail?.(post._id)}
                  className="bg-white dark:bg-[#2d241c] rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
                >
                  {post.images && post.images.length > 0 && (
                    <div className="aspect-video bg-gray-100 relative">
                      <CapacitorImage src={getImageUrl(post.images[0])} alt="" className="w-full h-full object-cover" />
                      {/* More / Action Button: For saved posts, simpler action or just allow removing? */}
                      {/* Reuse PostActionModal logic or maybe just bookmark removal? User asked for easy finding. */}
                      {/* Let's keep consistent UI, but maybe distinct action? For simplicity, we reuse the card without extensive custom actions here,
                          or we can add a 'remove from saved' button easily.
                          However, PostActionModal logic for 'delete' only works if we are author.
                          If we want to UN-SAVE from here, we need a different button.
                      */}
                    </div>
                  )}
                  <div className="p-4 relative">
                    {post.title && <h3 className="font-bold mb-1">{post.title}</h3>}
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{post.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{formatTime(post.createdAt)}</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">favorite</span>
                          {post.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">chat_bubble</span>
                          {post.comments?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-4">explore</span>
              <p className="text-gray-500 dark:text-gray-400">还没有发布任何任务</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {tasks.map(task => (
                <div
                  key={task._id}
                  onClick={() => onTaskDetail?.(task._id)}
                  className="bg-white dark:bg-[#2d241c] rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {task.coverImageUrl && (
                      <CapacitorImage src={getImageUrl(task.coverImageUrl)} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-3 left-3 bg-[#0ea5e9] text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">route</span>
                      任务路线
                    </div>
                    {/* Delete Task Button - Only for own profile */}
                    {userId === JSON.parse(localStorage.getItem('user') || '{}').id && (
                      <button
                        onClick={(e) => handleDeleteTask(task._id, e)}
                        className="absolute top-3 right-3 bg-white/90 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                        title="下架任务"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1">{task.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{task.description}</p>
                    <div className="flex items-center gap-3 text-xs">
                      {task.distance && (
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          <span className="material-symbols-outlined text-[#0ea5e9] text-sm">straighten</span>
                          {(task.distance / 1000).toFixed(1)}km
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        <span className="material-symbols-outlined text-[#0ea5e9] text-sm">flag</span>
                        {task.nodes?.length || 0}个点
                      </span>
                      {task.rating && (
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          <span className="material-symbols-outlined text-orange-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          {task.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* Post Action Modal */}
      <PostActionModal
        visible={showActionModal}
        onClose={() => setShowActionModal(false)}
        isOwner={(() => {
          if (!userId) return false;
          return userId === currentUser.id || currentUser.isAdmin;
        })()}
        onDelete={handleDeletePost}
        onReport={handleReportPost}
      />
    </div>
  );
};

export default UserPostsScreen;