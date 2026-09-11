import React, { useState, useEffect } from 'react';
import TaskMoreMenu from './TaskMoreMenu';
import TimeLimitBadge from './TimeLimitBadge';
import SerendipityTriggerModal from './SerendipityTriggerModal';
import { task as taskApi, execution as executionApi, encounter as encounterApi, user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import FriendSelectionModal from './FriendSelectionModal';
import ParticipantJournalModal from './ParticipantJournalModal';
import { useSocket } from '../src/contexts/SocketContext';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface PrepData {
  hotelName?: string;
  hotelAddress?: string;
  checkInTime?: string;
  checkOutTime?: string;
  trainNumber?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  ticketCode?: string;
  ticketQRCodeUrl?: string;
  documentType?: string;
  documentContent?: string;
}

interface PrepProgress {
  prepItemId: string;
  title?: string;
  isCompleted: boolean;
  note?: string;
  kind?: string;
  attachmentUrl?: string;
  data?: PrepData;
}

interface TaskExecutionScreenProps {
  onBack: () => void;
  onSettings: () => void;
  taskId?: string | number | null; // 任务ID，用于从后端获取任务详情
  currentNodeIndex?: number; // 当前执行的节点索引
}


const TaskExecutionScreen: React.FC<TaskExecutionScreenProps> = ({ onBack, onSettings, taskId, currentNodeIndex = 0 }) => {
  const [currentUser, setCurrentUser] = useState<any>(null); // Local state for current user
  const [taskData, setTaskData] = useState<any>(null);
  const [executionData, setExecutionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [prepProgress, setPrepProgress] = useState<PrepProgress[]>([]);
  const [showPrepInfo, setShowPrepInfo] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Socket.io for real-time updates
  const { socket, isConnected } = useSocket();

  // 奇遇触发相关状态
  const [triggeredEncounter, setTriggeredEncounter] = useState<any>(null);
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [encounterDeclined, setEncounterDeclined] = useState(false); // 用户已拒绝奇遇

  // QA 状态
  const [showQAModal, setShowQAModal] = useState(false);
  const [qaAnswer, setQaAnswer] = useState('');
  const [qaError, setQaError] = useState('');
  const [qaSubmitting, setQaSubmitting] = useState(false);


  // State for Friend Selection Modal
  const [showFriendModal, setShowFriendModal] = useState(false);

  // State for Participant Journal Modal
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [selectedJournalUserId, setSelectedJournalUserId] = useState<string>('');

  const handleInviteFriend = async (friendId: string) => {
    if (!executionData?._id) return;
    try {
      await executionApi.inviteFriend(executionData._id, friendId);
      alert('邀请已发送');
      setShowFriendModal(false);
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.error || '邀请失败');
    }
  };

  // 从后端获取任务详情和执行记录
  useEffect(() => {
    const fetchTaskAndExecution = async () => {
      if (!taskId) return;

      setLoading(true);
      try {
        // Fetch current user
        try {
          const userRes = await userApi.getMe();
          setCurrentUser(userRes.data);
        } catch (userErr) {
          console.error('Failed to fetch current user:', userErr);
        }

        // 获取任务详情
        const taskResponse = await taskApi.getById(String(taskId));
        setTaskData(taskResponse.data);

        try {
          const execResponse = await executionApi.getOrCreate(String(taskId));
          setExecutionData(execResponse.data);
          if (execResponse.data?.prepProgress) {
            setPrepProgress(execResponse.data.prepProgress);
          }
        } catch (execError) {
          console.error('Failed to fetch execution:', execError);
        }
      } catch (error) {
        console.error('Failed to fetch task detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskAndExecution();
  }, [taskId]);

  // Socket.io: Join execution room and listen for updates
  useEffect(() => {
    if (!socket || !isConnected || !executionData?._id) return;

    // Determine the room ID (use host execution ID for guests)
    const roomId = executionData.coopContext?.isHost
      ? executionData._id
      : executionData.coopContext?.hostExecutionId || executionData._id;

    console.log('[TaskExecutionScreen] Joining execution room:', roomId);
    socket.emit('join-execution', roomId);

    // Listen for execution updates
    const handleExecutionUpdate = (data: any) => {
      console.log('[TaskExecutionScreen] Received execution-updated:', data);

      // Refresh execution data
      if (taskId) {
        executionApi.getOrCreate(String(taskId))
          .then(response => {
            setExecutionData(response.data);
            if (response.data?.prepProgress) {
              setPrepProgress(response.data.prepProgress);
            }
            console.log('[TaskExecutionScreen] Execution data refreshed');
          })
          .catch(error => {
            console.error('[TaskExecutionScreen] Failed to refresh execution:', error);
          });
      }
    };

    socket.on('execution-updated', handleExecutionUpdate);

    // Cleanup
    return () => {
      console.log('[TaskExecutionScreen] Leaving execution room:', roomId);
      socket.emit('leave-execution', roomId);
      socket.off('execution-updated', handleExecutionUpdate);
    };
  }, [socket, isConnected, executionData?._id, taskId]);

  // 奇遇触发检测
  const checkSerendipity = React.useCallback(async () => {
    if (!executionData?._id) {
      console.log('[Serendipity] Skip: No execution data');
      return;
    }
    if (triggeredEncounter) {
      console.log('[Serendipity] Skip: Already triggered');
      return;
    }
    if (encounterDeclined) {
      console.log('[Serendipity] Skip: User declined encounter');
      return;
    }

    try {
      console.log('[Serendipity] Checking trigger for execution:', executionData._id);
      const response = await encounterApi.checkTrigger(executionData._id);
      console.log('[Serendipity] Response:', response.data);

      if (response.data?.triggered) {
        setTriggeredEncounter(response.data.encounter);
        setShowEncounterModal(true);
      } else {
        console.log('[Serendipity] Not triggered, reason:', response.data?.reason);
      }
    } catch (err) {
      console.error('Serendipity check failed:', err);
    }
  }, [executionData?._id, triggeredEncounter, encounterDeclined]);

  useEffect(() => {
    if (executionData?._id && !triggeredEncounter && !encounterDeclined) {
      checkSerendipity();
    }
  }, [executionData?._id, checkSerendipity, triggeredEncounter, encounterDeclined]);

  // 处理奇遇接受
  const handleAcceptEncounter = async () => {
    if (!triggeredEncounter) return;
    try {
      await encounterApi.accept(triggeredEncounter._id);
      setShowEncounterModal(false);
    } catch (err) {
      console.error('Accept encounter failed:', err);
    }
  };

  // 处理奇遇拒绝
  const handleDeclineEncounter = async () => {
    if (triggeredEncounter?._id) {
      try {
        await encounterApi.abandon(triggeredEncounter._id);
      } catch (err) {
        console.error('Abandon encounter failed:', err);
      }
    }
    setShowEncounterModal(false);
    setTriggeredEncounter(null);
    setEncounterDeclined(true); // 标记用户已拒绝，防止重复触发
  };

  // 获取特定类型的准备数据
  const getPrepDataByKind = (kind: string): PrepProgress | undefined => {
    return prepProgress.find(p => p.kind === kind);
  };

  // 获取酒店信息
  const lodgingInfo = getPrepDataByKind('lodging');
  // 获取门票信息
  const ticketInfo = getPrepDataByKind('ticket');
  // 获取交通信息
  const transportInfo = getPrepDataByKind('transport');

  // 获取当前执行的节点
  const currentNode = taskData?.nodes?.[currentNodeIndex];

  // 任务信息（从后端数据或默认值）
  const taskInfo = {
    title: currentNode?.description?.substring(0, 20) || taskData?.title || '加载中...',
    status: '执行中',
    distance: '计算中...',
    duration: '计算中...',
    deadline: '--:-- PM',
    ticketStatus: '待确认',
    coordinates: {
      user: { x: '25%', y: '70%' },
      target: { x: '75%', y: '25%' }
    }
  };

  const startNavigation = () => {
    console.log('启动导航到:', taskInfo.title);
  };

  const callTaxi = () => {
    console.log('一键叫车');
  };

  const [showTaskMenu, setShowTaskMenu] = useState(false);

  const handleShareTask = async () => {
    setShowTaskMenu(false);
    // 分享功能通常使用浏览器原生 API 或第三方 SDK
    if (navigator.share) {
      try {
        await navigator.share({
          title: taskInfo.title,
          text: `来看看这个任务：${taskInfo.title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('分享已取消');
      }
    } else {
      // 复制链接到剪贴板
      navigator.clipboard?.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  const handleFavoriteTask = async () => {
    setShowTaskMenu(false);
    if (!taskId) {
      alert('无法收藏：任务ID不存在');
      return;
    }
    try {
      await taskApi.join(String(taskId)); // 使用 join API 作为收藏
      alert(`已收藏：${taskInfo.title}`);
    } catch (error) {
      console.error('Failed to favorite task:', error);
      alert('收藏失败，请重试');
    }
  };

  const handleReportTask = async () => {
    setShowTaskMenu(false);
    if (!taskId) {
      alert('无法举报：任务ID不存在');
      return;
    }
    try {
      await taskApi.report(String(taskId));
      alert(`已举报：${taskInfo.title}，感谢您的反馈`);
    } catch (error) {
      console.error('Failed to report task:', error);
      alert('举报失败，请重试');
    }
  };

  const handleCheckIn = async () => {
    if (!currentNode || !executionData || !executionData._id) return;

    // Check for QA
    if (currentNode.qaModule?.enabled) {
      setQaAnswer('');
      setQaError('');
      setShowQAModal(true);
      return;
    }

    // Direct Check In
    try {
      await executionApi.checkNode(executionData._id, String(currentNodeIndex), 'manual');
      // Refresh data
      const res = await executionApi.getById(executionData._id);
      setExecutionData(res.data);
      alert('打卡成功！');
      checkSerendipity(); // Check for serendipity after node completion
    } catch (err) {
      console.error('Check-in failed:', err);
      alert('打卡失败，请重试');
    }
  };

  const submitQA = async () => {
    if (!qaAnswer.trim()) {
      setQaError('请输入答案');
      return;
    }
    setQaSubmitting(true);
    if (!executionData?._id) return;

    try {
      const res = await executionApi.validateNodeQA(executionData._id, currentNodeIndex, qaAnswer);
      if (res.data.correct) {
        // Proceed to check in
        setShowQAModal(false);
        await executionApi.checkNode(executionData._id, String(currentNodeIndex), 'qa_pass');
        // Refresh
        const execRes = await executionApi.getById(executionData._id);
        setExecutionData(execRes.data);
        alert('回答正确！打卡成功！');
        checkSerendipity(); // Check for serendipity after node completion
      } else if (res.data.failed_and_skipped) {
        // Auto skip
        setShowQAModal(false);
        const execRes = await executionApi.getById(executionData._id);
        setExecutionData(execRes.data);
        alert(res.data.message || '次数用尽，已自动打卡（未通过挑战）');
      } else {
        setQaError(`回答错误，已尝试 ${res.data.attempts} 次`);

        // Refresh data to update attempts counter UI
        const execRes = await executionApi.getById(executionData._id);
        setExecutionData(execRes.data);

        const maxAttempts = currentNode?.qaModule?.maxAttempts || 3;
        if (taskData?.taskType === 'serendipity' && res.data.attempts >= maxAttempts) {
          alert('挑战失败！奇遇已消失。');
          if (onBack) onBack();
        }
      }
    } catch (err: any) {
      console.error('QA Validation error:', err);
      if (err.response?.data?.deleted) {
        alert(err.response.data.message || '挑战失败，奇遇已失效');
        if (onBack) onBack();
      } else {
        setQaError('验证出错，请重试');
      }
    } finally {
      setQaSubmitting(false);
    }
  };

  // Loading 状态
  if (loading) {
    return (
      <div className="bg-[#f6f7f8] dark:bg-[#101c22] text-slate-900 dark:text-white font-display overflow-hidden h-screen flex flex-col relative">
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-12 pb-2 bg-gradient-to-b from-white/90 to-transparent dark:from-[#101c22]/90 pointer-events-none">
          <button
            onClick={onBack}
            className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-[#1a2c35]/80 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-[#1a2c35] transition-colors text-slate-800 dark:text-white"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          {/* Title or Companions */}
          <div className="flex flex-col items-center">
            <h2 className="pointer-events-auto px-4 py-1 rounded-full bg-white/60 dark:bg-[#1a2c35]/60 backdrop-blur-md text-slate-900 dark:text-white text-sm font-bold tracking-wide uppercase shadow-sm border border-white/20">
              任务执行 <span className="text-[#13a4ec] ml-1">PRO</span>
            </h2>
            {/* Companions Bar */}
            {executionData?.coopContext?.participants && executionData.coopContext.participants.length > 0 && (
              <div className="flex items-center gap-1 mt-1 pointer-events-auto bg-white/40 dark:bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full">
                {executionData.coopContext.participants.map((p: any) => (
                  <CapacitorImage key={p._id} src={getImageUrl(p.avatarUrl)} className="w-5 h-5 rounded-full border border-white" />
                ))}
                {executionData.coopContext.isHost && (
                  <button className="w-5 h-5 rounded-full bg-white/50 flex items-center justify-center hover:bg-white" onClick={() => {/* TODO: Open Invite Modal */ }}>
                    <span className="material-symbols-outlined text-[14px]">add</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onSettings}
            className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/80 dark:bg-[#1a2c35]/80 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-[#1a2c35] transition-colors text-slate-800 dark:text-white"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl text-[#13a4ec] animate-spin">progress_activity</span>
            <p className="text-slate-500 dark:text-slate-400">加载任务信息...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101c22] text-slate-900 dark:text-white font-display overflow-hidden h-screen flex flex-col relative transition-colors duration-300">

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-12 pb-2 bg-gradient-to-b from-white/90 to-transparent dark:from-[#101c22]/90 pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-[#1a2c35]/80 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-[#1a2c35] transition-colors text-slate-800 dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="flex flex-col items-center gap-1">
          <h2 className="pointer-events-auto px-4 py-1 rounded-full bg-white/60 dark:bg-[#1a2c35]/60 backdrop-blur-md text-slate-900 dark:text-white text-sm font-bold tracking-wide uppercase shadow-sm border border-white/20">
            任务执行 <span className="text-[#13a4ec] ml-1">PRO</span>
          </h2>
          {/* Companions Bar */}
          {/* Companions Bar - Always show for Host or if there are participants */}
          {/* Companions Bar - Always show if there are participants or if it's the current user */}
          {(executionData?.coopContext?.participants && executionData.coopContext.participants.length > 0 || true) && (
            <div className="flex items-center gap-1 pointer-events-auto bg-white/40 dark:bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full animate-in fade-in slide-in-from-top-2">
              {(executionData?.coopContext?.participants || [])
                .filter((p: any) => {
                  const pId = typeof p === 'string' ? p : (p._id || p.userId || p.id);
                  const currentId = currentUser?._id || currentUser?.id;
                  return pId && pId !== currentId;
                })
                .map((p: any) => {
                  // Handle both populated objects and string IDs
                  const participantId = typeof p === 'string' ? p : (p._id || p.userId || p.id);
                  const participantName = typeof p === 'string' ? 'user' : (p.username || p.name || 'user');
                  const participantAvatar = typeof p === 'string'
                    ? `https://api.dicebear.com/7.x/notionists/svg?seed=${participantId}`
                    : (p.avatarUrl ? getImageUrl(p.avatarUrl) : `https://api.dicebear.com/7.x/notionists/svg?seed=${participantName}`);

                  return (
                    <CapacitorImage
                      key={participantId}
                      src={participantAvatar}
                      className="w-6 h-6 rounded-full border border-white dark:border-slate-800 cursor-pointer hover:scale-110 transition-transform bg-slate-200 object-cover"
                      onClick={() => {
                        console.log('Clicked Avatar:', p);
                        console.log('Setting selectedJournalUserId:', participantId);
                        setSelectedJournalUserId(participantId);
                        setShowJournalModal(true);
                      }}
                    />
                  );
                })}

              {/* Show Add Button if Host (or no context yet) - Actually allow everyone to invite - Hidden for club activities */}
              {!taskData?.clubId && (
                <button
                  className="w-6 h-6 rounded-full bg-white/50 dark:bg-black/50 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setShowFriendModal(true)}
                  title="邀请好友同行"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onSettings}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/80 dark:bg-[#1a2c35]/80 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-[#1a2c35] transition-colors text-slate-800 dark:text-white"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      {/* Map Section */}
      <div className="relative w-full h-[50vh] bg-slate-200 dark:bg-[#0f161a] overflow-hidden shrink-0">
        <div className="absolute inset-0 transition-all duration-700">
          <CapacitorImage
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAT3eO4-otmq4k7oOE-aA66SRtfSxRoFT-jI56IOXn6J4HaSI1cVINK5-0GOL6AhC2GfGFxCahoAH99-CqJX85Fp8PCH3dsvIhznTyTTnW8n0BrDNB8BPAhOrBgy-v29Je2tS4Qskrj0xwvBmbyLxo5wFEXXb7jBAneFt8Cf5VyZTYpNo8nOVUb7zrnzxfpSZaJ7BGMQfMjTdbcODO4JDY0ne8XdzbX_3fCoGx9gAshAdN7QvrkudlQou0L2BcimY2ympH_UjfcYs8"
            className="w-full h-full object-cover"
            style={{ filter: 'grayscale(20%) contrast(110%) opacity(0.9)' }}
            alt="Map Background"
          />
        </div>

        <div className="absolute inset-0 z-0">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <path
              d="M 120 400 Q 180 300 280 220"
              fill="none"
              stroke="#13a4ec"
              strokeDasharray="8 6"
              strokeLinecap="round"
              strokeWidth="3"
              className="animate-dash"
            ></path>
          </svg>

          <div
            className="user-pulse"
            style={{ left: taskInfo.coordinates.user.x, top: taskInfo.coordinates.user.y }}
          ></div>

          <div
            className="absolute flex flex-col items-center"
            style={{
              left: taskInfo.coordinates.target.x,
              top: taskInfo.coordinates.target.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 2
            }}
          >
            <div className="relative bg-white dark:bg-[#1a2c35] p-1.5 rounded-lg shadow-lg mb-1 animate-bounce">
              <span className="material-symbols-outlined text-[#13a4ec] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            </div>
            <div className="bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap max-w-[120px] truncate">
              {currentNode?.description?.substring(0, 10) || taskData?.title?.substring(0, 10) || '目标位置'}
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 right-4 flex flex-col gap-3 z-10 pb-6">
          {prepProgress.length > 0 && (
            <button
              onClick={() => setShowPrepInfo(true)}
              className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-[#13a4ec] text-white shadow-md hover:shadow-lg transition-all active:scale-95 relative"
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                {prepProgress.filter(p => p.isCompleted).length}
              </span>
            </button>
          )}

          {/* Check-In Button (Host Only) */}
          {executionData?.coopContext?.isHost !== false ? (
            <button
              onClick={handleCheckIn}
              className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-[#1a2c35] text-slate-600 dark:text-slate-200 shadow-md hover:shadow-lg transition-all active:scale-95"
              title="打卡验证"
            >
              <span className="material-symbols-outlined">verified_user</span>
            </button>
          ) : (
            <button
              className="flex size-12 cursor-not-allowed items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 shadow-inner"
              title="等待队长打卡"
            >
              <span className="material-symbols-outlined">group</span>
            </button>
          )}

          <button className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-[#1a2c35] text-[#13a4ec] shadow-md hover:shadow-lg transition-all active:scale-95">
            <span className="material-symbols-outlined">my_location</span>
          </button>
        </div>
      </div>

      {/* Detail Card */}
      <div className="flex-1 relative -mt-6 z-20 flex flex-col">
        <div className="w-full h-full bg-white dark:bg-[#1a2c35] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex flex-col p-6 pb-8 transition-colors duration-300">

          <div className="w-full flex justify-center mb-2">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>

          <div className="flex flex-col gap-6 mb-auto">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-tight">{taskInfo.title}</h1>
                  <span className="bg-[#13a4ec]/10 text-[#13a4ec] text-xs font-bold px-2 py-1 rounded-md">{taskInfo.status}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">straight</span>
                  <p className="text-base font-medium">距离终点：<span className="text-slate-900 dark:text-white font-bold">{taskInfo.distance}</span></p>
                  <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                  <p className="text-sm">步行约 {taskInfo.duration}</p>
                </div>
              </div>
              <button
                onClick={() => setShowTaskMenu(true)}
                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">more_horiz</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 整体任务限时显示 */}
              {taskData?.timeConfig?.taskTimeLimit && taskData.timeConfig.taskTimeLimit.type !== 'none' && (
                <div className="col-span-2">
                  <TimeLimitBadge
                    timeLimit={taskData.timeConfig.taskTimeLimit}
                    startTime={executionData?.startTime}
                    variant="full"
                    onTimeout={() => setIsTimedOut(true)}
                  />
                </div>
              )}

              {/* 当前节点限时显示 */}
              {currentNode?.timeLimit && currentNode.timeLimit.type !== 'none' && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">当前节点限时</span>
                  </div>
                  <TimeLimitBadge
                    timeLimit={currentNode.timeLimit}
                    startTime={executionData?.nodeStartTimes?.[currentNodeIndex]}
                    variant="full"
                  />
                </div>
              )}

              {/* 超时提示 */}
              {isTimedOut && (
                <div className="col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined">warning</span>
                    <div>
                      <p className="font-bold text-sm">任务已超时</p>
                      <p className="text-xs opacity-80">继续完成任务将标记为"完成"而非"成功"</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 门票状态（如果有） */}
              {ticketInfo && ticketInfo.isCompleted && (
                <div className="p-3 rounded-xl bg-[#f6f7f8] dark:bg-[#101c22]/50 border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined text-lg">confirmation_number</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">门票状态</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">已准备</span>
                  </div>
                </div>
              )}

              {/* 住宿信息（如果有） */}
              {lodgingInfo && lodgingInfo.isCompleted && (
                <div className="p-3 rounded-xl bg-[#f6f7f8] dark:bg-[#101c22]/50 border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <span className="material-symbols-outlined text-lg">hotel</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">住宿</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                      {lodgingInfo.data?.hotelName || '已准备'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <div className="flex gap-3 w-full">
              <button
                onClick={startNavigation}
                className="flex-1 group relative overflow-hidden rounded-full bg-[#13a4ec] h-14 flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <div className="flex items-center gap-2 z-10 text-white">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>navigation</span>
                  <span className="text-lg font-bold tracking-wide">导航前往</span>
                </div>
              </button>

              <button
                onClick={callTaxi}
                className="flex-1 group relative overflow-hidden rounded-full bg-[#FF6B00] h-14 flex items-center justify-center shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <div className="flex items-center gap-2 z-10 text-white">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_taxi</span>
                  <span className="text-lg font-bold tracking-wide">一键叫车</span>
                </div>
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 font-medium">
              Line Travel Pro 智能算法推荐路线
            </p>
          </div>

          <div className="h-4"></div>
        </div>
      </div>

      {/* 准备信息侧滑面板 */}
      {showPrepInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPrepInfo(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-[#1a2c35] rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden animate-slide-up">
            <div className="sticky top-0 bg-white dark:bg-[#1a2c35] border-b border-slate-100 dark:border-slate-700/50 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">备战信息</h3>
              <button
                onClick={() => setShowPrepInfo(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(80vh-64px)]">
              {/* 住宿信息 */}
              {lodgingInfo && lodgingInfo.isCompleted && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">hotel</span>
                    <h4 className="font-bold text-purple-800 dark:text-purple-300">住宿信息</h4>
                  </div>
                  {lodgingInfo.data?.hotelName && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                      <span className="font-medium">酒店：</span>{lodgingInfo.data.hotelName}
                    </p>
                  )}
                  {lodgingInfo.data?.hotelAddress && (
                    <div className="flex items-start gap-2 bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 mt-2">
                      <span className="material-symbols-outlined text-purple-500 text-lg">location_on</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{lodgingInfo.data.hotelAddress}</p>
                        <button className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">navigation</span>
                          导航前往酒店
                        </button>
                      </div>
                    </div>
                  )}
                  {(lodgingInfo.data?.checkInTime || lodgingInfo.data?.checkOutTime) && (
                    <div className="flex gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400">
                      {lodgingInfo.data?.checkInTime && <span>入住：{lodgingInfo.data.checkInTime}</span>}
                      {lodgingInfo.data?.checkOutTime && <span>退房：{lodgingInfo.data.checkOutTime}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* 门票信息 */}
              {ticketInfo && ticketInfo.isCompleted && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">confirmation_number</span>
                    <h4 className="font-bold text-blue-800 dark:text-blue-300">门票信息</h4>
                  </div>
                  {ticketInfo.note && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                      <span className="font-medium">景点：</span>{ticketInfo.note}
                    </p>
                  )}
                  {ticketInfo.data?.ticketCode && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                      <span className="font-medium">预约码：</span>
                      <span className="font-mono bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded">{ticketInfo.data.ticketCode}</span>
                    </p>
                  )}
                  {ticketInfo.data?.ticketQRCodeUrl && (
                    <div className="flex justify-center mt-3 bg-white rounded-xl p-4 shadow-inner">
                      <CapacitorImage
                        src={getImageUrl(ticketInfo.data.ticketQRCodeUrl)}
                        alt="门票二维码"
                        className="max-w-[200px] max-h-[200px] object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 交通信息 */}
              {transportInfo && transportInfo.isCompleted && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">train</span>
                    <h4 className="font-bold text-green-800 dark:text-green-300">交通信息</h4>
                  </div>
                  {(transportInfo.data?.trainNumber || transportInfo.data?.flightNumber) && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                      <span className="font-medium">车次/航班：</span>
                      <span className="font-mono bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded">
                        {transportInfo.data.trainNumber || transportInfo.data.flightNumber}
                      </span>
                    </p>
                  )}
                  {(transportInfo.data?.departureTime || transportInfo.data?.arrivalTime) && (
                    <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
                      {transportInfo.data?.departureTime && <span>出发：{transportInfo.data.departureTime}</span>}
                      {transportInfo.data?.arrivalTime && <span>到达：{transportInfo.data.arrivalTime}</span>}
                    </div>
                  )}
                  {transportInfo.attachmentUrl && (
                    <div className="flex justify-center mt-3 bg-white rounded-xl p-3 shadow-inner">
                      <CapacitorImage
                        src={getImageUrl(transportInfo.attachmentUrl)}
                        alt="车票截图"
                        className="max-w-full max-h-[150px] object-contain rounded"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 如果没有任何准备数据 */}
              {prepProgress.filter(p => p.isCompleted).length === 0 && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                  <p>暂无备战信息</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <TaskMoreMenu
        isOpen={showTaskMenu}
        taskTitle={taskInfo.title}
        onClose={() => setShowTaskMenu(false)}
        onShare={handleShareTask}
        onFavorite={handleFavoriteTask}
        onReport={handleReportTask}
      />

      <style>{`
        .user-pulse {
          position: absolute; 
          width: 16px; 
          height: 16px; 
          background: #13a4ec; 
          border: 2px solid white; 
          border-radius: 50%; 
          z-index: 10;
        }
        .user-pulse::after {
          content: ''; 
          position: absolute; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%);
          width: 100%; 
          height: 100%; 
          background: rgba(19, 164, 236, 0.6); 
          border-radius: 50%;
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        
        .animate-dash {
          animation: dash 30s linear infinite;
        }
        @keyframes dash {
          to { stroke-dashoffset: -100; }
        }
        
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* 奇遇触发弹窗 */}
      {showEncounterModal && triggeredEncounter && (
        <SerendipityTriggerModal
          encounter={triggeredEncounter}
          onAccept={handleAcceptEncounter}
          onDecline={handleDeclineEncounter}
        />
      )}

      {/* QA Modal */}
      {showQAModal && currentNode?.qaModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a2c35] rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="size-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <span className="material-symbols-outlined text-2xl">quiz</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">问答挑战</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                {currentNode.qaModule.question || "请回答问题以完成打卡"}
              </p>

              {/* Attempts Indicator */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-full">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">剩余机会</span>
                <span className={`text-xs font-bold ${(currentNode.qaModule.maxAttempts || 3) - (qaError.match(/已尝试 (\d+) 次/) ? parseInt(qaError.match(/已尝试 (\d+) 次/)![1]) : 0) <= 1
                  ? 'text-red-500'
                  : 'text-slate-700 dark:text-slate-200'
                  }`}>
                  {Math.max(0, (currentNode.qaModule.maxAttempts || 3) - (qaError.match(/已尝试 (\d+) 次/) ? parseInt(qaError.match(/已尝试 (\d+) 次/)![1]) : 0))}
                </span>
              </div>

              <div className="w-full">
                <input
                  value={qaAnswer}
                  onChange={e => { setQaAnswer(e.target.value); setQaError(''); }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-purple-500 outline-none text-center font-bold text-slate-900 dark:text-white"
                  placeholder="在此输入答案..."
                  autoFocus
                />
                {qaError && <p className="text-red-500 text-xs mt-2 font-bold">{qaError}</p>}
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setShowQAModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  暂不打卡
                </button>
                <button
                  onClick={submitQA}
                  disabled={qaSubmitting}
                  className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {qaSubmitting ? '验证中...' : '提交答案'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                {taskData?.taskType === 'serendipity' ? '注意：奇遇任务回答错误次数有限！' : '提示：次数用尽将自动跳过（不视为成功挑战）'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Friend Selection Modal */}
      <FriendSelectionModal
        visible={showFriendModal}
        onClose={() => setShowFriendModal(false)}
        onSelect={handleInviteFriend}
        currentParticipants={executionData?.coopContext?.participants || []}
        onParticipantClick={(pid) => {
          setShowFriendModal(false);
          setSelectedJournalUserId(pid);
          setShowJournalModal(true);
        }}
      />

      {/* Participant Journal Modal */}
      <ParticipantJournalModal
        visible={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        targetUserId={selectedJournalUserId}
        taskId={executionData?.taskId || (taskData?._id) || (taskData?.id)} // Need to ensure we have taskId
        taskNodes={taskData?.nodes}
      />
    </div>
  );
};

export default TaskExecutionScreen;
