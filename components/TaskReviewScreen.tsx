import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { execution as executionApi, task as taskApi } from '../services/api';
import { getProverbCardStyle, ProverbCardStyle } from './proverbCardStyles';
import { getImageUrl } from '../src/utils/imageUrl';
import ParticipantJournalModal from './ParticipantJournalModal';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface TaskReviewScreenProps {
  onBack: () => void;
  taskId?: string; // If reviewing a specific task base
  executionId?: string; // If reviewing a specific execution
  onRestart?: (taskId: string) => void;
  onShare?: (stats: any) => void;
  onHome?: () => void;
}

const TaskReviewScreen: React.FC<TaskReviewScreenProps> = ({
  onBack,
  taskId,
  executionId,
  onRestart,
  onShare,
  onHome
}) => {
  const [loading, setLoading] = useState(true);
  const [execution, setExecution] = useState<any>(null);
  const [task, setTask] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 图片查看器状态
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);

  // 同行人手帐状态
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [selectedJournalUserId, setSelectedJournalUserId] = useState<string>('');

  // 打开图片查看器
  const openImageViewer = (images: string[], startIndex: number = 0) => {
    setViewerImages(images);
    setViewerIndex(startIndex);
    setShowViewer(true);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let execData;

        if (executionId) {
          const res = await executionApi.getById(executionId);
          execData = res.data;
        } else if (taskId) {
          // Try to find the latest completed execution for this task
          const allExecs = await executionApi.getMyExecutions();
          const related = allExecs.data.filter((e: any) =>
            (e.task?._id === taskId || e.task === taskId) && e.status === 'completed'
          );
          if (related.length > 0) {
            // Sort by completion time (updatedAt) desc
            related.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            execData = related[0];
          }
        }

        if (execData) {
          console.log('[TaskReviewScreen] Received execution data:', {
            _id: execData._id,
            summaryNote: execData.summaryNote,
            summaryImageUrl: execData.summaryImageUrl,
            status: execData.status
          });
          setExecution(execData);
          // If task data is populated in execution, use it. Otherwise fetch.
          if (execData.task && execData.task.title) {
            setTask(execData.task);
          } else {
            const tId = execData.task?._id || execData.task;
            const tRes = await taskApi.getById(tId);
            setTask(tRes.data);
          }
        }
      } catch (err) {
        console.error('Failed to load review data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [taskId, executionId]);

  const getDuration = () => {
    if (!execution?.startTime || !execution?.updatedAt) return '未记录';
    const start = new Date(execution.startTime).getTime();
    const end = new Date(execution.updatedAt).getTime();
    const diff = end - start;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}小时${minutes}分`;
    return `${minutes}分钟`;
  };

  const getNodeRecord = (index: number) => {
    return execution?.nodeRecords?.find((r: any) => r.nodeIndex === index);
  };

  // 获取赠言卡片样式（基于任务ID稳定随机）
  const cardStyle = useMemo(() => {
    const taskSeed = task?._id || task?.id || '';
    return getProverbCardStyle(taskSeed);
  }, [task?._id, task?.id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <span className="material-symbols-outlined text-4xl text-[#0ea5e9] animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!execution || !task) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-4">
        <span className="material-symbols-outlined text-6xl text-slate-300">history_off</span>
        <p className="text-slate-500">未找到回顾记录</p>
        <button onClick={onBack} className="px-6 py-2 bg-slate-200 rounded-full text-slate-600 font-bold">返回</button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 font-display">
      {/* Header / Nav */}
      <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="text-white font-bold text-shadow-sm">旅程回顾</div>
        <button
          onClick={() => onShare?.(execution)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
        >
          <span className="material-symbols-outlined">share</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        {/* Hero Section */}
        <div className="relative h-80 w-full">
          <div className="absolute inset-0">
            <CapacitorImage
              src={task.coverImageUrl ? getImageUrl(task.coverImageUrl) : (task.coverImage ? getImageUrl(task.coverImage) : undefined)}
              alt={task.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-black/30" />

          <div className="absolute bottom-0 left-0 w-full p-6 text-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-300 text-xs font-bold mb-3">
              <span className="material-symbols-outlined text-[16px]">emoji_events</span>
              <span>挑战达成</span>
            </div>
            <h1 className="text-3xl font-bold mb-2 leading-tight">{task.title}</h1>
            <p className="text-slate-300 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {new Date(execution.startTime || execution.createdAt).toLocaleDateString()}
              <span className="mx-1">·</span>
              {getDuration()}
            </p>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-slate-50 dark:bg-slate-900 relative z-10 -mt-6 rounded-t-[32px] min-h-[500px] p-6">

          {/* 旅者感悟 - Always Visible (最上方) */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
              <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">旅者感悟</h3>
            </div>
            <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl p-5 shadow-sm border border-amber-100/50 dark:border-amber-900/20 overflow-hidden">
              {/* 装饰性纹理 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/20 to-transparent rounded-bl-full" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-tr-full" />

              {execution.summaryImageUrl && (
                <div
                  onClick={() => openImageViewer([getImageUrl(execution.summaryImageUrl)])}
                  className="relative w-full h-48 rounded-xl bg-slate-100 mb-4 shadow-inner cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                >
                  <CapacitorImage
                    src={getImageUrl(execution.summaryImageUrl)}
                    alt="Summary"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="relative z-10">
                <span className="absolute -top-1 -left-2 text-5xl text-amber-300/40 dark:text-amber-600/30 font-serif leading-none">"</span>
                <p className={`leading-relaxed px-5 py-2 text-center text-lg font-light tracking-wide ${execution.summaryNote
                  ? 'text-slate-700 dark:text-slate-200'
                  : 'text-slate-400 dark:text-slate-500 italic'
                  }`}>
                  {execution.summaryNote || '此处留白，静待新声'}
                </p>
                <span className="absolute -bottom-3 -right-2 text-5xl text-amber-300/40 dark:text-amber-600/30 font-serif leading-none rotate-180">"</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center">
                <span className="material-symbols-outlined">footprint</span>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{execution.completedNodes?.length || 0} / {task.nodes?.length || 0}</div>
                <div className="text-xs text-slate-500">完成节点</div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{getDuration()}</div>
                <div className="text-xs text-slate-500">总耗时</div>
              </div>
            </div>
          </div>

          {/* 我的手帐入口 - My Journal Entry */}
          <div className="mb-8">
            <button
              onClick={() => {
                setSelectedJournalUserId(typeof execution.user === 'object' ? execution.user._id : execution.user);
                setShowJournalModal(true);
              }}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">book_2</span>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-800 dark:text-white">我的旅行手帐</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">查看完整的打卡记录与笔记</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-orange-400 transition-colors">chevron_right</span>
            </button>
          </div>

          {/* Co-op Participants Section */}
          {execution?.coopContext?.participants && execution.coopContext.participants.length > 1 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
                <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">同行伙伴</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">点击查看同行者的旅行手帐</p>
                <div className="flex flex-wrap gap-3">
                  {execution.coopContext.participants.map((participant: any) => {
                    const participantId = typeof participant === 'string' ? participant : (participant._id || participant.userId || participant.id);
                    const participantName = typeof participant === 'string' ? 'user' : (participant.username || participant.name || 'user');
                    const participantAvatar = typeof participant === 'string'
                      ? `https://api.dicebear.com/7.x/notionists/svg?seed=${participantId}`
                      : (participant.avatarUrl ? getImageUrl(participant.avatarUrl) : `https://api.dicebear.com/7.x/notionists/svg?seed=${participantName}`);

                    return (
                      <div
                        key={participantId}
                        onClick={() => {
                          setSelectedJournalUserId(participantId);
                          setShowJournalModal(true);
                        }}
                        className="flex flex-col items-center gap-2 group cursor-pointer"
                      >
                        <div className="relative">
                          <CapacitorImage
                            src={getImageUrl(participantAvatar)}
                            className="w-16 h-16 rounded-full border-2 border-slate-200 dark:border-slate-700 shadow-md group-hover:scale-110 transition-transform object-cover bg-gray-200"
                            alt={participantName}
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[12px]">book</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[70px] truncate font-medium">
                          {participantName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="mb-8 pl-4">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">history_edu</span>
              精彩瞬间
            </h3>

            <div className="relative border-l-2 border-slate-200 dark:border-slate-700 space-y-8 pb-8">
              {task.nodes?.map((node: any, index: number) => {
                const record = getNodeRecord(index);
                const isCompleted = execution.completedNodes?.includes(index);

                return (
                  <div key={index} className="relative pl-6">
                    {/* Dot */}
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-slate-50 dark:bg-slate-900 ${isCompleted ? 'border-[#0ea5e9]' : 'border-slate-300'
                      }`}>
                      {isCompleted && <div className="w-2 h-2 rounded-full bg-[#0ea5e9]" />}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm ${isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                          {node.title || `节点 ${index + 1}`}
                        </h4>
                        {record && (
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(record.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">{node.description}</p>

                      {/* User Record (Moment) */}
                      {record && (
                        <div className="mt-3 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-[#0ea5e9]" />

                          {/* 支持多图片显示 */}
                          {(record.imageUrls && record.imageUrls.length > 0) ? (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {record.imageUrls.map((url: string, imgIdx: number) => (
                                <div
                                  key={imgIdx}
                                  onClick={() => openImageViewer(record.imageUrls.map((u: string) => getImageUrl(u)), imgIdx)}
                                  className="aspect-square rounded-lg bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                                >
                                  <CapacitorImage
                                    src={getImageUrl(url)}
                                    alt={`record-${imgIdx}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : record.imageUrl && (
                            <div
                              onClick={() => openImageViewer([getImageUrl(record.imageUrl)])}
                              className="w-full h-32 rounded-lg bg-slate-100 mb-3 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                            >
                              <CapacitorImage
                                src={getImageUrl(record.imageUrl)}
                                alt="Record"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {record.note && (
                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                              "{record.note}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* 旅者感悟 - Enhanced User Reflection */}
        {(execution.summaryNote || execution.summaryImageUrl) && (
          <div className="mx-4 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
              <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">旅者感悟</h3>
            </div>
            <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl p-5 shadow-sm border border-amber-100/50 dark:border-amber-900/20 overflow-hidden">
              {/* 装饰性纹理 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/20 to-transparent rounded-bl-full" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-tr-full" />

              {execution.summaryImageUrl && (
                <div
                  onClick={() => openImageViewer([getImageUrl(execution.summaryImageUrl)])}
                  className="relative w-full h-48 rounded-xl bg-slate-100 mb-4 shadow-inner cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                >
                  <CapacitorImage
                    src={getImageUrl(execution.summaryImageUrl)}
                    alt="Summary"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {execution.summaryNote && (
                <div className="relative z-10">
                  <span className="absolute -top-1 -left-2 text-5xl text-amber-300/40 dark:text-amber-600/30 font-serif leading-none">"</span>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed px-5 py-2 text-center text-lg font-light tracking-wide">
                    {execution.summaryNote}
                  </p>
                  <span className="absolute -bottom-3 -right-2 text-5xl text-amber-300/40 dark:text-amber-600/30 font-serif leading-none rotate-180">"</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 作者赠言 - Proverb Card with Dynamic Style */}
        {task.completionMessage && (
          <div className="mx-4 mb-8">
            <div className="relative overflow-hidden rounded-2xl">
              {/* 背景：用户传图时显示用户图片，否则显示默认渐变 */}
              {task.completionImageUrl ? (
                <>
                  <div className="absolute inset-0">
                    <CapacitorImage
                      src={getImageUrl(task.completionImageUrl)}
                      alt="Completion"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
                </>
              ) : (
                <>
                  <div className="absolute inset-0" style={{ background: cardStyle.backgroundGradient }} />
                  {/* 装饰性纹理层 */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }} />
                </>
              )}

              {/* 顶部装饰线 */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px]"
                style={{ background: task.completionImageUrl ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)' : `linear-gradient(to right, transparent, ${cardStyle.accentColor}, transparent)` }}
              />

              <div className="relative z-10 p-6 pt-8">
                {/* 标题 */}
                <div className="flex items-center justify-center gap-2 mb-5">
                  <span className="w-8 h-[1px]" style={{ background: task.completionImageUrl ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.5))' : `linear-gradient(to right, transparent, ${cardStyle.accentColor})` }} />
                  <span className="text-xs font-medium tracking-[0.3em] uppercase" style={{ color: task.completionImageUrl ? 'rgba(255,255,255,0.7)' : cardStyle.labelColor }}>赠言</span>
                  <span className="w-8 h-[1px]" style={{ background: task.completionImageUrl ? 'linear-gradient(to left, transparent, rgba(255,255,255,0.5))' : `linear-gradient(to left, transparent, ${cardStyle.accentColor})` }} />
                </div>

                {/* 赠言内容 */}
                <div className="text-center mb-5">
                  <p className="text-xl leading-relaxed font-light tracking-wider" style={{ color: task.completionImageUrl ? '#ffffff' : cardStyle.textColor }}>
                    「{task.completionMessage}」
                  </p>
                </div>

                {/* 作者署名 */}
                <div className="flex items-center justify-center gap-2" style={{ color: task.completionImageUrl ? 'rgba(255,255,255,0.6)' : cardStyle.textMutedColor }}>
                  <span className="w-6 h-[1px]" style={{ background: task.completionImageUrl ? 'rgba(255,255,255,0.4)' : cardStyle.textMutedColor }} />
                  <span className="text-xs tracking-wide">— {task.author?.username || '旅途指引者'}</span>
                  <span className="w-6 h-[1px]" style={{ background: task.completionImageUrl ? 'rgba(255,255,255,0.4)' : cardStyle.textMutedColor }} />
                </div>
              </div>

              {/* 底部装饰 */}
              <div
                className="absolute bottom-0 left-0 w-full h-1"
                style={{ background: task.completionImageUrl ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)' : `linear-gradient(to right, transparent, ${cardStyle.accentColor}, transparent)` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 px-4 pb-8">
          <button
            onClick={() => onRestart?.(task.id || task._id)}
            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">replay</span>
            再次挑战
          </button>
          <button
            onClick={onHome}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">home</span>
            回到首页
          </button>
        </div>
      </div>

      {/* 图片查看器 */}
      {showViewer && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onClick={(e) => {
            e.stopPropagation();
            // 点击背景关闭查看器
            if (e.target === e.currentTarget) {
              setShowViewer(false);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* 顶部栏 */}
          <div className="flex items-center justify-between p-4 text-white">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowViewer(false);
              }}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <span className="text-sm text-white/70">
              {viewerIndex + 1} / {viewerImages.length}
            </span>
            <div className="w-10" />
          </div>

          {/* 图片区域 */}
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              // 点击图片区域关闭查看器
              if (e.target === e.currentTarget) {
                setShowViewer(false);
              }
            }}
          >
            <CapacitorImage
              src={getImageUrl(viewerImages[viewerIndex])}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* 底部导航（多图时显示） */}
          {viewerImages.length > 1 && (
            <div className="flex items-center justify-center gap-4 p-4 pb-8">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIndex((prev: number) => Math.max(0, prev - 1));
                }}
                disabled={viewerIndex === 0}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${viewerIndex === 0 ? 'bg-white/5 text-white/30' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="flex gap-2">
                {viewerImages.map((_: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerIndex(idx);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${idx === viewerIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                      }`}
                  />
                ))}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIndex((prev: number) => Math.min(viewerImages.length - 1, prev + 1));
                }}
                disabled={viewerIndex === viewerImages.length - 1}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${viewerIndex === viewerImages.length - 1 ? 'bg-white/5 text-white/30' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Participant Journal Modal */}
      <ParticipantJournalModal
        visible={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        executionId={execution?._id || ''}
        targetUserId={selectedJournalUserId}
        taskNodes={task?.nodes || []}
        isCoop={execution?.coopContext?.participants?.length > 1}
      />
    </div>
  );
};

export default TaskReviewScreen;
