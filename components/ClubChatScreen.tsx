import React, { useState, useEffect, useRef } from 'react';
import { message as messageApi } from '../services/api';

interface ClubChatScreenProps {
  onBack: () => void;
  club?: {
    _id: string;
    name: string;
  };
}

interface GroupMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  content: string;
  type: 'text' | 'image';
  createdAt: string;
}

const ClubChatScreen: React.FC<ClubChatScreenProps> = ({ onBack, club }) => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user ID from localStorage
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?.id;

  // Fetch group messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!club?._id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await messageApi.getGroupMessages(club._id);
        setMessages(response.data);
      } catch (err: any) {
        console.error('Failed to fetch group messages:', err);
        if (err.response?.status !== 404) {
          setError('加载消息失败');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [club?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !club?._id) return;

    setSending(true);
    try {
      const response = await messageApi.sendGroupMessage(club._id, inputText);
      setMessages(prev => [...prev, response.data]);
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
    return date.toLocaleDateString();
  };

  const isMyMessage = (msg: GroupMessage) => {
    return msg.sender._id === currentUserId;
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 dark:text-slate-400">加载消息...</span>
        </div>
      </div>
    );
  }

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
            <h1 className="text-lg font-bold flex-1">{club?.name || '社团群聊'}</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24">
          <div className="flex flex-col gap-3">
            <div className="bg-[#0ea5e9]/10 text-[#0ea5e9] text-xs font-semibold px-3 py-2 rounded-xl">
              本群为社团官方群聊，活动信息以管理员公告为准。
            </div>

            {messages.length === 0 && !loading && (
              <div className="text-center text-gray-400 py-8 text-sm">
                暂无消息，开始聊天吧！
              </div>
            )}

            {messages.map(msg => (
              <div key={msg._id} className={`flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMyMessage(msg)
                    ? 'bg-[#0ea5e9] text-white'
                    : 'bg-slate-50 dark:bg-[#1f1a16] text-slate-900 dark:text-slate-100 border border-gray-100 dark:border-gray-800'
                  }`}>
                  <div className={`text-[10px] mb-1 ${isMyMessage(msg) ? 'text-white/70' : 'text-gray-400'}`}>
                    {msg.sender.username} · {formatTime(msg.createdAt)}
                  </div>
                  <div className="text-sm leading-relaxed">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-[#2d241c]/90 border-t border-gray-100 dark:border-gray-800 p-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1f1a16] border border-gray-100 dark:border-gray-800 rounded-full px-3 py-2">
            <span className="material-symbols-outlined text-gray-400">chat</span>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
              placeholder="说点什么..."
              className="flex-1 bg-transparent outline-none text-sm"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !inputText.trim()}
              className="text-[#0ea5e9] text-sm font-bold disabled:opacity-50"
            >
              {sending ? '...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubChatScreen;
