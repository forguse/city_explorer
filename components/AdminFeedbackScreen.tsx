import React, { useState, useEffect } from 'react';
import { feedback, user } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface AdminFeedbackScreenProps {
  onBack: () => void;
}

interface FeedbackItem {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  type: string;
  relatedId?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  compensation?: { type: string; amount: number };
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  'task_report': '任务举报申诉',
  'post_report': '帖子举报申诉',
  'task_rejection': '任务审核申诉',
  'post_deletion': '帖子删除申诉',
  'other': '其他反馈'
};

const AdminFeedbackScreen: React.FC<AdminFeedbackScreenProps> = ({ onBack }) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [processing, setProcessing] = useState(false);

  // 处理表单
  const [processStatus, setProcessStatus] = useState<'approved' | 'rejected'>('approved');
  const [adminNote, setAdminNote] = useState('');
  const [compensationType, setCompensationType] = useState<'points' | 'none'>('none');
  const [compensationAmount, setCompensationAmount] = useState<number>(0);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchFeedbacks();
    }
  }, [isAdmin, filter]);

  const checkAdmin = async () => {
    try {
      const res = await user.getMe();
      if (res.data.isAdmin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await feedback.getAll(filter === 'all' ? undefined : filter);
      setFeedbacks(res.data);
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedItem) return;

    try {
      setProcessing(true);
      await feedback.process(selectedItem._id, {
        status: processStatus,
        adminNote: adminNote.trim() || undefined,
        compensation: compensationType === 'points' && compensationAmount > 0
          ? { type: 'points', amount: compensationAmount }
          : undefined
      });

      alert('处理成功');
      setSelectedItem(null);
      setAdminNote('');
      setCompensationType('none');
      setCompensationAmount(0);
      fetchFeedbacks();
    } catch (err: any) {
      alert(err.response?.data?.error || '处理失败');
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!loading && !isAdmin) {
    return (
      <div className="bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white min-h-screen font-display flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-red-500 mb-4">block</span>
        <p className="text-lg font-bold mb-2">权限不足</p>
        <p className="text-slate-500 dark:text-slate-400 mb-6">只有管理员可以访问此页面</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white min-h-screen font-display">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8fafc]/90 dark:bg-[#0f172a]/90 backdrop-blur-md px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">反馈管理</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">管理员模式</p>
          </div>
          <span className="px-2 py-1 bg-emerald-500 text-white text-xs rounded-full font-bold">
            管理员
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
            >
              {f === 'pending' ? '待处理' : f === 'approved' ? '已采纳' : f === 'rejected' ? '已拒绝' : '全部'}
            </button>
          ))}
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

        {/* Empty */}
        {!loading && feedbacks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-5xl text-emerald-500 mb-4">inbox</span>
            <p className="text-slate-500 dark:text-slate-400">
              {filter === 'pending' ? '暂无待处理反馈' : '暂无记录'}
            </p>
          </div>
        )}

        {/* Feedback List */}
        {!loading && feedbacks.length > 0 && (
          <div className="space-y-4">
            {feedbacks.map((item) => (
              <div
                key={item._id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm"
              >
                {/* User Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    {item.user.avatarUrl ? (
                      <CapacitorImage src={getImageUrl(item.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400">person</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.user.username}</p>
                    <p className="text-xs text-slate-500">{formatTime(item.createdAt)}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${item.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-600'
                      : item.status === 'approved'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                    {item.status === 'pending' ? '待处理' : item.status === 'approved' ? '已采纳' : '已拒绝'}
                  </span>
                </div>

                {/* Type & Content */}
                <div className="mb-3">
                  <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-xs rounded mb-2">
                    {typeLabels[item.type] || item.type}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{item.content}</p>
                  {item.relatedId && (
                    <p className="text-xs text-slate-400 mt-1">相关ID: {item.relatedId}</p>
                  )}
                </div>

                {/* Actions */}
                {item.status === 'pending' && (
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-end">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                    >
                      处理
                    </button>
                  </div>
                )}

                {/* Already processed */}
                {item.status !== 'pending' && item.adminNote && (
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-2">
                    <p className="text-xs text-slate-500 mb-1">回复：</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{item.adminNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Process Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-lg p-6 pb-10 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">处理反馈</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-500 mb-1">{selectedItem.user.username} · {typeLabels[selectedItem.type]}</p>
              <p className="text-sm">{selectedItem.content}</p>
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">处理结果</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setProcessStatus('approved')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${processStatus === 'approved'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  采纳
                </button>
                <button
                  onClick={() => setProcessStatus('rejected')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${processStatus === 'rejected'
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  拒绝
                </button>
              </div>
            </div>

            {/* Admin Note */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">回复内容（选填）</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="给用户的回复..."
                rows={2}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Compensation (only for approved) */}
            {processStatus === 'approved' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">补偿（选填）</label>
                <div className="flex gap-3 mb-2">
                  <button
                    onClick={() => setCompensationType('none')}
                    className={`flex-1 py-2 rounded-xl text-sm transition-colors ${compensationType === 'none'
                        ? 'bg-slate-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700'
                      }`}
                  >
                    无补偿
                  </button>
                  <button
                    onClick={() => setCompensationType('points')}
                    className={`flex-1 py-2 rounded-xl text-sm transition-colors ${compensationType === 'points'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700'
                      }`}
                  >
                    积分补偿
                  </button>
                </div>
                {compensationType === 'points' && (
                  <input
                    type="number"
                    value={compensationAmount}
                    onChange={(e) => setCompensationAmount(Number(e.target.value))}
                    placeholder="输入积分数量"
                    min={0}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleProcess}
              disabled={processing}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {processing ? '处理中...' : '确认处理'}
            </button>
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

export default AdminFeedbackScreen;
