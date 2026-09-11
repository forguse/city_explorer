import React, { useState, useMemo, useEffect } from 'react';
import { notification, user as userApi } from '../services/api';
import MessageSettingsModal from './MessageSettingsModal';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface MessageScreenProps {
  onBack: () => void;
  onJoinTask?: (taskId: string) => void;
}

interface Message {
  _id: string;
  type: 'invite' | 'like' | 'comment' | 'friend_request' | 'task_invite' |
        'task_approved' | 'task_rejected' | 'task_removed' | 'task_milestone' |
        'post_approved' | 'post_rejected' | 'post_removed' |
        'report_approved' | 'report_rejected' |
        'self_task_completed' | 'friend_accepted' | 'system'; // Keep 'system' for backward compatibility
  user?: { name: string; avatar: string };
  sender?: { _id: string; username: string; avatarUrl: string };
  content?: string | {
    text: string;
    highlight?: string;
    subtext?: string;
    quote?: string;
  };
  referenceId?: string; // Add referenceId for task join
  createdAt: string;
  isRead: boolean;
  status?: string;
  targetImage?: string;
  title?: string;
  desc?: string;
  isHistory?: boolean;
}

const MessageScreen: React.FC<MessageScreenProps> = ({ onBack, onJoinTask }) => {
  const [currentTab, setCurrentTab] = useState<'interaction' | 'system'>('interaction');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [currentTab]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notification.getMine();
      setNotifications(res.data);

      // 自动标记只读通知为已读（不需要互动的通知类型）
      const readOnlyTypes = [
        'like', 'comment', 'system',
        'task_approved', 'task_rejected', 'task_removed', 'task_milestone',
        'post_approved', 'post_rejected', 'post_removed',
        'report_approved', 'report_rejected', 'self_task_completed',
        'friend_accepted'
      ];
      const unreadReadOnlyNotifications = res.data.filter(
        (n: any) => !n.isRead && readOnlyTypes.includes(n.type)
      );

      if (unreadReadOnlyNotifications.length > 0) {
        // 批量标记为已读
        for (const n of unreadReadOnlyNotifications) {
          await notification.markRead(n._id);
        }
        // 更新本地状态
        setNotifications(prev => prev.map(n =>
          readOnlyTypes.includes(n.type) ? { ...n, isRead: true } : n
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await notification.markRead('all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMessages = useMemo(() => {
    if (currentTab === 'interaction') {
      return notifications.filter(n => ['like', 'comment', 'invite', 'friend_request', 'task_invite', 'friend_accepted'].includes(n.type));
    }
    return notifications.filter(n => [
      'system', 'task_approved', 'task_rejected', 'task_removed', 'task_milestone',
      'post_approved', 'post_rejected', 'post_removed',
      'report_approved', 'report_rejected', 'self_task_completed'
    ].includes(n.type));
  }, [notifications, currentTab]);

  const handleAcceptFriend = async (msg: any) => {
    if (processingId) return;
    setProcessingId(msg._id);
    try {
      await userApi.acceptFriendRequest(msg.sender?._id || '', msg._id);
      alert('已添加好友！');
      setNotifications(prev => prev.map(n => n._id === msg._id ? { ...n, isRead: true, type: 'system', content: '已接受好友请求' } : n));
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleJoinTask = async (msg: any) => {
    if (processingId || !msg.referenceId) return;
    setProcessingId(msg._id);
    try {
      const { execution } = await import('../services/api');
      const res = await execution.joinTask(msg.referenceId);

      // 标记消息为已读（调用后端API）
      await notification.markRead(msg._id);

      // 更新本地状态
      setNotifications(prev => prev.map(n => n._id === msg._id ? { ...n, isRead: true, type: 'system', content: '已加入队伍' } : n));

      // 如果有 taskId，跳转
      const taskId = res.data?.task || (res as any).task; // Support populated or unpopulated
      const finalTaskId = typeof taskId === 'object' ? taskId._id : taskId;

      if (finalTaskId && onJoinTask) {
        onJoinTask(finalTaskId);
      } else {
        alert('已加入队伍！');
      }

    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || '加入失败');
    } finally {
      setProcessingId(null);
    }
  };

  // Helper functions for notification display
  const getNotificationText = (type: string): string => {
    switch(type) {
      case 'like': return ' 点赞了你的内容';
      case 'comment': return ' 评论了你的内容';
      case 'invite': return ' 邀请你加入社团';
      case 'friend_request': return ' 请求添加你为好友';
      case 'friend_accepted': return ' 接受了你的好友请求';
      case 'task_invite': return ' 邀请你一同参加任务';
      case 'task_approved': return ''; // Content will show the message
      case 'task_rejected': return '';
      case 'task_removed': return '';
      case 'task_milestone': return '';
      case 'post_approved': return '';
      case 'post_rejected': return '';
      case 'post_removed': return '';
      case 'report_approved': return '';
      case 'report_rejected': return '';
      case 'self_task_completed': return '';
      case 'system': return '';
      default: return '';
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch(type) {
      case 'like': return 'favorite';
      case 'comment': return 'chat_bubble';
      case 'friend_request': return 'person_add';
      case 'friend_accepted': return 'check_circle';
      case 'task_invite': return 'group_add';
      case 'task_approved': return 'check_circle';
      case 'task_rejected': return 'cancel';
      case 'task_removed': return 'delete';
      case 'task_milestone': return 'emoji_events';
      case 'post_approved': return 'check_circle';
      case 'post_rejected': return 'cancel';
      case 'post_removed': return 'delete';
      case 'report_approved': return 'gavel';
      case 'report_rejected': return 'gavel';
      case 'self_task_completed': return 'celebration';
      case 'invite': return 'mail';
      case 'system': return 'notifications';
      default: return 'mail';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch(type) {
      case 'like': return 'bg-rose-500';
      case 'comment': return 'bg-emerald-500';
      case 'friend_request': return 'bg-purple-500';
      case 'friend_accepted': return 'bg-green-500';
      case 'task_invite': return 'bg-blue-500';
      case 'task_approved': return 'bg-green-500';
      case 'task_rejected': return 'bg-red-500';
      case 'task_removed': return 'bg-red-500';
      case 'task_milestone': return 'bg-yellow-500';
      case 'post_approved': return 'bg-green-500';
      case 'post_rejected': return 'bg-red-500';
      case 'post_removed': return 'bg-red-500';
      case 'report_approved': return 'bg-blue-500';
      case 'report_rejected': return 'bg-gray-500';
      case 'self_task_completed': return 'bg-purple-500';
      case 'invite': return 'bg-indigo-500';
      case 'system': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  return (
    <div className="bg-light-mesh text-slate-900 font-display antialiased overflow-x-hidden min-h-screen selection:bg-[#13a4ec]/20">
      {showSettings && <MessageSettingsModal onClose={() => setShowSettings(false)} />}
      <div className="relative flex flex-col h-full min-h-screen w-full max-w-md mx-auto bg-white shadow-soft">

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 pb-0">
          <div className="flex items-center px-4 py-2 justify-between">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-slate-800 text-lg font-bold tracking-wide text-center flex-1">消息中心</h2>
            <button
              onClick={openSettings}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700"
            >
              <span className="material-symbols-outlined text-[24px]">tune</span>
            </button>
          </div>

          <div className="flex px-4 mt-2 relative">
            <button
              onClick={() => setCurrentTab('interaction')}
              className={`flex-1 flex flex-col items-center pb-3 pt-2 relative group cursor-pointer transition-colors ${currentTab === 'interaction' ? 'text-[#13a4ec]' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <span className="font-bold text-[15px] tracking-wide mb-1 z-10">互动信号</span>
              <div
                className={`absolute bottom-0 w-3/4 h-[3px] rounded-t-full transition-all duration-300 ${currentTab === 'interaction' ? 'bg-[#13a4ec] shadow-[0_2px_8px_rgba(19,164,236,0.3)]' : 'bg-transparent group-hover:bg-slate-100'
                  }`}
              ></div>
            </button>

            <button
              onClick={() => setCurrentTab('system')}
              className={`flex-1 flex flex-col items-center pb-3 pt-2 relative group cursor-pointer transition-colors ${currentTab === 'system' ? 'text-[#13a4ec]' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <span className="font-bold text-[15px] tracking-wide mb-1 z-10">系统日志</span>
              <div
                className={`absolute bottom-0 w-3/4 h-[3px] rounded-t-full transition-all duration-300 ${currentTab === 'system' ? 'bg-[#13a4ec] shadow-[0_2px_8px_rgba(19,164,236,0.3)]' : 'bg-transparent group-hover:bg-slate-100'
                  }`}
              ></div>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-5 p-5 pb-24 bg-slate-50/50 min-h-[calc(100vh-140px)]">
          {currentTab === 'interaction' && (
            <div className="flex items-center gap-2 px-1">
              <div className="h-2 w-2 rounded-full bg-[#13a4ec] animate-pulse shadow-sm shadow-[#13a4ec]/30"></div>
              <span className="text-xs font-bold text-[#13a4ec]/90 tracking-wider">接收讯号</span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">正在搜索信号...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
              <p className="text-sm">暂无新消息</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div key={msg._id} className={`clean-card rounded-2xl p-5 relative group hover:shadow-soft transition-all duration-300 ${!msg.isRead ? 'bg-blue-50/30' : 'opacity-50'}`}>
                {!msg.isRead && <div className="absolute top-5 right-5 h-2 w-2 rounded-full bg-[#13a4ec] shadow-sm shadow-[#13a4ec]/50"></div>}
                <div className="flex gap-4 items-start">
                  <div className="relative shrink-0">
                    <CapacitorImage src={getImageUrl(msg.sender?.avatarUrl) || 'https://via.placeholder.com/50'} className={`h-[52px] w-[52px] rounded-full object-cover border-2 border-white shadow-md ${msg.isRead ? 'grayscale' : ''}`} alt="Avatar" />
                    <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-white flex items-center justify-center shadow-sm ${getNotificationColor(msg.type)}`}>
                      <span className="material-symbols-outlined text-[12px] text-white">
                        {getNotificationIcon(msg.type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1 pr-4">
                      <p className={`text-[14px] font-medium leading-snug ${msg.isRead ? 'text-slate-400' : 'text-slate-700'}`}>
                        <span className={`font-bold ${msg.isRead ? 'text-slate-500' : 'text-slate-900'}`}>
                          {msg.sender?.username || '系统'}
                        </span>
                        {getNotificationText(msg.type)}
                      </p>
                    </div>
                    {msg.content && typeof msg.content === 'string' && msg.type !== 'friend_request' && msg.type !== 'task_invite' && (
                      <div className={`text-[14px] p-2 rounded-lg border italic mt-1 line-clamp-2 ${msg.isRead ? 'text-slate-400 bg-slate-50/50 border-slate-100/50' : 'text-slate-600 bg-slate-50 border-slate-100'}`}>
                        "{msg.content}"
                      </div>
                    )}

                    {/* Friend Request Action */}
                    {msg.type === 'friend_request' && !msg.isRead && (
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={() => handleAcceptFriend(msg)}
                          disabled={!!processingId}
                          className="px-4 py-1.5 bg-[#13a4ec] hover:bg-[#0f8ac4] text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1">
                          {processingId === msg._id ? '处理中...' : '接受'}
                        </button>
                      </div>
                    )}

                    {/* Task Invite Action */}
                    {msg.type === 'task_invite' && !msg.isRead && (
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={() => handleJoinTask(msg)}
                          disabled={!!processingId}
                          className="px-4 py-1.5 bg-[#13a4ec] hover:bg-[#0f8ac4] text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1">
                          {processingId === msg._id ? '处理中...' : '加入队伍'}
                        </button>
                      </div>
                    )}

                    <p className={`text-xs mt-2 ${msg.isRead ? 'text-slate-300' : 'text-slate-400'}`}>{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>

        <div className="fixed bottom-8 right-6 z-40">
          <button
            onClick={markAllRead}
            className="h-14 w-14 rounded-full bg-[#13a4ec] hover:bg-[#0f8ac4] text-white shadow-xl shadow-[#13a4ec]/30 flex items-center justify-center transition-transform active:scale-95 border-2 border-white group"
          >
            <span className="material-symbols-outlined text-[26px] group-hover:animate-bounce">mark_chat_read</span>
          </button>
        </div>
      </div>

      <style>{`
        .bg-light-mesh {
          background-color: #ffffff;
          background-image: 
            radial-gradient(at 0% 0%, rgba(19, 164, 236, 0.04) 0px, transparent 40%),
            radial-gradient(at 100% 100%, rgba(19, 164, 236, 0.04) 0px, transparent 40%);
        }

        .clean-card {
          background: #ffffff;
          border: 1px solid #eef2f6;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        .shadow-soft {
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
};

export default MessageScreen;
