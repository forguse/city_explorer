import React, { useState, useEffect } from 'react';
import { club as clubApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ClubJoinRequestsScreenProps {
  onBack: () => void;
  club: any;
}

interface JoinRequest {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatarUrl?: string;
    level?: number;
    bio?: string;
  };
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  rejectReason?: string;
}

const ClubJoinRequestsScreen: React.FC<ClubJoinRequestsScreenProps> = ({ onBack, club }) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch join requests
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const response = await clubApi.getJoinRequests(club._id, filter);
        setRequests(response.data);
      } catch (err) {
        console.error('Failed to fetch join requests:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [club._id, filter]);

  const handleReview = async (requestId: string, action: 'approve' | 'reject') => {
    if (processingId) return;

    let rejectReason = '';
    if (action === 'reject') {
      rejectReason = prompt('请输入拒绝原因（可选）') || '';
    }

    setProcessingId(requestId);
    try {
      await clubApi.reviewJoinRequest(club._id, requestId, action, rejectReason);
      // Update local state
      setRequests(prev => prev.map(req =>
        req._id === requestId
          ? { ...req, status: action === 'approve' ? 'approved' : 'rejected', rejectReason }
          : req
      ));
      alert(action === 'approve' ? '已通过申请' : '已拒绝申请');
    } catch (err: any) {
      console.error('Failed to review request:', err);
      alert(err.response?.data?.error || '操作失败，请重试');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen w-full">
      <div className="relative flex flex-col min-h-screen w-full bg-white dark:bg-[#2d241c] overflow-hidden">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#2d241c]/90 backdrop-blur border-b border-gray-100 dark:border-gray-800 w-full">
          <div className="flex items-center px-4 py-3 gap-3 w-full">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">入社申请</h1>
              <p className="text-xs text-gray-500">{club.name}</p>
            </div>
          </div>
        </header>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-4">
          {[
            { key: 'pending', label: '待审核', count: pendingCount },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已拒绝' },
            { key: 'all', label: '全部' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${filter === tab.key
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 w-full">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">inbox</span>
              暂无{filter === 'pending' ? '待审核' : filter === 'approved' ? '已通过' : filter === 'rejected' ? '已拒绝' : ''}申请
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request._id}
                className="bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                    {request.user.avatarUrl ? (
                      <CapacitorImage
                        src={getImageUrl(request.user.avatarUrl)}
                        alt={request.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400">person</span>
                      </div>
                    )}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{request.user.username}</span>
                      {request.user.level && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          Lv.{request.user.level}
                        </span>
                      )}
                    </div>
                    {request.user.bio && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{request.user.bio}</p>
                    )}
                    {request.message && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-[#241c16] rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-300">"{request.message}"</p>
                      </div>
                    )}
                    <div className="mt-2 text-[10px] text-gray-400">
                      申请时间：{formatDate(request.createdAt)}
                    </div>
                  </div>

                  {/* Status / Actions */}
                  <div className="flex-shrink-0">
                    {request.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(request._id, 'reject')}
                          disabled={processingId === request._id}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          拒绝
                        </button>
                        <button
                          onClick={() => handleReview(request._id, 'approve')}
                          disabled={processingId === request._id}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                          {processingId === request._id ? '...' : '通过'}
                        </button>
                      </div>
                    ) : request.status === 'approved' ? (
                      <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        已通过
                      </span>
                    ) : (
                      <div className="text-right">
                        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-500">
                          已拒绝
                        </span>
                        {request.rejectReason && (
                          <p className="text-[10px] text-gray-400 mt-1 max-w-[100px] truncate">
                            {request.rejectReason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
};

export default ClubJoinRequestsScreen;
