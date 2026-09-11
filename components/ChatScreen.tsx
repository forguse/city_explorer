import React, { useState, useEffect, useRef } from 'react';
import { message as messageApi, user as userApi } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface ChatScreenProps {
  onBack: () => void;
  targetUserId?: string;
  targetUser?: {
    id: string;
    name: string;
    avatar: string;
    level?: number;
    title?: string;
  };
}

interface Message {
  _id: string;
  content: string;
  sender: string;
  receiver: string;
  type: 'text' | 'image';
  createdAt: string;
}

interface UserProfile {
  _id: string;
  username: string;
  avatarUrl?: string;
  level: number;
  experience: number;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ onBack, targetUserId, targetUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friend'>('none');
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user ID from localStorage
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?.id;

  // Determine user ID to fetch
  const userId = targetUserId || targetUser?.id;

  // Fetch user profile from API if only userId is provided
  useEffect(() => {
    const fetchUser = async () => {
      // If targetUser is provided with full data, use it directly
      if (targetUser && targetUser.name) {
        setUser({
          _id: targetUser.id,
          username: targetUser.name,
          avatarUrl: targetUser.avatar,
          level: targetUser.level || 1,
          experience: 0
        });
        setUserLoading(false);
        return;
      }

      // Otherwise fetch from API using userId
      if (!userId) {
        setError('No user specified');
        setUserLoading(false);
        return;
      }

      try {
        const response = await userApi.getById(userId);
        setUser(response.data);
      } catch (err: any) {
        console.error('Failed to fetch user:', err);
        setError('无法加载用户信息');
      } finally {
        setUserLoading(false);
      }
    };
    fetchUser();
  }, [userId, targetUser]);

  // Fetch messages from API
  useEffect(() => {
    const fetchMessages = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await messageApi.getConversation(userId);
        setMessages(response.data);
      } catch (err: any) {
        console.error('Failed to fetch messages:', err);
        // Don't show error for empty conversations
        if (err.response?.status !== 404) {
          setError(err.message || 'Failed to load messages');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !userId) return;

    const tempMessage: Message = {
      _id: `temp_${Date.now()}`,
      content: inputText,
      sender: currentUserId || 'me',
      receiver: userId,
      type: 'text',
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);
    setInputText('');

    try {
      const response = await messageApi.send({
        receiverId: userId,
        content: inputText,
        type: 'text'
      });
      // Replace temp message with real one
      setMessages(prev => prev.map(m => m._id === tempMessage._id ? response.data : m));
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove temp message on failure
      setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
      alert('发送失败，请重试');
    }
  };

  const handleAddFriend = () => {
    setFriendStatus('pending');
    // TODO: Call friend request API when implemented
  };

  const handleAcceptFriend = () => {
    setFriendStatus('friend');
    // TODO: Call accept friend API when implemented
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isSentByMe = (msg: Message) => {
    return msg.sender === currentUserId || msg.sender === 'me';
  };

  // Get display values from user
  const displayName = user?.username || '加载中...';
  const displayAvatar = user?.avatarUrl || 'https://placehold.co/100x100/1e293b/white?text=User';
  const displayLevel = user?.level || 1;

  // Loading state
  if (loading || userLoading) {
    return (
      <div className="flex flex-col h-screen bg-[#f0f2f5] dark:bg-[#1a1a1a] font-display items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-500 dark:text-slate-400 mt-4">加载中...</span>
      </div>
    );
  }

  // Error state
  if (error && !user) {
    return (
      <div className="flex flex-col h-screen bg-[#f0f2f5] dark:bg-[#1a1a1a] font-display items-center justify-center p-4">
        <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
        <p className="text-slate-600 dark:text-slate-400">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#0ea5e9] text-white rounded-lg"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f0f2f5] dark:bg-[#1a1a1a] font-display">

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white dark:bg-[#242424] border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-slate-700 dark:text-gray-200">arrow_back</span>
          </button>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setShowUserInfo(true)}
          >
            <div className="relative">
              <CapacitorImage src={getImageUrl(displayAvatar)} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#242424]"></div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{displayName}</h2>
                {friendStatus === 'friend' && (
                  <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold rounded">好友</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Lv.{displayLevel}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {friendStatus === 'none' && (
            <button
              onClick={handleAddFriend}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[#0ea5e9] bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 transition-colors text-sm font-medium"
              title="添加好友"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>加好友</span>
            </button>
          )}
          {friendStatus === 'pending' && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-gray-500 bg-gray-100 dark:bg-gray-800 text-sm font-medium">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              <span>已申请</span>
            </span>
          )}
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-600 dark:text-gray-300">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </header>

      {/* Friend Request Banner (if pending from them) */}
      {friendStatus === 'none' && (
        <div className="bg-[#0ea5e9]/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0ea5e9] text-[20px]">person_add</span>
            <span className="text-sm text-slate-700 dark:text-gray-300">
              <strong>{displayName}</strong> 想添加你为好友
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAcceptFriend}
              className="px-4 py-1.5 bg-[#0ea5e9] text-white rounded-full text-sm font-bold hover:bg-sky-600 transition-colors"
            >
              接受
            </button>
            <button className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              忽略
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]/10 dark:bg-black/20">
        {messages.length === 0 && !loading && (
          <div className="flex justify-center my-8">
            <span className="text-sm text-gray-400">暂无消息，开始对话吧！</span>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex justify-center my-4">
            <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full">
              {new Date(messages[0]?.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${isSentByMe(msg) ? 'justify-end' : 'justify-start'}`}
          >
            {!isSentByMe(msg) && (
              <CapacitorImage src={getImageUrl(displayAvatar)} className="w-8 h-8 rounded-full mr-2 self-end mb-1" alt="Avatar" />
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm relative shadow-sm ${isSentByMe(msg)
                ? 'bg-[#0ea5e9] text-white rounded-br-none'
                : 'bg-white dark:bg-[#2d2d2d] text-slate-800 dark:text-gray-100 rounded-bl-none'
                }`}
            >
              <p className="leading-relaxed">{msg.content}</p>
              <span
                className={`text-[10px] block text-right mt-1 ${isSentByMe(msg) ? 'text-blue-100' : 'text-gray-400'
                  }`}
              >
                {formatTime(msg.createdAt)}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-[#242424] border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-end gap-2">
          <button className="p-2 text-slate-500 dark:text-gray-400 hover:text-[#0ea5e9] transition-colors">
            <span className="material-symbols-outlined text-[24px]">add_circle</span>
          </button>
          <div className="flex-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl flex items-center px-4 py-2 min-h-[44px]">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="发送消息..."
              maxLength={1000}
              className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white text-sm placeholder-gray-500"
            />
            <button className="text-slate-400 hover:text-[#0ea5e9] ml-2">
              <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
            </button>
          </div>
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              className="p-2 bg-[#0ea5e9] text-white rounded-full hover:bg-sky-600 transition-all shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px] flex items-center justify-center">send</span>
            </button>
          ) : (
            <button className="p-2 text-slate-500 dark:text-gray-400 hover:text-[#0ea5e9] transition-colors">
              <span className="material-symbols-outlined text-[24px]">mic</span>
            </button>
          )}
        </div>
      </div>

      {/* User Info Modal */}
      {showUserInfo && user && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center max-w-md mx-auto">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowUserInfo(false)}
          ></div>

          <div className="relative w-full bg-white dark:bg-[#242424] rounded-t-[32px] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center mb-4" onClick={() => setShowUserInfo(false)}>
              <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></div>
            </div>

            {/* User Profile Card */}
            <div className="flex flex-col items-center text-center">
              <CapacitorImage
                src={getImageUrl(displayAvatar)}
                alt={displayName}
                className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-700 shadow-lg mb-3"
              />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{displayName}</h3>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold rounded-full mb-4">
                <span className="material-symbols-outlined text-[12px]">stars</span>
                Lv.{displayLevel}
              </div>

              {/* Friend Status */}
              <div className="w-full flex gap-3 mt-2">
                {friendStatus === 'none' && (
                  <button
                    onClick={() => {
                      handleAddFriend();
                      setShowUserInfo(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0ea5e9] text-white rounded-xl font-bold hover:bg-sky-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    添加好友
                  </button>
                )}
                {friendStatus === 'pending' && (
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-xl font-bold"
                  >
                    <span className="material-symbols-outlined text-[20px]">schedule</span>
                    等待对方接受
                  </button>
                )}
                {friendStatus === 'friend' && (
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl font-bold"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    已是好友
                  </button>
                )}
                <button
                  onClick={() => setShowUserInfo(false)}
                  className="flex items-center justify-center w-12 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-from-bottom {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-in { animation: slide-in-from-bottom 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default ChatScreen;
