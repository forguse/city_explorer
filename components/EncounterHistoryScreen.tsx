import React, { useState, useEffect, useCallback } from 'react';
import { encounter as encounterApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface EncounterHistoryScreenProps {
  onBack: () => void;
  onOpenEncounter?: (encounterId: string) => void;
  filterTaskId?: string | number | null;
}

interface EncounterItem {
  id: string;
  title: string;
  type: string;
  status: string;
  statusLabel: string;
  coverImage: string;
  taskId?: string;
}

const EncounterHistoryScreen: React.FC<EncounterHistoryScreenProps> = ({
  onBack,
  onOpenEncounter,
  filterTaskId
}) => {
  const [encounters, setEncounters] = useState<EncounterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EncounterItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await encounterApi.getHistory();
      const rawList = response.data;

      const transformedList = rawList.map((item: any) => ({
        id: item._id,
        title: item.serendipityTask?.title || '未知奇遇',
        type: '奇遇任务',
        status: item.status,
        statusLabel: item.status === 'completed' ? '已完成' :
          item.status === 'active' ? '进行中' :
            item.status === 'abandoned' ? '已放弃' :
              item.status === 'expired' ? '已过期' : '未知',
        coverImage: getImageUrl(item.serendipityTask?.coverImageUrl) || 'https://via.placeholder.com/150',
        taskId: item.serendipityTask?._id
      }));

      setEncounters(transformedList);
    } catch (err) {
      console.error('Failed to fetch encounter history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await encounterApi.delete(deleteTarget.id);
      setEncounters(prev => prev.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const list = filterTaskId ? encounters.filter(e => e.taskId == filterTaskId) : encounters;

  return (
    <div className="bg-[#0b0c10] text-white min-h-screen font-display">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto bg-[#0b0c10] shadow-2xl overflow-hidden flex-col">
        <header className="sticky top-0 z-40 bg-[#0b0c10]/90 backdrop-blur border-b border-white/10">
          <div className="flex items-center p-4 justify-between h-14">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h2 className="text-white text-lg font-bold tracking-tight">我的奇遇</h2>
            <div className="size-10"></div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 space-y-3 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center text-sm text-slate-400 pt-10">
              <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">explore_off</span>
              暂无奇遇记录
            </div>
          ) : (
            list.map(encounter => (
              <div
                key={encounter.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* 点击封面或标题进入详情 */}
                  <button
                    onClick={() => onOpenEncounter?.(encounter.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="size-12 rounded-xl bg-slate-800 shrink-0 overflow-hidden">
                      <CapacitorImage
                        src={encounter.coverImage}
                        className="w-full h-full object-cover"
                        alt={encounter.title}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{encounter.title}</h3>
                      <p className="text-xs text-slate-400 truncate mt-1">{encounter.type}</p>
                    </div>
                  </button>

                  {/* 状态标签 */}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${encounter.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    encounter.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                      encounter.status === 'abandoned' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-white/10 text-slate-200'
                    }`}>
                    {encounter.statusLabel}
                  </span>

                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(encounter); }}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors shrink-0"
                    title="删除奇遇"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </main>
      </div>

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center border border-white/10">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-400 text-2xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">确认删除</h3>
            <p className="text-slate-400 text-sm mb-2">即将删除奇遇：</p>
            <p className="text-white font-medium mb-6">「{deleteTarget.title}」</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-50 hover:bg-red-600 transition-colors"
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EncounterHistoryScreen;

