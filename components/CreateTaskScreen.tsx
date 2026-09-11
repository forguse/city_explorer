import React, { useState, useRef } from 'react';
import { task as taskApi, club as clubApi } from '../services/api';
import CitySelector from './CitySelector';
import ImageUploader from '../src/components/common/ImageUploader';
import { useImageUpload } from '../src/hooks/useImageUpload';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface CreateTaskScreenProps {
  onBack: () => void;
  onSuccess?: (taskId: string) => void;
  remixSourceId?: string; // 🆕 支持魔改模式
  clubId?: string; // 🆕 社团活动模式
}

interface ImageItem {
  id: number;
  src: string;
  alt: string;
}

interface TaskNode {
  id: number;
  description: string;
  useLocation: boolean;
  locationName?: string;
  useImage: boolean;
  imageUrl?: string;
  // 节点时间限制
  useTimeLimit: boolean;
  timeLimitType?: 'countdown' | 'timeRange' | 'deadline' | 'none';
  countdownMinutes?: number;
  timeRangeStart?: string;
  timeRangeEnd?: string;
  timeRangeDate?: string;  // 可选日期 "YYYY-MM-DD"
  deadlineTime?: string;
  deadlineType?: 'before' | 'after';
  deadlineDate?: string;   // 可选日期 "YYYY-MM-DD"
  // 🆕 节点问答
  useQA: boolean;
  qaQuestion?: string;
  qaAnswers?: string;  // 逗号分隔
  qaMaxAttempts?: number;
}

function getChecklistTitle(key: string) {
  switch (key) {
    case 'ticket': return '门票';
    case 'transport': return '车票';
    case 'lodging': return '住宿';
    case 'documents': return '证件';
    default: return '其他';
  }
}

const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({ onBack, onSuccess, remixSourceId, clubId }) => {
  const [missionTitle, setMissionTitle] = useState('');
  const [description, setDescription] = useState('');

  // New City Selector State
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [prepChecklist, setPrepChecklist] = useState({
    ticket: { enabled: false, info: '' },
    transport: { enabled: false, info: '' },
    lodging: { enabled: false, info: '' },
    documents: { enabled: false, info: '' },
    other: { enabled: false, info: '' }
  });
  const [nodes, setNodes] = useState<TaskNode[]>([
    { id: 1, description: '', useLocation: false, useImage: false, useTimeLimit: false, useQA: false }
  ]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [completionMessage, setCompletionMessage] = useState('');
  const [completionImage, setCompletionImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🆕 地点输入模态框状态
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationModalNodeId, setLocationModalNodeId] = useState<number | null>(null);
  const [locationInput, setLocationInput] = useState('');

  // 🆕 任务类型状态
  const [taskType, setTaskType] = useState<'normal' | 'serendipity'>('normal');

  // 🆕 奇遇任务专属状态
  const [serendipitySuccessMessage, setSerendipitySuccessMessage] = useState('');  // 奇遇赠言
  const [serendipityCompletionImage, setSerendipityCompletionImage] = useState<string | null>(null);  // 奇遇赠言图片
  const [expiryDays, setExpiryDays] = useState(3);  // 生命周期

  // 🆕 问答模块状态（两种任务都可用）
  const [qaEnabled, setQaEnabled] = useState(false);
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswers, setQaAnswers] = useState('');  // 逗号分隔的多个答案
  const [qaMaxAttempts, setQaMaxAttempts] = useState(3);

  // 时间配置状态
  const [hasTimeChallenge, setHasTimeChallenge] = useState(false);
  const [taskTimeLimitType, setTaskTimeLimitType] = useState<'countdown' | 'timeRange' | 'deadline' | 'none'>('none');
  const [countdownMinutes, setCountdownMinutes] = useState(60);
  const [timeRangeStart, setTimeRangeStart] = useState('09:00');
  const [timeRangeEnd, setTimeRangeEnd] = useState('18:00');
  const [deadlineTime, setDeadlineTime] = useState('12:00');
  const [deadlineType, setDeadlineType] = useState<'before' | 'after'>('before');
  // 日期设定状态
  const [timeRangeDateEnabled, setTimeRangeDateEnabled] = useState(false);
  const [taskTimeRangeDate, setTaskTimeRangeDate] = useState('');
  const [deadlineDateEnabled, setDeadlineDateEnabled] = useState(false);
  const [taskDeadlineDate, setTaskDeadlineDate] = useState('');
  // 活动任务状态
  const [isEventTask, setIsEventTask] = useState(!!clubId); // 社团活动强制为活动任务
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(18); // 社团活动人数上限

  // 🆕 数据回填 Effect
  React.useEffect(() => {
    if (remixSourceId) {
      const fetchSourceTask = async () => {
        setLoading(true);
        try {
          const res = await taskApi.getById(remixSourceId);
          const task = res.data;

          if (task) {
            // 回填基本信息
            setMissionTitle(`${task.title} (魔改版)`);
            setDescription(task.description || '');
            setTargetCities(task.targetCities || []);
            setTaskType(task.taskType || (task.isSerendipity ? 'serendipity' : 'normal'));

            // 回填封面
            if (task.coverImageUrl) {
              setImages([{ id: Date.now(), src: task.coverImageUrl, alt: 'Cover' }]);
            }

            // 回填完成信息
            setCompletionMessage(task.completionMessage || '');
            setCompletionImage(task.completionImageUrl || null);

            // 回填节点
            if (task.nodes && task.nodes.length > 0) {
              const mappedNodes = task.nodes.map((n: any, idx: number) => ({
                id: Date.now() + idx,
                description: n.description || '',
                useLocation: !!n.isLocationSpecific,
                locationName: n.location?.name,
                useImage: !!n.referenceImageUrl,
                imageUrl: n.referenceImageUrl,

                // 时间限制回填
                useTimeLimit: !!n.timeLimit,
                timeLimitType: n.timeLimit?.type,
                countdownMinutes: n.timeLimit?.countdownMinutes,
                timeRangeStart: n.timeLimit?.timeRangeStart,
                timeRangeEnd: n.timeLimit?.timeRangeEnd,
                timeRangeDate: n.timeLimit?.timeRangeDate,
                deadlineTime: n.timeLimit?.deadlineTime,
                deadlineType: n.timeLimit?.deadlineType,
                deadlineDate: n.timeLimit?.deadlineDate,

                // 问答回填
                useQA: !!n.qaModule?.enabled,
                qaQuestion: n.qaModule?.question,
                qaAnswers: n.qaModule?.correctAnswers?.join(','),
                qaMaxAttempts: n.qaModule?.maxAttempts
              }));
              setNodes(mappedNodes);
            }

            // 回填备战清单
            if (task.prepListConfig && task.prepListConfig.length > 0) {
              const newChecklist = { ...prepChecklist };
              task.prepListConfig.forEach((item: any) => {
                const key = item.type as keyof typeof prepChecklist;
                if (newChecklist[key]) {
                  newChecklist[key] = { enabled: true, info: item.defaultNote || '' };
                }
              });
              setPrepChecklist(newChecklist);
            }

            // 回填任务级配置 (时间/活动)
            if (task.timeConfig) {
              const tc = task.timeConfig;
              setHasTimeChallenge(!!tc.hasTimeChallenge);
              if (tc.taskTimeLimit) {
                setTaskTimeLimitType(tc.taskTimeLimit.type);
                setCountdownMinutes(tc.taskTimeLimit.countdownMinutes || 60);
                setTimeRangeStart(tc.taskTimeLimit.timeRangeStart || '09:00');
                setTimeRangeEnd(tc.taskTimeLimit.timeRangeEnd || '18:00');
                if (tc.taskTimeLimit.timeRangeDate) {
                  setTimeRangeDateEnabled(true);
                  setTaskTimeRangeDate(tc.taskTimeLimit.timeRangeDate);
                }
                setDeadlineTime(tc.taskTimeLimit.deadlineTime || '12:00');
                setDeadlineType(tc.taskTimeLimit.deadlineType || 'before');
                if (tc.taskTimeLimit.deadlineDate) {
                  setDeadlineDateEnabled(true);
                  setTaskDeadlineDate(tc.taskTimeLimit.deadlineDate);
                }
              }
              setIsEventTask(!!tc.isEventTask);
              if (tc.eventStartDate) {
                const d = new Date(tc.eventStartDate);
                if (!isNaN(d.getTime())) setEventStartDate(d.toISOString().slice(0, 16));
              }
              if (tc.eventEndDate) {
                const d = new Date(tc.eventEndDate);
                if (!isNaN(d.getTime())) setEventEndDate(d.toISOString().slice(0, 16));
              }
            }

            // 回填奇遇配置
            if (task.serendipityConfig) {
              setExpiryDays(task.serendipityConfig.expiryDays || 3);
              setSerendipitySuccessMessage(task.serendipityConfig.successMessage || '');
            }
          }
        } catch (err) {
          console.error("Failed to load remix source:", err);
          setError("无法加载原任务数据，请重试");
        } finally {
          setLoading(false);
        }
      };

      fetchSourceTask();
    }
  }, [remixSourceId]);

  // 赠言图片上传
  const proverbImageInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadImage, loading: imageUploading } = useImageUpload();

  const triggerProverbImageUpload = () => {
    proverbImageInputRef.current?.click();
  };

  const handleProverbImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadImage(file);
    if (result.url) {
      setCompletionImage(result.url);
    } else if (result.error) {
      alert(result.error);
    }
    if (proverbImageInputRef.current) {
      proverbImageInputRef.current.value = '';
    }
  };

  const handlePublish = async (type: 'public' | 'private') => {
    if (!missionTitle.trim()) {
      setError('请输入任务名称');
      return;
    }
    // 普通任务需要任务简介，奇遇任务使用第一个节点作为简介
    if (taskType !== 'serendipity' && !description.trim()) {
      setError('请输入任务简介');
      return;
    }
    if (targetCities.length === 0) {
      setError('请选择任务覆盖城市');
      return;
    }
    if (nodes.some(n => !n.description.trim())) {
      setError('请完善所有节点的描述');
      return;
    }

    // 🆕 必填校验：封面图
    if (!images[0]?.src) {
      setError('请上传任务封面图');
      return;
    }

    // 🆕 奇遇任务验证
    if (taskType === 'serendipity') {
      if (!serendipitySuccessMessage.trim()) {
        setError('请输入奇遇赠言');
        return;
      }
      // 封面图校验已提升至全局
      // 奇遇任务不允许私密发布
      // 奇遇任务不允许私密发布
      if (type === 'private') {
        setError('奇遇任务只能公开发布');
        return;
      }
    }

    // 🆕 Event Task Validation
    if (isEventTask) {
      if (!eventStartDate || !eventEndDate) {
        setError('活动任务必须设置开始和结束时间');
        return;
      }
      if (new Date(eventStartDate) >= new Date(eventEndDate)) {
        setError('活动结束时间必须晚于开始时间');
        return;
      }
    }

    // 问答验证
    if (qaEnabled && (!qaQuestion.trim() || !qaAnswers.trim())) {
      setError('开启问答挑战需填写问题和答案');
      return;
    }

    setLoading(true);
    setError(null);

    const checklistEntries = Object.entries(prepChecklist) as Array<[
      keyof typeof prepChecklist,
      { enabled: boolean; info: string }
    ]>;
    const checklistItems = checklistEntries
      .filter(([, value]) => value.enabled)
      .map(([key, value]) => ({
        type: key,
        title: getChecklistTitle(String(key)), // Helper wrapper if needed, or inline logic
        defaultNote: value.info || '未填写'
      }));

    try {
      const taskData = {
        title: missionTitle,
        // 奇遇任务使用第一个节点的描述作为任务简介
        description: taskType === 'serendipity' ? (nodes[0]?.description || '') : description,
        taskType,  // 🆕 任务类型
        remixedFrom: remixSourceId, // 🆕 如果是魔改，记录原任务ID
        coverImageUrl: images[0]?.src || '',
        difficulty: 1,
        targetCities,
        location: {
          name: targetCities.join(', '), // Fallback
          coordinates: { latitude: 0, longitude: 0 }
        },
        completionMessage: completionMessage.trim() || undefined,
        completionImageUrl: completionImage || undefined,
        nodes: nodes.map(n => ({
          description: n.description,
          isLocationSpecific: n.useLocation,
          location: n.useLocation && n.locationName ? {
            name: n.locationName
          } : undefined,
          referenceImageUrl: n.imageUrl || undefined,
          timeLimit: n.useTimeLimit ? {
            type: n.timeLimitType || 'countdown',
            countdownMinutes: (n.timeLimitType === 'countdown' || !n.timeLimitType) ? (n.countdownMinutes || 30) : undefined,
            timeRangeStart: n.timeLimitType === 'timeRange' ? n.timeRangeStart : undefined,
            timeRangeEnd: n.timeLimitType === 'timeRange' ? n.timeRangeEnd : undefined,
            timeRangeDate: n.timeLimitType === 'timeRange' && n.timeRangeDate ? n.timeRangeDate : undefined,
            deadlineTime: n.timeLimitType === 'deadline' ? n.deadlineTime : undefined,
            deadlineType: n.timeLimitType === 'deadline' ? n.deadlineType : undefined,
            deadlineDate: n.timeLimitType === 'deadline' && n.deadlineDate ? n.deadlineDate : undefined
          } : undefined,
          // 🆕 节点级问答
          qaModule: n.useQA ? {
            enabled: true,
            question: n.qaQuestion?.trim() || '',
            correctAnswers: n.qaAnswers?.split(',').map(a => a.trim()).filter(a => a) || [],
            maxAttempts: n.qaMaxAttempts || 3
          } : undefined
        })),
        isAI: false,
        prepListConfig: taskType === 'normal' && checklistItems.length > 0 ? checklistItems : undefined,
        // 🆕 奇遇任务配置
        serendipityConfig: taskType === 'serendipity' ? {
          expiryDays,
          successMessage: serendipitySuccessMessage.trim(),
          successImageUrl: serendipityCompletionImage || undefined
        } : undefined,
        // 注意：问答模块已移至节点级别 (nodes[].qaModule)
        isPrivate: type === 'private', // 🆕 传递私密标识
        timeConfig: (hasTimeChallenge || isEventTask) ? {
          hasTimeChallenge,
          taskTimeLimit: hasTimeChallenge && taskTimeLimitType !== 'none' ? {
            type: taskTimeLimitType,
            countdownMinutes: taskTimeLimitType === 'countdown' ? countdownMinutes : undefined,
            timeRangeStart: taskTimeLimitType === 'timeRange' ? timeRangeStart : undefined,
            timeRangeEnd: taskTimeLimitType === 'timeRange' ? timeRangeEnd : undefined,
            timeRangeDate: taskTimeLimitType === 'timeRange' && timeRangeDateEnabled && taskTimeRangeDate ? taskTimeRangeDate : undefined,
            deadlineTime: taskTimeLimitType === 'deadline' ? deadlineTime : undefined,
            deadlineType: taskTimeLimitType === 'deadline' ? deadlineType : undefined,
            deadlineDate: taskTimeLimitType === 'deadline' && deadlineDateEnabled && taskDeadlineDate ? taskDeadlineDate : undefined
          } : undefined,
          isEventTask,
          eventStartDate: isEventTask && eventStartDate ? new Date(eventStartDate) : undefined,
          eventEndDate: isEventTask && eventEndDate ? new Date(eventEndDate) : undefined,
          maxParticipants: clubId ? maxParticipants : undefined
        } : undefined
      };

      let response;
      if (clubId) {
        // 社团活动使用专用API
        response = await clubApi.createActivity(clubId, taskData);
        console.log('Club activity created:', response.data);
        alert('🎉 社团活动发布成功！\n\n活动正在等待审核，审核通过后社团成员可见。');
        onBack();
      } else {
        // 普通任务
        response = await taskApi.create(taskData);
        console.log('Task created:', response.data);

        // 根据任务状态显示不同的提示
        const taskStatus = response.data.status;
        if (taskStatus === 'private') {
          // 私密发布成功 (魔改私密或普通私密)
          alert('🎉 任务私密发布成功！\n\n该任务仅您自己可见，已添加到【我的任务-收藏】中。');
        } else if (remixSourceId) {
          // 魔改发布成功 (公开)
          alert('🎉 魔改任务发布成功！\n\n您的创意版本已上线，感谢您的贡献！');
        } else if (taskStatus === 'pending') {
          // 普通用户发布，需要审核
          alert('🎉 任务发布成功！\n\n您的任务正在等待审核，审核通过后将在探索页面展示。');
        } else {
          // 管理员发布，直接通过
          alert('🎉 任务发布成功！');
        }

        // 成功后跳转
        if (taskType === 'serendipity') {
          // 奇遇任务发布后直接返回探索页
          onBack();
        } else if (onSuccess && response.data) {
          // 普通任务发布后跳转到详情页
          onSuccess(response.data._id || response.data.id);
        } else {
          onBack();
        }
      }
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setError(err.response?.data?.error || '发布失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const addNode = () => {
    if (nodes.length >= 20) {
      alert('普通任务最多添加 20 个节点');
      return;
    }
    setNodes([...nodes, {
      id: Date.now(),
      description: '',
      useLocation: false,
      useImage: false,
      useTimeLimit: false,
      useQA: false
    }]);
  };

  const removeNode = (id: number) => {
    if (nodes.length > 1) {
      setNodes(nodes.filter(n => n.id !== id));
    }
  };

  const updateNode = (id: number, field: keyof TaskNode, value: any) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleNodeLocation = (id: number) => {
    const node = nodes.find(n => n.id === id);
    setLocationInput(node?.locationName || '');
    setLocationModalNodeId(id);
    setLocationModalVisible(true);
  };

  const handleLocationSubmit = () => {
    if (locationModalNodeId !== null && locationInput.trim()) {
      updateNode(locationModalNodeId, 'locationName', locationInput.trim());
    }
    setLocationModalVisible(false);
    setLocationModalNodeId(null);
    setLocationInput('');
  };

  // 节点参考图上传
  const nodeImageInputRef = useRef<HTMLInputElement>(null);
  const [pendingNodeId, setPendingNodeId] = useState<number | null>(null);

  const handleNodeImage = (id: number) => {
    setPendingNodeId(id);
    nodeImageInputRef.current?.click();
  };

  const handleNodeImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || pendingNodeId === null) return;
    const result = await uploadImage(file);
    if (result.url) {
      updateNode(pendingNodeId, 'imageUrl', result.url);
    } else if (result.error) {
      alert(result.error);
    }
    setPendingNodeId(null);
    if (nodeImageInputRef.current) {
      nodeImageInputRef.current.value = '';
    }
  };

  const handleCoverUploadSuccess = (urls: string[]) => {
    // Sync to existing images state structure
    const newImages = urls.map((url, index) => ({
      id: Date.now() + index,
      src: url,
      alt: 'Cover'
    }));
    setImages(newImages);
  };

  const handleInvite = () => {
    alert('跳转至好友页面或分享给微信好友');
  }

  const handleTaskTypeChange = (type: 'normal' | 'serendipity') => {
    setTaskType(type);
    if (type === 'serendipity' && nodes.length > 1) {
      // 保留第一个节点，移除其他
      setNodes([nodes[0]]);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#f8f7f5] dark:bg-[#221910] font-display text-slate-900 dark:text-white min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 dark:text-slate-400">正在发布任务...</span>
        </div>
      </div>
    );
  }

  // 🎨 主色调配置
  const isRemix = !!remixSourceId;
  const primaryColor = isRemix ? 'bg-purple-400' : 'bg-[#16a34a]';
  const primaryText = isRemix ? 'text-purple-400' : 'text-[#16a34a]';
  const primaryBorder = isRemix ? 'border-purple-400' : 'border-[#16a34a]';
  const focusBorder = isRemix ? 'focus:border-purple-400' : 'focus:border-[#16a34a]';
  const focusRing = isRemix ? 'focus:ring-purple-400' : 'focus:ring-[#16a34a]';
  const bgLight = isRemix ? 'bg-purple-50' : 'bg-[#16a34a]/10';
  const bgLightHover = isRemix ? 'hover:bg-purple-100/50' : 'hover:bg-[#16a34a]/5';
  const iconColor = isRemix ? 'text-purple-400' : 'text-[#16a34a]';

  return (
    <div className="relative flex h-full w-full flex-col min-h-screen overflow-x-hidden bg-[#f8f7f5] dark:bg-[#221910] pb-32 font-display transition-colors duration-200">
      {/* 隐藏的文件上传 input */}
      <input ref={proverbImageInputRef} type="file" accept="image/*" onChange={handleProverbImageChange} className="hidden" />
      <input ref={nodeImageInputRef} type="file" accept="image/*" onChange={handleNodeImageChange} className="hidden" />

      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#2d241c] px-4 py-3 justify-between shadow-sm transition-colors duration-200">
        <button
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#111618] dark:text-white text-[24px]">arrow_back_ios_new</span>
        </button>
        <h2 className="text-[#111618] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          {isRemix ? '魔改路线' : '发布新任务'}
        </h2>
      </div>

      {/* Title Area */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-[#111618] dark:text-white text-3xl font-extrabold leading-tight tracking-tight mb-2">
          {isRemix ? '自定义你的路线' : (taskType === 'serendipity' ? '创建奇遇任务' : '创建探险任务')}
        </h1>
        <p className="text-[#64748b] dark:text-gray-400 text-base font-normal leading-relaxed">
          {isRemix
            ? '基于原路线进行修改，创建属于你的专属探险。'
            : (taskType === 'serendipity'
              ? '创建一个神秘的奇遇任务，等待探险者触发发现。'
              : '创建一个多节点的探险路线以发布')}
        </p>

        {/* 🆕 任务类型切换 Tab (魔改模式和社团活动模式下隐藏) */}
        {!isRemix && !clubId && (
          <div className="flex gap-2 mt-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => handleTaskTypeChange('normal')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${taskType === 'normal'
                ? 'bg-white dark:bg-[#2d241c] text-[#16a34a] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">hiking</span>
              探险任务
            </button>
            <button
              onClick={() => handleTaskTypeChange('serendipity')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${taskType === 'serendipity'
                ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">auto_awesome</span>
              奇遇任务
            </button>
          </div>
        )}

        {/* 魔改模式下的提示条 */}
        {isRemix && (
          <div className="mt-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100/50 dark:bg-purple-900/30 flex items-center justify-center text-purple-400 dark:text-purple-400">
              <span className="material-symbols-outlined text-sm">fork_right</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-purple-500 dark:text-purple-300">魔改模式已开启</p>
              <p className="text-[10px] text-purple-400/80 dark:text-purple-400/60 leading-tight">您可以自由调整所有设置，发布后将会标注原作者。</p>
            </div>
          </div>
        )}

        {/* 社团活动模式下的提示条 */}
        {clubId && (
          <div className="mt-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/20 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-100/50 dark:bg-sky-900/30 flex items-center justify-center text-sky-400 dark:text-sky-400">
              <span className="material-symbols-outlined text-sm">groups</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-sky-500 dark:text-sky-300">社团活动模式</p>
              <p className="text-[10px] text-sky-400/80 dark:text-sky-400/60 leading-tight">活动发布后需要审核，审核通过后社团成员可见。</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 px-5 mt-4">

        {error && (
          <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm">{error}</div>
        )}

        {/* Task Name */}
        <div className="flex flex-col gap-2">
          <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">任务名称</label>
          <input
            value={missionTitle}
            onChange={(e) => setMissionTitle(e.target.value)}
            className={`w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-4 py-4 text-base font-medium text-[#111618] dark:text-white placeholder:text-gray-400 ${focusBorder} focus:ring-1 ${focusRing} outline-none transition-all shadow-sm`}
            placeholder="给你的探险起个响亮的名字..."
            type="text"
            maxLength={20}
          />
          <div className="text-right text-xs text-gray-400 mt-1">{missionTitle.length}/20</div>
        </div>

        {/* Description - 仅普通任务显示，奇遇任务使用第一个节点作为简介 */}
        {taskType !== 'serendipity' && (
          <div className="flex flex-col gap-2">
            <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">任务简介</label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                className={`w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-4 py-4 text-base font-medium text-[#111618] dark:text-white placeholder:text-gray-400 ${focusBorder} focus:ring-1 ${focusRing} outline-none transition-all shadow-sm min-h-[100px]`}
                placeholder="简单介绍一下这个任务的主题..."
              ></textarea>
              <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1">
                <span className="material-symbols-outlined text-gray-400 text-xs">edit</span>
                <span className="text-xs font-medium text-gray-400">{description.length}/300</span>
              </div>
            </div>
          </div>
        )}

        {/* City Selection (Replaces Location) */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            目标城市 <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => setShowCitySelector(true)}
            className={`w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:${primaryBorder} transition-colors relative`}
          >
            {targetCities.length === 0 ? (
              <div className="flex items-center text-gray-400">
                <span className="material-symbols-outlined mr-2">location_city</span>
                <span>点击选择任务覆盖的城市 (最多8个)</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {targetCities.map(city => (
                  <span key={city} className={`flex items-center gap-1 px-2 py-1 ${bgLight} ${primaryText} text-xs font-bold rounded`}>
                    {city}
                  </span>
                ))}
              </div>
            )}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              <span className="material-symbols-outlined">chevron_right</span>
            </div>
          </div>
        </div>

        {/* Task Nodes Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">
              {taskType === 'serendipity' ? '奇遇内容' : `任务节点 (${nodes.length})`}
            </label>
          </div>

          <div className="flex flex-col gap-4">
            {nodes.map((node, index) => (
              <div key={node.id} className="relative flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                {taskType !== 'serendipity' && (
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bgLight} ${iconColor} text-xs font-bold ring-2 ring-white dark:ring-[#2d241c]`}>
                        {index + 1}
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">节点 {index + 1}</span>
                    </div>
                    {nodes.length > 1 && (
                      <button
                        onClick={() => removeNode(node.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
                  </div>
                )}

                <textarea
                  value={node.description}
                  onChange={(e) => updateNode(node.id, 'description', e.target.value)}
                  placeholder={taskType === 'serendipity' ? "输入奇遇任务内容（如：找到隐藏在街角的神秘咖啡馆）..." : "输入节点任务说明（如：找到红色的邮箱并拍照）..."}
                  className={`w-full resize-none rounded-lg bg-gray-50 dark:bg-[#221910] border-transparent focus:bg-white dark:focus:bg-[#2d241c] ${focusBorder} focus:ring-1 ${focusRing} px-3 py-3 text-sm text-[#111618] dark:text-white placeholder:text-gray-400 transition-all outline-none border`}
                  rows={3}
                  maxLength={200}
                />
                <div className="text-right text-xs text-gray-400 mt-1">{node.description.length}/200</div>

                <div className="flex flex-wrap gap-2 mt-1">
                  {/* Location Toggle */}
                  <button
                    onClick={() => updateNode(node.id, 'useLocation', !node.useLocation)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${node.useLocation
                      ? `${bgLight} ${primaryBorder} ${primaryText}`
                      : 'bg-gray-50 dark:bg-[#323b42] border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d464e]'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${node.useLocation ? 'fill-current' : ''}`}>location_on</span>
                    {node.useLocation ? '已启用地点' : '指定任务地点'}
                  </button>

                  {/* Time Limit Toggle */}
                  <button
                    onClick={() => {
                      if (!node.useTimeLimit) {
                        // 启用时设置默认值
                        setNodes(nodes.map(n => n.id === node.id ? {
                          ...n,
                          useTimeLimit: true,
                          timeLimitType: 'countdown',
                          countdownMinutes: 30
                        } : n));
                      } else {
                        updateNode(node.id, 'useTimeLimit', false);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${node.useTimeLimit
                      ? `${bgLight} ${primaryBorder} ${primaryText}`
                      : 'bg-gray-50 dark:bg-[#323b42] border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d464e]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">timer</span>
                    {node.useTimeLimit ? '已启用限时' : '设置节点限时'}
                  </button>

                  {/* Image Toggle */}
                  <button
                    onClick={() => updateNode(node.id, 'useImage', !node.useImage)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${node.useImage
                      ? `${bgLight} ${primaryBorder} ${primaryText}`
                      : 'bg-gray-50 dark:bg-[#323b42] border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d464e]'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${node.useImage ? 'fill-current' : ''}`}>image</span>
                    {node.useImage ? '已启用图片' : '插入任务参考图'}
                  </button>

                  {/* 🆕 QA Toggle */}
                  <button
                    onClick={() => updateNode(node.id, 'useQA', !node.useQA)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${node.useQA
                      ? 'bg-purple-500/10 border-purple-500 text-purple-500' // QA模块本身就是紫色系，保持原样或特殊处理
                      : 'bg-gray-50 dark:bg-[#323b42] border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d464e]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">quiz</span>
                    {node.useQA ? '已启用问答' : '添加问答挑战'}
                  </button>
                </div>

                {/* 🆕 Node QA Config */}
                {node.useQA && (
                  <div className="mt-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-purple-500 text-[18px]">quiz</span>
                        <span className="text-sm font-bold text-purple-700 dark:text-purple-400">问答挑战配置</span>
                      </div>
                      <input
                        value={node.qaQuestion || ''}
                        onChange={(e) => updateNode(node.id, 'qaQuestion', e.target.value)}
                        placeholder="输入问题，如：这个地方的创始人是谁？"
                        maxLength={50}
                        className="w-full rounded-lg border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-[#2d241c] px-3 py-2 text-sm outline-none focus:border-purple-500"
                      />
                      <input
                        value={node.qaAnswers || ''}
                        onChange={(e) => updateNode(node.id, 'qaAnswers', e.target.value)}
                        placeholder="正确答案，多个用逗号分隔"
                        maxLength={50}
                        className="w-full rounded-lg border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-[#2d241c] px-3 py-2 text-sm outline-none focus:border-purple-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">尝试次数：</span>
                        <select
                          value={node.qaMaxAttempts || 3}
                          onChange={(e) => updateNode(node.id, 'qaMaxAttempts', Number(e.target.value))}
                          className="rounded-lg border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-[#2d241c] px-2 py-1 text-sm outline-none"
                        >
                          <option value={1}>1次</option>
                          <option value={3}>3次</option>
                          <option value={5}>5次</option>
                        </select>
                        <span className="text-xs text-gray-400">普通任务答错可继续但不算成功</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Node Time Limit Config */}
                {node.useTimeLimit && (
                  <div className="mt-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600 dark:text-orange-400">
                          <span className="material-symbols-outlined text-[20px]">timer</span>
                        </span>
                        <select
                          value={node.timeLimitType || 'countdown'}
                          onChange={(e) => {
                            const newType = e.target.value;
                            // 更新类型并设置对应的默认值
                            const updates: Partial<TaskNode> = { timeLimitType: newType as any };
                            if (newType === 'timeRange') {
                              updates.timeRangeStart = node.timeRangeStart || '09:00';
                              updates.timeRangeEnd = node.timeRangeEnd || '18:00';
                            } else if (newType === 'deadline') {
                              updates.deadlineTime = node.deadlineTime || '12:00';
                              updates.deadlineType = node.deadlineType || 'before';
                            } else if (newType === 'countdown') {
                              updates.countdownMinutes = node.countdownMinutes || 30;
                            }
                            // 更新节点
                            setNodes(nodes.map(n => n.id === node.id ? { ...n, ...updates } : n));
                          }}
                          className="bg-white dark:bg-[#323b42] border border-orange-200 dark:border-orange-900/40 rounded-lg px-3 py-2 text-sm outline-none text-left min-w-[160px] text-gray-800 dark:text-white"
                        >
                          <option value="countdown">倒计时限制</option>
                          <option value="timeRange">特定时间段</option>
                          <option value="deadline">截止时间点</option>
                        </select>
                      </div>

                      {/* Dynamic Inputs based on type */}
                      <div className="pl-7">
                        {(!node.timeLimitType || node.timeLimitType === 'countdown') && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">限时</span>
                            <div className="relative w-36">
                              <input
                                type="number"
                                value={node.countdownMinutes ?? ''}
                                placeholder="30"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateNode(node.id, 'countdownMinutes', val === '' ? undefined : parseInt(val));
                                }}
                                onBlur={(e) => {
                                  // 失去焦点时，如果为空则设置默认值
                                  if (!e.target.value) {
                                    updateNode(node.id, 'countdownMinutes', 30);
                                  }
                                }}
                                className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-[#323b42] border border-orange-200 dark:border-orange-900/40 rounded-lg text-sm outline-none focus:border-orange-500 text-gray-800 dark:text-white"
                              />
                              <span className="absolute right-3 top-1.5 text-xs text-gray-400">分</span>
                            </div>
                            <span className="text-xs text-orange-500/80">上一个任务结束后需在限制时间内完成</span>
                          </div>
                        )}

                        {node.timeLimitType === 'timeRange' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="time"
                                value={node.timeRangeStart || '09:00'}
                                onChange={(e) => updateNode(node.id, 'timeRangeStart', e.target.value)}
                                className="px-2 py-1.5 bg-white dark:bg-[#323b42] border border-orange-200 dark:border-orange-900/40 rounded-lg text-sm w-[120px] text-center text-gray-800 dark:text-white"
                              />
                              <span className="text-gray-400">-</span>
                              <input
                                type="time"
                                value={node.timeRangeEnd || '18:00'}
                                onChange={(e) => updateNode(node.id, 'timeRangeEnd', e.target.value)}
                                className="px-2 py-1.5 bg-white dark:bg-[#323b42] border border-orange-200 dark:border-orange-900/40 rounded-lg text-sm w-[120px] text-center text-gray-800 dark:text-white"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!node.timeRangeDate}
                                  onChange={(e) => updateNode(node.id, 'timeRangeDate', e.target.checked ? new Date().toISOString().split('T')[0] : undefined)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-orange-500"
                                />
                                指定日期
                              </label>
                              {node.timeRangeDate && (
                                <input
                                  type="date"
                                  value={node.timeRangeDate}
                                  onChange={(e) => updateNode(node.id, 'timeRangeDate', e.target.value)}
                                  className="px-2 py-1 bg-white dark:bg-[#323b42] border border-orange-200 dark:border-orange-900/40 rounded-lg text-xs"
                                />
                              )}
                            </div>
                            <span className="text-xs text-orange-500/80">
                              {node.timeRangeDate ? '仅在该日期此时段内可打卡' : '每天此时段内可打卡'}
                            </span>
                          </div>
                        )}

                        {node.timeLimitType === 'deadline' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={node.deadlineType || 'before'}
                                onChange={(e) => updateNode(node.id, 'deadlineType', e.target.value)}
                                className="bg-white dark:bg-[#323b42] border border-orange-200 dark:border-orange-900/40 rounded-lg px-2 py-1.5 text-sm outline-none text-left min-w-[100px] text-gray-800 dark:text-white"
                              >
                                <option value="before">在此之前</option>
                                <option value="after">在此之后</option>
                              </select>
                              <input
                                type="time"
                                value={node.deadlineTime || '12:00'}
                                onChange={(e) => updateNode(node.id, 'deadlineTime', e.target.value)}
                                className="px-2 py-1.5 bg-white dark:bg-[#323b42] border border-orange-200 dark:border-orange-900/40 rounded-lg text-sm w-[120px] text-center text-gray-800 dark:text-white"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!node.deadlineDate}
                                  onChange={(e) => updateNode(node.id, 'deadlineDate', e.target.checked ? new Date().toISOString().split('T')[0] : undefined)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-orange-500"
                                />
                                指定日期
                              </label>
                              {node.deadlineDate && (
                                <input
                                  type="date"
                                  value={node.deadlineDate}
                                  onChange={(e) => updateNode(node.id, 'deadlineDate', e.target.value)}
                                  className="px-2 py-1 bg-white dark:bg-[#323b42] border border-orange-200 dark:border-orange-900/40 rounded-lg text-xs text-gray-800 dark:text-white"
                                />
                              )}
                            </div>
                            <span className="text-xs text-orange-500/80">
                              {node.deadlineDate ? `必须在 ${node.deadlineDate} ${node.deadlineTime} ${node.deadlineType === 'before' ? '前完成' : '后开始'}` : `每天 ${node.deadlineTime} ${node.deadlineType === 'before' ? '前完成' : '后开始'}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dependent fields */}
                {node.useLocation && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${bgLight} border ${primaryBorder} mt-1 cursor-pointer ${bgLightHover} transition-colors`} onClick={() => handleNodeLocation(node.id)}>
                    <span className={`material-symbols-outlined ${primaryText} text-[20px]`}>add_location_alt</span>
                    <span className={`text-sm font-medium ${primaryText} truncate flex-1 leading-none`}>
                      {node.locationName || "点击选择地图位置..."}
                    </span>
                  </div>
                )}

                {node.useImage && (
                  <div className="mt-1">
                    {node.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                        <CapacitorImage src={getImageUrl(node.imageUrl)} className="w-full h-full object-cover" alt="Node" />
                        <button
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors backdrop-blur-sm"
                          onClick={(e) => { e.stopPropagation(); updateNode(node.id, 'imageUrl', undefined); }}
                          title="删除图片"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`w-full aspect-[3/1] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 hover:${primaryText} hover:${primaryBorder} ${bgLightHover} transition-all cursor-pointer`}
                        onClick={() => handleNodeImage(node.id)}
                      >
                        <span className="material-symbols-outlined text-[28px]">add_photo_alternate</span>
                        <span className="text-xs font-medium">点击上传图片</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {taskType !== 'serendipity' && (
              <button
                onClick={addNode}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:${primaryBorder} hover:${primaryText} ${bgLightHover} transition-all w-full active:scale-[0.99]`}
              >
                <span className="material-symbols-outlined">add_circle</span>
                <span className="text-base font-bold">添加新节点</span>
              </button>
            )}
          </div>
        </div>

        {/* Prep Checklist - 仅普通任务显示 */}
        {taskType !== 'serendipity' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">备战清单</label>
              <span className="text-xs text-gray-400">不勾选则默认生成必要准备</span>
            </div>

            <div className="bg-white dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-4">
              {[
                { key: 'ticket', label: '门票', placeholder: '填写门票名称/预约信息' },
                { key: 'transport', label: '车票', placeholder: '填写车次/航班/车票信息' },
                { key: 'lodging', label: '住宿', placeholder: '填写酒店名称/入住信息' },
                { key: 'documents', label: '证件', placeholder: '填写证件清单或补充说明' },
                { key: 'other', label: '其他', placeholder: '填写其他准备内容' }
              ].map((item) => (
                <div key={item.key} className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={prepChecklist[item.key as keyof typeof prepChecklist].enabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setPrepChecklist((prev) => ({
                          ...prev,
                          [item.key]: { ...prev[item.key as keyof typeof prev], enabled }
                        }));
                      }}
                      className={`h-4 w-4 rounded border-gray-300 ${primaryText} ${focusRing}`}
                    />
                    {item.label}
                  </label>
                  <input
                    value={prepChecklist[item.key as keyof typeof prepChecklist].info}
                    onChange={(e) => {
                      const info = e.target.value;
                      setPrepChecklist((prev) => ({
                        ...prev,
                        [item.key]: { ...prev[item.key as keyof typeof prev], info }
                      }));
                    }}
                    disabled={!prepChecklist[item.key as keyof typeof prepChecklist].enabled}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-3 py-2 text-sm text-[#111618] dark:text-white outline-none disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                    placeholder={item.placeholder}
                  />
                </div>
              ))}
            </div>

            <div className={`${bgLight} border ${primaryBorder}/20 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300`}>
              若未勾选任何项，系统将自动生成交通方式、住宿、门票预约等必要准备项。
            </div>
          </div>
        )}

        {/* 问答模块已移至节点级别 (每个节点可单独设置问答) */}

        {/* 🆕 奇遇任务专属设置 */}
        {taskType === 'serendipity' && (
          <div className="flex flex-col gap-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-orange-500">auto_awesome</span>
              <span className="text-base font-bold text-orange-700 dark:text-orange-400">奇遇专属设置</span>
            </div>

            {/* 奇遇赠言（必填） */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                奇遇赠言 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={serendipitySuccessMessage}
                onChange={(e) => setSerendipitySuccessMessage(e.target.value)}
                maxLength={100}
                placeholder="完成奇遇后显示给探险者的神秘祝福语..."
                className="w-full resize-none rounded-lg border border-orange-200 dark:border-orange-900/40 bg-white dark:bg-[#2d241c] px-3 py-3 text-sm outline-none focus:border-orange-500 min-h-[60px]"
              />
            </div>

            {/* 赠言图片（可选） */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                赠言图片 <span className="text-xs text-gray-400 font-normal">(可选，用于明信片背景)</span>
              </label>
              <div className="flex gap-2">
                {serendipityCompletionImage ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden group">
                    <CapacitorImage
                      src={getImageUrl(serendipityCompletionImage)}
                      alt="赠言图片"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setSerendipityCompletionImage(null)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-white text-xl">delete</span>
                    </button>
                  </div>
                ) : (
                  <ImageUploader
                    onUploadSuccess={(urls) => urls.length > 0 && setSerendipityCompletionImage(urls[urls.length - 1])}
                    className="w-20 h-20"
                  >
                    <div className="w-20 h-20 rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-dashed border-orange-200 dark:border-orange-900/40 flex flex-col items-center justify-center text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                    </div>
                  </ImageUploader>
                )}
              </div>
              <p className="text-xs text-gray-500">未上传时将使用封面图作为明信片背景</p>
            </div>

            {/* 有效期 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">有效期（天）</label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full rounded-lg border border-orange-200 dark:border-orange-900/40 bg-white dark:bg-[#2d241c] px-3 py-2 text-sm outline-none focus:border-orange-500"
              >
                <option value={1}>1天（限时奇遇）</option>
                <option value={3}>3天（推荐）</option>
                <option value={7}>7天</option>
                <option value={14}>14天</option>
              </select>
              <p className="text-xs text-gray-500">探险者触发奇遇后需在此时间内完成</p>
            </div>
          </div>
        )}

        {/* 时间配置 - 仅普通任务显示 */}
        {taskType !== 'serendipity' && (
          <div className="flex flex-col gap-4">
            <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">
              时间设置 <span className="text-xs text-gray-400 font-normal">(可选)</span>
            </label>

            {/* 时间挑战开关 */}
            <div className="bg-white dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500">
                    <span className="material-symbols-outlined text-[20px]">timer</span>
                  </div>
                  <div>
                    <span className="text-[#111618] dark:text-white text-sm font-bold">时间挑战</span>
                    <p className="text-xs text-gray-400">设置任务的时间限制</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hasTimeChallenge}
                  onChange={(e) => setHasTimeChallenge(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
              </label>

              {hasTimeChallenge && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">限时类型</label>
                    <select
                      value={taskTimeLimitType}
                      onChange={(e) => setTaskTimeLimitType(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-orange-500"
                    >
                      <option value="none">无限制</option>
                      <option value="countdown">倒计时</option>
                      <option value="timeRange">时间段</option>
                      <option value="deadline">时间点</option>
                    </select>
                  </div>

                  {taskTimeLimitType === 'countdown' && (
                    <div className="flex flex-col gap-2 animate-in fade-in">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-300">完成时限（分钟）</label>
                      <input
                        type="number"
                        value={countdownMinutes}
                        onChange={(e) => setCountdownMinutes(Number(e.target.value))}
                        min={1}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-orange-500"
                      />
                    </div>
                  )}

                  {taskTimeLimitType === 'timeRange' && (
                    <div className="flex flex-col gap-3 animate-in fade-in">
                      <div className="flex gap-3">
                        <div className="flex-1 flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">开始时间</label>
                          <input
                            type="time"
                            value={timeRangeStart}
                            onChange={(e) => setTimeRangeStart(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">结束时间</label>
                          <input
                            type="time"
                            value={timeRangeEnd}
                            onChange={(e) => setTimeRangeEnd(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={timeRangeDateEnabled}
                            onChange={(e) => {
                              setTimeRangeDateEnabled(e.target.checked);
                              if (e.target.checked && !taskTimeRangeDate) {
                                setTaskTimeRangeDate(new Date().toISOString().split('T')[0]);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-orange-500"
                          />
                          指定日期
                        </label>
                        {timeRangeDateEnabled && (
                          <input
                            type="date"
                            value={taskTimeRangeDate}
                            onChange={(e) => setTaskTimeRangeDate(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-orange-500"
                          />
                        )}
                      </div>
                      <p className="text-xs text-orange-500/80">
                        {timeRangeDateEnabled && taskTimeRangeDate ? `仅在 ${taskTimeRangeDate} ${timeRangeStart}-${timeRangeEnd} 可执行` : `每天 ${timeRangeStart}-${timeRangeEnd} 可执行`}
                      </p>
                    </div>
                  )}

                  {taskTimeLimitType === 'deadline' && (
                    <div className="flex flex-col gap-3 animate-in fade-in">
                      <div className="flex gap-3">
                        <div className="flex-1 flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">时间点</label>
                          <input
                            type="time"
                            value={deadlineTime}
                            onChange={(e) => setDeadlineTime(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">要求</label>
                          <select
                            value={deadlineType}
                            onChange={(e) => setDeadlineType(e.target.value as 'before' | 'after')}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-orange-500"
                          >
                            <option value="before">之前完成</option>
                            <option value="after">之后开始</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deadlineDateEnabled}
                            onChange={(e) => {
                              setDeadlineDateEnabled(e.target.checked);
                              if (e.target.checked && !taskDeadlineDate) {
                                setTaskDeadlineDate(new Date().toISOString().split('T')[0]);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-orange-500"
                          />
                          指定日期
                        </label>
                        {deadlineDateEnabled && (
                          <input
                            type="date"
                            value={taskDeadlineDate}
                            onChange={(e) => setTaskDeadlineDate(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-orange-500"
                          />
                        )}
                      </div>
                      <p className="text-xs text-orange-500/80">
                        {deadlineDateEnabled && taskDeadlineDate ? `必须在 ${taskDeadlineDate} ${deadlineTime} ${deadlineType === 'before' ? '前完成' : '后开始'}` : `每天 ${deadlineTime} ${deadlineType === 'before' ? '前完成' : '后开始'}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 活动任务开关 */}
            <div className="bg-white dark:bg-[#2d241c] border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-500">
                    <span className="material-symbols-outlined text-[20px]">event</span>
                  </div>
                  <div>
                    <span className="text-[#111618] dark:text-white text-sm font-bold">
                      {clubId ? '社团活动' : '活动任务'}
                    </span>
                    <p className="text-xs text-gray-400">
                      {clubId ? '社团活动需要审核后才能被成员看到' : '设置任务的有效期'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isEventTask}
                  onChange={(e) => !clubId && setIsEventTask(e.target.checked)}
                  disabled={!!clubId}
                  className="h-5 w-5 rounded border-gray-300 text-violet-500 focus:ring-violet-500 disabled:opacity-50"
                />
              </label>

              {/* 🆕 Event Task Config */}
              {isEventTask && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-300">开始时间 <span className="text-xs text-red-500">*</span></label>
                      <input
                        type="datetime-local"
                        value={eventStartDate}
                        onChange={(e) => setEventStartDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-300">结束时间 <span className="text-xs text-red-500">*</span></label>
                      <input
                        type="datetime-local"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  {/* 社团活动人数上限 */}
                  {clubId && (
                    <div className="mt-3 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-300">人数上限</label>
                      <input
                        type="number"
                        min={2}
                        max={18}
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(Math.max(2, Math.min(18, parseInt(e.target.value) || 18)))}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#221910] px-3 py-2 text-sm outline-none focus:border-violet-500"
                      />
                      <p className="text-xs text-gray-400">活动最多可报名人数（2-18人）</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        )}


        {/* Cover Image Upload (Replaces old trigger logic) */}
        <div className="flex flex-col gap-2">
          <h3 className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">任务封面</h3>
          <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <ImageUploader
              maxCount={1}
              defaultImages={images.map(i => i.src)}
              onUploadSuccess={handleCoverUploadSuccess}
            />
          </div>
        </div>

        {/* Completion Message (Proverb) - 仅普通任务显示 */}
        {taskType !== 'serendipity' && (
          <div className="flex flex-col gap-2">
            <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">
              任务赠言 (可选/完成可见)
            </label>
            <div className="flex gap-3">
              {/* Message Input */}
              <div className="relative flex-1">
                <textarea
                  value={completionMessage}
                  onChange={(e) => setCompletionMessage(e.target.value)}
                  maxLength={100}
                  className={`w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-4 py-4 text-base font-medium text-[#111618] dark:text-white placeholder:text-gray-400 ${focusBorder} focus:ring-1 ${focusRing} outline-none transition-all shadow-sm min-h-[80px]`}
                  placeholder="写给完成挑战者的一句话，只有完成任务后才能看到..."
                ></textarea>
                <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1">
                  <span className="text-xs font-medium text-gray-400">{completionMessage.length}/100</span>
                </div>
              </div>

              {/* Image Upload for Proverb */}
              <div className="shrink-0">
                {completionImage ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden group border border-gray-200 dark:border-gray-700">
                    <CapacitorImage src={getImageUrl(completionImage)} className="w-full h-full object-cover" alt="Proverb" />
                    <button
                      onClick={() => setCompletionImage(null)}
                      className="absolute top-0 right-0 p-1 bg-black/50 text-white rounded-bl-lg hover:bg-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={triggerProverbImageUpload}
                    className={`w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 hover:${primaryBorder} hover:${primaryText} text-gray-400 dark:text-gray-500 bg-white dark:bg-[#2d241c] transition-all`}
                    title="添加配图"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                    <span className="text-[10px] font-bold">配图</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className={`mt-2 mb-4 rounded-xl bg-gradient-to-br from-${isRemix ? 'purple-600' : '[#16a34a]'}/10 to-transparent p-[1px]`}>
          <div className="flex items-start gap-4 rounded-xl bg-white dark:bg-[#2d241c] p-5 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr ${isRemix ? 'from-purple-600 to-purple-400' : 'from-[#16a34a] to-green-400'} text-white shadow-lg shadow-${isRemix ? 'purple-600' : '[#16a34a]'}/30`}>
              <span className="material-symbols-outlined text-[20px]">diversity_3</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-[#111618] dark:text-white">众包审核机制</h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                为了保证任务质量，您的探险发布后需获得 <span className={`font-bold ${primaryText}`}>20位探险者点赞</span> 即可正式上架并向全城开放。
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center p-4 bg-gradient-to-t from-[#f8f7f5] via-[#f8f7f5] to-transparent dark:from-[#221910] dark:via-[#221910] pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md px-4 flex flex-col gap-3">
          {clubId ? (
            // 社团活动：只有发布按钮，蓝色主题
            <>
              <button
                onClick={() => handlePublish('public')}
                className="w-full rounded-full bg-[#0ea5e9] py-4 text-center text-base font-bold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 active:scale-[0.98] transition-all"
              >
                发布社团活动
              </button>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 px-2 leading-tight">
                社团活动需要审核，审核通过后社团成员可见
              </p>
            </>
          ) : taskType === 'serendipity' ? (
            // 奇遇任务：只有公开发布按钮，橙色主题
            <>
              <button
                onClick={() => handlePublish('public')}
                className="w-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 py-4 text-center text-base font-bold text-white shadow-lg shadow-orange-500/30 hover:from-orange-500 hover:to-amber-600 active:scale-[0.98] transition-all"
              >
                🎲 发布奇遇任务
              </button>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 px-2 leading-tight">
                奇遇任务对所有人隐藏，只有被触发的探险者能看到
              </p>
            </>
          ) : (
            // 普通任务：公开/私密两个按钮
            <>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePublish('private')}
                  className="flex-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 py-4 text-center text-base font-bold text-[#111618] dark:text-white shadow-sm active:scale-[0.98] transition-all hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  私密发布
                </button>
                <button
                  onClick={() => handlePublish('public')}
                  className={`flex-1 rounded-full ${primaryColor} py-4 text-center text-base font-bold text-white shadow-lg shadow-${isRemix ? 'purple-600' : '[#16a34a]'}/30 hover:${isRemix ? 'bg-purple-500' : 'bg-green-500'} active:scale-[0.98] transition-all`}
                >
                  立即发布
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 px-2 leading-tight">
                私密发布不需要审核，但是只能给自己或者邀请的朋友用
              </p>
            </>
          )}
        </div>
      </div>

      {/* Top Gradient Overlay */}
      <div className={`fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-${isRemix ? 'purple-600' : '[#16a34a]'}/5 to-transparent -z-10 pointer-events-none`}></div>

      {/* City Selector Modal */}
      {
        showCitySelector && (
          <CitySelector
            value={targetCities}
            onChange={(cities) => setTargetCities(cities)}
            onClose={() => setShowCitySelector(false)}
            maxSelection={8}
          />
        )
      }

      {/* Location Input Modal */}
      {locationModalVisible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md mx-4 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                📍 指定任务地点
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                输入这个节点需要完成的具体地点
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="例如：上海 · 新天地"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => {
                  setLocationModalVisible(false);
                  setLocationModalNodeId(null);
                  setLocationInput('');
                }}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleLocationSubmit}
                disabled={!locationInput.trim()}
                className="flex-1 px-4 py-3 bg-[#16a34a] text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default CreateTaskScreen;
