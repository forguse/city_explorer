import React, { useState, useEffect } from 'react';
import { user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ShowcaseManagementScreenProps {
  onBack: () => void;
  userId: string;
  completedTasks: any[]; // 用户已完成的任务列表
}

const ShowcaseManagementScreen: React.FC<ShowcaseManagementScreenProps> = ({
  onBack,
  userId,
  completedTasks
}) => {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载当前展示设置
  useEffect(() => {
    const loadShowcase = async () => {
      try {
        const response = await userApi.getShowcase(userId);
        const showcaseIds = response.data.map((exec: any) => exec._id);
        setSelectedTasks(showcaseIds);
      } catch (err) {
        console.error('Failed to load showcase:', err);
      } finally {
        setLoading(false);
      }
    };
    loadShowcase();
  }, [userId]);

  // 切换任务选择状态
  const toggleTask = (executionId: string) => {
    setSelectedTasks(prev => {
      if (prev.includes(executionId)) {
        // 取消选择
        return prev.filter(id => id !== executionId);
      } else {
        // 选择（最多9个）
        if (prev.length >= 9) {
          alert('最多只能展示9个任务');
          return prev;
        }
        return [...prev, executionId];
      }
    });
  };

  // 保存展示设置
  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateMyShowcase(selectedTasks);
      alert('展示设置已保存');
      onBack();
    } catch (err: any) {
      console.error('Failed to save showcase:', err);
      alert(err.response?.data?.error || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#257bf4] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 dark:text-slate-400">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen w-full">
      <div className="relative flex flex-col min-h-screen w-full bg-white dark:bg-[#2d241c] overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#2d241c]/90 backdrop-blur border-b border-gray-100 dark:border-gray-800 w-full">
          <div className="flex items-center px-4 py-3 gap-3 w-full">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold flex-1">精彩瞬间设置</h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#257bf4] text-white rounded-xl text-sm font-bold hover:bg-[#1e6ad4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 w-full">
          {/* 说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#257bf4] text-xl">info</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  从已完成的任务中选择最多 <span className="font-bold text-[#257bf4]">9个</span> 展示在个人主页
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  已选择: {selectedTasks.length}/9
                </p>
              </div>
            </div>
          </div>

          {/* 展示预览（9宫格） */}
          <div className="bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#257bf4]">grid_view</span>
              展示预览
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[...Array(9)].map((_, index) => {
                const executionId = selectedTasks[index];
                const execution = completedTasks.find(t => t._id === executionId);

                return (
                  <div
                    key={index}
                    className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                  >
                    {execution ? (
                      execution.task?.coverImageUrl ? (
                        <CapacitorImage
                          src={getImageUrl(execution.task.coverImageUrl)}
                          alt={execution.task?.title || '任务'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#257bf4] to-[#6366f1] flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-[32px]">explore</span>
                        </div>
                      )
                    ) : (
                      <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-[32px]">
                        image
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 已完成任务列表 */}
          <div className="bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500">check_circle</span>
              已完成的任务
              <span className="text-xs text-gray-400 font-normal">({completedTasks.length})</span>
            </h2>

            {completedTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 block">task_alt</span>
                <p className="text-sm">暂无已完成的任务</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {completedTasks.map((execution) => {
                  const isSelected = selectedTasks.includes(execution._id);

                  return (
                    <button
                      key={execution._id}
                      onClick={() => toggleTask(execution._id)}
                      className={`relative text-left rounded-2xl overflow-hidden border-2 transition-all ${isSelected
                          ? 'border-[#257bf4] shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      {/* 封面图 */}
                      <div className="relative h-24 bg-gray-100 dark:bg-gray-800">
                        {execution.task?.coverImageUrl ? (
                          <CapacitorImage
                            src={getImageUrl(execution.task.coverImageUrl)}
                            alt={execution.task?.title || '任务'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#257bf4] to-[#6366f1] flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[28px]">explore</span>
                          </div>
                        )}

                        {/* 选中标记 */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#257bf4] text-white rounded-full p-1">
                            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              check
                            </span>
                          </div>
                        )}

                        {/* 选中顺序 */}
                        {isSelected && (
                          <div className="absolute bottom-2 left-2 bg-[#257bf4] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            #{selectedTasks.indexOf(execution._id) + 1}
                          </div>
                        )}
                      </div>

                      {/* 任务信息 */}
                      <div className="p-3">
                        <h3 className="font-bold text-sm line-clamp-1">
                          {execution.task?.title || '未知任务'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {execution.completedAt
                            ? new Date(execution.completedAt).toLocaleDateString('zh-CN')
                            : '未知日期'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ShowcaseManagementScreen;
