import React, { useState, useEffect } from 'react';
import { feedback } from '../services/api';

interface FeedbackScreenProps {
  onBack: () => void;
}

interface FeedbackItem {
  _id: string;
  type: string;
  relatedId?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  compensation?: { type: string; amount: number };
  createdAt: string;
  processedAt?: string;
}

const typeLabels: Record<string, string> = {
  'task_report': '任务举报申诉',
  'post_report': '帖子举报申诉',
  'task_rejection': '任务审核申诉',
  'post_deletion': '帖子删除申诉',
  'other': '其他反馈'
};

const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ onBack }) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单状态
  const [formType, setFormType] = useState<string>('other');
  const [formContent, setFormContent] = useState('');
  const [formRelatedId, setFormRelatedId] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await feedback.getMine();
      setFeedbacks(res.data);
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formContent.trim() || formContent.length < 10) {
      alert('请输入至少10个字符的反馈内容');
      return;
    }

    try {
      setSubmitting(true);
      await feedback.create({
        type: formType,
        relatedId: formRelatedId.trim() || undefined,
        content: formContent.trim()
      });

      alert('反馈提交成功，管理员会尽快处理');
      setShowForm(false);
      setFormType('other');
      setFormContent('');
      setFormRelatedId('');
      fetchFeedbacks();
    } catch (err: any) {
      alert(err.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-xs rounded-full">待处理</span>;
      case 'approved':
        return <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded-full">已采纳</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">未通过</span>;
      default:
        return null;
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
            <h1 className="text-xl font-bold">反馈与申诉</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">有问题？告诉我们</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-10 h-10 rounded-full bg-emerald-500 text-white shadow-sm flex items-center justify-center hover:bg-emerald-600 transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
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

        {/* Empty */}
        {!loading && feedbacks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-4">chat_bubble_outline</span>
            <p className="text-slate-500 dark:text-slate-400">暂无反馈记录</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">有问题或建议？点击右上角提交</p>
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
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {typeLabels[item.type] || item.type}
                    </span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{formatTime(item.createdAt)}</span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{item.content}</p>

                {/* Admin Response */}
                {item.status !== 'pending' && (
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      管理员回复 · {item.processedAt && formatTime(item.processedAt)}
                    </p>
                    {item.adminNote && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">{item.adminNote}</p>
                    )}
                    {item.compensation && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-500 text-sm">redeem</span>
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">
                          获得补偿：{item.compensation.type === 'points' && `${item.compensation.amount}积分`}
                        </span>
                      </div>
                    )}
                    {!item.adminNote && !item.compensation && (
                      <p className="text-sm text-slate-400">无额外说明</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Feedback Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-lg p-6 pb-10 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">提交反馈</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Type Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                反馈类型
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="other">其他反馈</option>
                <option value="task_report">任务举报申诉</option>
                <option value="post_report">帖子举报申诉</option>
                <option value="task_rejection">任务审核申诉</option>
                <option value="post_deletion">帖子删除申诉</option>
              </select>
            </div>

            {/* Related ID (optional) */}
            {formType !== 'other' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  相关内容ID（选填）
                </label>
                <input
                  type="text"
                  value={formRelatedId}
                  onChange={(e) => setFormRelatedId(e.target.value)}
                  placeholder="可填写被删除内容的ID"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Content */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                详细描述
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="请详细描述您的问题或建议（至少10个字符）"
                rows={4}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={500}
              />
              <p className="text-xs text-slate-400 mt-1">{formContent.length}/500</p>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || formContent.length < 10}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '提交中...' : '提交反馈'}
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

export default FeedbackScreen;
