
import React, { useState, useEffect } from 'react';
import { proverb as proverbApi } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface MyMessagesScreenProps {
  onBack: () => void;
  onOpenChat: (user: any) => void;
}

const MyMessagesScreen: React.FC<MyMessagesScreenProps> = ({ onBack, onOpenChat }) => {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [proverbs, setProverbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProverbs();
  }, [activeTab]);

  const fetchProverbs = async () => {
    try {
      setLoading(true);
      const res = await proverbApi.getMy({ type: activeTab });
      setProverbs(res.data);
    } catch (err) {
      console.error('Failed to fetch proverbs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除吗？')) {
      try {
        await proverbApi.delete(id);
        setProverbs(prev => prev.filter(p => p._id !== id));
      } catch (err) {
        alert('删除失败');
      }
    }
  }

  return (
    <div className="bg-[#f8f7f6] dark:bg-[#221810] min-h-screen w-full flex flex-col font-display">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#2d241c]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[#1b130d] dark:text-white">arrow_back</span>
        </button>
        <div className="flex bg-gray-100 dark:bg-black/20 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'received' ? 'bg-white dark:bg-[#2d241c] shadow-sm text-[#ee7c2b]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            收到的赠言
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'sent' ? 'bg-white dark:bg-[#2d241c] shadow-sm text-[#ee7c2b]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            发出的回赠
          </button>
        </div>
        <div className="w-10"></div>
      </div>

      {/* List */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-400">加载中...</div>
        ) : proverbs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <span className="material-symbols-outlined text-4xl opacity-50">drafts</span>
            <span>暂无{activeTab === 'received' ? '收到' : '发出'}的赠言</span>
          </div>
        ) : (
          proverbs.map((item) => (
            <div key={item._id} className="bg-white dark:bg-[#2d241c] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-3 relative group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
                    <CapacitorImage
                      src={getImageUrl(activeTab === 'received' ? item.author?.avatarUrl : item.recipient?.avatarUrl)}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1b130d] dark:text-white">
                      {activeTab === 'received' ? item.author?.username : `To: ${item.recipient?.username || 'Unknown'}`}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()} · {item.originType === 'task_completion' ? '任务奖励' : '奇遇偶得'}
                    </div>
                  </div>
                </div>
                {activeTab === 'received' && (
                  <button onClick={(e) => handleDelete(item._id, e)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>

              <div className="relative pl-3 border-l-2 border-[#ee7c2b]/30 italic text-gray-600 dark:text-gray-300 font-serif leading-relaxed flex gap-3">
                <div className="flex-1">{item.content}</div>
                {item.imageUrl && (
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <CapacitorImage src={getImageUrl(item.imageUrl)} className="w-full h-full object-cover" alt="attachment" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-1">
                {activeTab === 'received' && !item.isReturnGift && (
                  <button className="text-xs font-bold text-[#ee7c2b] px-3 py-1.5 rounded-full bg-[#ee7c2b]/10 hover:bg-[#ee7c2b]/20 transition-colors">
                    回赠
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default MyMessagesScreen;
