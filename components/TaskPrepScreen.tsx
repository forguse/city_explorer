import React, { useState, useMemo, useEffect } from 'react';
import TaskMoreMenu from './TaskMoreMenu';
import { task as taskApi, execution as executionApi, utils as utilApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { compressImage } from '../src/utils/imageCompression';
import { useImageUpload } from '../src/hooks/useImageUpload';

interface ChecklistItem {
  id: number;
  prepItemId?: string;
  configId?: string;
  title: string;
  originalNote?: string; // 发布者的备注/要求
  userNote: string; // 用户的备注
  status: 'completed' | 'editing' | 'pending';
  isExpanded: boolean;
  kind?: 'ticket' | 'transport' | 'lodging' | 'documents' | 'other' | 'custom';
  isFromConfig?: boolean;
  isUserAdded?: boolean;
  isDefault?: boolean;
  formData?: {
    info?: string; // Legacy, used for mapping
    // Common
    attachmentUrl?: string; // 图片
    checked?: boolean; // For simple checks
    // Specifics
    trainNumber?: string;
    flightNumber?: string;
    departureTime?: string;
    arrivalTime?: string;
    hotelName?: string;
    hotelAddress?: string;
    checkInTime?: string;
    checkOutTime?: string;
    ticketCode?: string;
    ticketQRCodeUrl?: string;
    documentType?: string;
    documentContent?: string;
    customFields?: Record<string, string>;
  };
}

interface TaskPrepScreenProps {
  onBack: () => void;
  onConfirm: () => void;
  task?: any;
  taskId?: string | number | null;
  readonly?: boolean;
  autoStart?: boolean;
  hideBanner?: boolean;
}

const TaskPrepScreen: React.FC<TaskPrepScreenProps> = ({ onBack, onConfirm, task: propTask, taskId, readonly = false, autoStart = false, hideBanner = false }) => {
  // ... (keep existing state)

  // ... (skip down to rendering button)


  const [daysLeft, setDaysLeft] = useState(3);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [task, setTask] = useState<any>(propTask);
  const [loading, setLoading] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null); // Track which item is uploading
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null); // 全屏图片预览
  const { upload: uploadImage } = useImageUpload();

  const hasCustomPrepList = Array.isArray(task?.prepListConfig) && task.prepListConfig.length > 0;
  const canBatchSync = !readonly;
  const canAddItem = !readonly;

  const buildChecklist = (sourceTask?: any): ChecklistItem[] => {
    // Priority 1: prepListConfig (From Task Model)
    const configList = sourceTask?.prepListConfig || sourceTask?.prepList;
    if (configList && Array.isArray(configList) && configList.length > 0) {
      return configList.map((item: any, index: number) => ({
        id: index + 1,
        prepItemId: item._id || item.configId || `prep-${index + 1}`,
        configId: item._id?.toString?.() || item.configId,
        title: item.title,
        originalNote: item.defaultNote || '', // Note from author config
        userNote: '',
        status: 'pending',
        isExpanded: false,
        kind: item.type || 'custom', // Config use 'type', Exec use 'kind'
        isFromConfig: true,
        isUserAdded: false,
        formData: { info: '' }
      }));
    }

    // Priority 2: prepChecklist (From MyTasks Mapped)
    if (sourceTask?.prepChecklist && Array.isArray(sourceTask.prepChecklist)) {
      return sourceTask.prepChecklist.map((item: any, index: number) => ({
        id: index + 1,
        prepItemId: item._id || item.id || `prep-${index + 1}`,
        configId: item.configId,
        title: item.title,
        originalNote: item.note || '', // Note from author
        userNote: '',
        status: item.status || 'pending',
        isExpanded: false,
        kind: item.kind || 'custom',
        isFromConfig: Boolean(item.configId),
        isUserAdded: !item.configId,
        formData: { info: '' }
      }));
    }
    // Default fallback
    return [
      { id: 1, prepItemId: 'prep-ticket', title: '门票', originalNote: '预约景点门票', userNote: '', status: 'pending', isExpanded: false, kind: 'ticket', isDefault: true },
      { id: 2, prepItemId: 'prep-transport', title: '车票', originalNote: '提前预定车票', userNote: '', status: 'pending', isExpanded: false, kind: 'transport', isDefault: true },
      { id: 3, prepItemId: 'prep-lodging', title: '住宿', originalNote: '预定酒店或民宿', userNote: '', status: 'pending', isExpanded: false, kind: 'lodging', isDefault: true },
      { id: 4, prepItemId: 'prep-documents', title: '证件', originalNote: '身份证/学生证', userNote: '', status: 'pending', isExpanded: false, kind: 'documents', isDefault: true },
      { id: 5, prepItemId: 'prep-other', title: '其他', originalNote: '其他个人物品', userNote: '', status: 'pending', isExpanded: false, kind: 'other', isDefault: true }
    ];
  };

  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => buildChecklist(propTask));

  // 从后端 execution 数据构建 checklist
  // 从后端 execution 数据构建 checklist
  // 关键改变：当后端有 prepProgress 时，完全以后端数据为准
  const buildChecklistFromExecution = (executionData: any, taskData?: any): ChecklistItem[] => {
    if (!executionData?.prepProgress || !Array.isArray(executionData.prepProgress) || executionData.prepProgress.length === 0) {
      // 没有后端数据，返回基于任务配置的默认列表
      return buildChecklist(taskData);
    }

    // 检查是否有 Empty Marker
    // Previous "EMPTY_MARKER_V1" caused ObjectId cast error. 
    // Now checking for the specific title/kind combo.
    const hasEmptyMarker = executionData.prepProgress.some((p: any) =>
      p.title === '已清空备战清单' && p.kind === 'other'
    );
    if (hasEmptyMarker) {
      return []; // 用户特意清空了列表，返回空数组
    }

    // 有后端数据，完全以后端为准（用户可能已删除某些项）
    return executionData.prepProgress.map((p: any, index: number) => {
      // 尝试从任务配置中找到对应的原始配置（用于获取 originalNote）
      const configList = taskData?.prepListConfig || taskData?.prepList || [];
      const originalConfig = configList.find((c: any) =>
        c._id?.toString?.() === p.configId || c.title === p.title
      );

      return {
        id: index + 1,
        prepItemId: p.prepItemId || p._id || `prep-${index + 1}`,
        configId: p.configId,
        title: p.title,
        originalNote: originalConfig?.defaultNote || '',
        userNote: p.note || '',
        status: p.isCompleted ? 'completed' : 'pending',
        isExpanded: false,
        kind: p.kind || 'custom',
        isFromConfig: Boolean(p.configId),
        isUserAdded: !p.configId && !p.isDefault,
        isDefault: p.isDefault,
        formData: {
          attachmentUrl: p.attachmentUrl || p.data?.attachmentUrl,
          ...p.data
        }
      } as ChecklistItem;
    });
  };

  useEffect(() => {
    const fetchTaskAndExecution = async () => {
      const effectiveTaskId = propTask?._id || propTask?.id || taskId;
      if (!effectiveTaskId && !propTask) return;

      setLoading(true);
      try {
        let taskData = propTask;
        if ((!propTask || !propTask?.prepListConfig) && effectiveTaskId) {
          const taskResponse = await taskApi.getById(String(effectiveTaskId));
          taskData = taskResponse.data;
          setTask(taskData);
        }

        // Check if we are in "Template Mode" (Public View)
        // If so, we strictly DO NOT fetch execution data to avoid showing personal progress
        const isTemplateMode = propTask?.isTemplate;

        if (effectiveTaskId && !isTemplateMode) {
          console.log('[TaskPrepScreen] Fetching execution for taskId:', effectiveTaskId);
          const execResponse = await executionApi.getOrCreate(String(effectiveTaskId));
          const execData = execResponse.data;
          console.log('[TaskPrepScreen] Received execution:', execData);
          setExecutionId(execData._id || execData.id);

          // 使用后端数据为准来构建 checklist
          setChecklist(buildChecklistFromExecution(execData, taskData));
        } else {
          setChecklist(buildChecklist(taskData));
        }
      } catch (error) {
        console.error('Failed to load data', error);
        // User requested to remove the debug alert
        if (propTask) setChecklist(buildChecklist(propTask));
      } finally {
        setLoading(false);
      }
    };
    fetchTaskAndExecution();
  }, [propTask, taskId]);

  const progressPercentage = useMemo(() => {
    const total = checklist.length;
    if (total === 0) return 100;
    const completed = checklist.filter(item => item.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }, [checklist]);

  // Check logic: Requires userNote
  const toggleCheck = (id: number) => {
    const item = checklist.find(i => i.id === id);
    if (!item) return;

    if (item.status === 'editing') return; // Don't toggle while editing

    // If trying to complete, check if userNote exists
    if (item.status !== 'completed') {
      if (!item.userNote || !item.userNote.trim()) {
        alert('请先填写备注信息才能完成此项');
        // Auto expand to let user fill
        toggleEdit(id);
        return;
      }
    }

    // Toggle status
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    // Update local and save
    const newItem = { ...item, status: newStatus };

    const nextChecklist = checklist.map(i => i.id === id ? newItem : i);
    setChecklist(nextChecklist);

    // Save to backend immediately (or typically we save when "Save Details" is clicked)
    // Here we save the state update
    if (canBatchSync) {
      syncChecklistToBackend(nextChecklist);
    } else {
      saveItemToBackend(newItem);
    }
  };

  const toggleEdit = (id: number) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        // 如果当前是编辑模式，关闭时恢复到之前的状态
        if (item.status === 'editing') {
          return { ...item, isExpanded: false, status: item.userNote ? 'completed' : 'pending' };
        }
        // 否则进入编辑模式
        return { ...item, isExpanded: true, status: 'editing' };
      }
      // 关闭其他项
      return { ...item, isExpanded: false, status: item.status === 'editing' ? (item.userNote ? 'completed' : 'pending') : item.status };
    }));
  };

  const toggleView = (id: number) => {
    // 只展开/收起，不进入编辑模式
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isExpanded: !item.isExpanded };
      }
      return { ...item, isExpanded: false }; // 关闭其他项
    }));
  };

  const updateUserNote = (id: number, note: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, userNote: note } : item));
  };

  const updateFormData = (id: number, field: string, value: any) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, formData: { ...item.formData, [field]: value } };
      }
      return item;
    }));
  };

  const handleUpload = async (id: number, file: File) => {
    if (!file) return;

    // Reject files > 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('原图大小不能超过10MB');
      return;
    }

    setUploadingId(id);
    try {
      // Compress image to 1MB max
      const compressedFile = await compressImage(file, { maxSizeMB: 1 });

      const result = await uploadImage(compressedFile);
      if (result.url) {
        updateFormData(id, 'attachmentUrl', result.url);
      } else if (result.error) {
        alert(result.error);
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('图片上传失败');
    } finally {
      setUploadingId(null);
    }
  };

  const saveItem = async (id: number) => {
    const item = checklist.find(i => i.id === id);
    if (!item) return;

    if (!item.userNote || !item.userNote.trim()) {
      alert('请填写备注信息');
      return;
    }

    // Mark as completed and save
    const newItem = {
      ...item,
      status: 'completed',
      isExpanded: false
    } as ChecklistItem;

    const nextChecklist = checklist.map(i => i.id === id ? newItem : i);
    setChecklist(nextChecklist);
    if (canBatchSync) {
      await syncChecklistToBackend(nextChecklist);
    } else {
      saveItemToBackend(newItem);
    }
  };

  const saveItemToBackend = async (item: ChecklistItem) => {
    if (canBatchSync) {
      return;
    }
    if (!executionId) {
      alert("错误: 无法保存，ExecutionID 为空。请刷新页面重试。");
      return;
    }
    if (!item.prepItemId) {
      alert(`错误: 无法保存，PrepItemID 为空 (Item: ${item.title})`);
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        isCompleted: item.status === 'completed',
        note: item.userNote,
        title: item.title,
        kind: item.kind,
        attachmentUrl: item.formData?.attachmentUrl,
        data: item.formData
      };

      await executionApi.updatePrepItem(executionId, item.prepItemId, dataToSave);
      // alert('已保存'); 
    } catch (err) {
      console.error("Save failed", err);
      alert(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  const syncChecklistToBackend = async (nextChecklist: ChecklistItem[]) => {
    if (!executionId) {
      alert("错误: 无法保存，ExecutionID 为空。请刷新页面重试。");
      return;
    }
    setSaving(true);
    try {
      let prepProgress;
      if (nextChecklist.length === 0) {
        // 如果清单为空，保存一个标记项，防止下次加载时回退到默认列表
        // 注意：configId 必须是 ObjectId 或 null，不能是字符串标记
        prepProgress = [{
          title: "已清空备战清单",
          configId: null,
          isCompleted: true,
          kind: "other"
        }];
      } else {
        prepProgress = nextChecklist.map(item => ({
          configId: item.configId,
          title: item.title,
          kind: item.kind,
          isCompleted: item.status === 'completed',
          note: item.userNote,
          attachmentUrl: item.formData?.attachmentUrl,
          data: item.formData
        }));
      }
      await executionApi.updatePrepBatch(executionId, prepProgress);
    } catch (err) {
      console.error("Save failed", err);
      alert(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const newId = Math.max(...checklist.map(i => i.id), 0) + 1;
    const nextChecklist = [...checklist, {
      id: newId,
      title: '新备战项',
      originalNote: '',
      userNote: '',
      status: 'pending',
      isExpanded: true,
      kind: 'custom',
      isFromConfig: false,
      isUserAdded: true,
      formData: {}
    }];
    setChecklist(nextChecklist);
    if (canBatchSync) {
      syncChecklistToBackend(nextChecklist);
    }
  };

  const deleteItem = (id: number) => {
    const nextChecklist = checklist.filter(item => item.id !== id);
    setChecklist(nextChecklist);
    if (canBatchSync) {
      syncChecklistToBackend(nextChecklist);
    }
  };

  const handleConfirmAutoSave = async () => {
    setSaving(true);
    const newChecklist = checklist.map(item => {
      // If pending/editing AND has userNote, save it
      if ((item.status === 'pending' || item.status === 'editing') && item.userNote && item.userNote.trim()) {
        return { ...item, status: 'completed' as const, isExpanded: false };
      }
      return item;
    });
    setChecklist(newChecklist);
    try {
      if (canBatchSync) {
        await syncChecklistToBackend(newChecklist);
      } else {
        const promises = newChecklist.map(item => {
          if (item.status === 'completed' && item.userNote && item.userNote.trim()) {
            return saveItemToBackend(item);
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
      }
    } catch (e) {
      console.error("Auto save failed", e);
    } finally {
      setSaving(false);
      onConfirm();
    }
  };

  // UI Rendering
  if (loading) return <div className="flex justify-center items-center h-screen bg-[#f8f7f5] dark:bg-[#111618]">Loading...</div>;

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#111618] min-h-screen text-[#111618] dark:text-gray-100 font-display">
      <div className="w-full sm:max-w-md mx-auto sm:shadow-2xl min-h-screen flex flex-col relative">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white/90 dark:bg-[#111618]/90 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
          <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><span className="material-symbols-outlined">arrow_back</span></button>
          <h2 className="text-lg font-bold">任务备战</h2>
          <button onClick={() => setShowTaskMenu(true)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><span className="material-symbols-outlined">more_horiz</span></button>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4 pb-24">
          {/* Note Banner */}
          {!hideBanner && (hasCustomPrepList ? (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-300">
              已配置备战清单，请按要求完成准备。
            </div>
          ) : (
            <div className="bg-blue-100/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
              未设置备战清单，系统默认准备项。
            </div>
          ))}

          {/* Progress (editable only) */}
          {!readonly && (
            <div className="flex flex-col gap-3 bg-white dark:bg-[#1C1C1E] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-end">
                <p className="font-bold">备战进度</p>
                <p className="text-[#0ea5e9] text-xl font-bold">{progressPercentage}%</p>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#0ea5e9] rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
          )}

          {/* Checklist */}
          <h3 className="text-lg font-bold px-1">待办清单</h3>
          <div className="flex flex-col gap-4">
            {checklist.map(item => (
              <div key={item.id} className="bg-white dark:bg-[#1C1C1E] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Header Row */}
                <div
                  className={`p-4 flex items-center justify-between transition-all duration-200 ${item.isExpanded ? 'bg-[#0ea5e9]/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                >
                  <div className="flex items-center gap-4 flex-1" onClick={() => !readonly && toggleView(item.id)}>
                    {/* Checkbox (Smaller Square) - Click to toggle check */}
                    <div
                      className={`shrink-0 flex size-8 items-center justify-center rounded-lg border-2 transition-all duration-300 cursor-pointer ${item.status === 'completed'
                        ? 'bg-[#0ea5e9] border-[#0ea5e9] shadow-md shadow-sky-200 dark:shadow-none'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      onClick={(e) => { e.stopPropagation(); !readonly && toggleCheck(item.id); }}
                    >
                      {item.status === 'completed' && <span className="material-symbols-outlined text-white text-[20px] font-bold animate-in zoom-in">check</span>}
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <p className={`text-base font-bold text-gray-900 dark:text-white truncate ${item.status === 'completed' ? '' : ''}`}>{item.title}</p>
                      </div>

                      {/* Subtitle / Status */}
                      <div className="flex flex-col gap-0.5">
                        {item.status === 'completed' ? (
                          <p className="text-xs font-bold text-[#0ea5e9]">已完成</p>
                        ) : (
                          <p className="text-xs text-gray-400">
                            {item.originalNote || '无特殊要求'}
                          </p>
                        )}
                        {/* Show user note preview if completed */}
                        {item.status === 'completed' && item.userNote && (
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.userNote}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit / Delete Icons */}
                  {!readonly && (
                    <div className="flex items-center ml-2 gap-1">
                      {/* Delete Button - Only show for deletable items (NOT from author config) */}
                      {!item.isFromConfig && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                          className="size-9 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                          title="删除此项"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleEdit(item.id); }}
                        className="size-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="编辑"
                      >
                        <span className="material-symbols-outlined text-[20px]">{item.status === 'editing' ? 'close' : 'edit'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Form */}
                {item.isExpanded && !readonly && (
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 flex flex-col gap-4">
                    {/* 编辑模式 */}
                    {item.status === 'editing' ? (
                      <>
                        {item.kind === 'custom' && item.isUserAdded && (
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase text-gray-500">清单标题</label>
                            <input
                              value={item.title}
                              onChange={(e) => {
                                const nextChecklist = checklist.map(i => i.id === item.id ? { ...i, title: e.target.value } : i);
                                setChecklist(nextChecklist);
                              }}
                              className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-[#0ea5e9] outline-none text-sm"
                              placeholder="填写备战项标题"
                            />
                          </div>
                        )}
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-bold block mb-1">📢 任务要求:</span>
                          {item.originalNote ? item.originalNote : '无特殊要求'}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold uppercase text-gray-500">我的备注 (必填)</label>
                          <textarea
                            value={item.userNote}
                            onChange={(e) => updateUserNote(item.id, e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-[#0ea5e9] outline-none text-sm min-h-[80px]"
                            placeholder="记录备战详情..."
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold uppercase text-gray-500">附件图片 (可选)</label>
                          <div className="flex items-center gap-4">
                            {/* Upload Button */}
                            <label className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${uploadingId === item.id ? 'opacity-50' : ''}`}>
                              <span className="material-symbols-outlined text-[#0ea5e9]">add_photo_alternate</span>
                              <span className="text-sm">{uploadingId === item.id ? '上传中...' : '上传图片'}</span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(item.id, e.target.files[0])} />
                            </label>

                            {/* Preview */}
                            {item.formData?.attachmentUrl && (
                              <div className="relative size-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                <CapacitorImage src={getImageUrl(item.formData.attachmentUrl)} className="w-full h-full object-cover" alt="attachment" />
                                <button
                                  onClick={() => updateFormData(item.id, 'attachmentUrl', '')}
                                  className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl shadow-sm"
                                >
                                  <span className="material-symbols-outlined text-[12px]">close</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button onClick={() => toggleEdit(item.id)} className="flex-1 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400">取消</button>
                          <button onClick={() => saveItem(item.id)} className="flex-1 py-2.5 rounded-full bg-[#0ea5e9] text-white text-sm font-bold shadow-lg">确认完成</button>
                        </div>
                      </>
                    ) : (
                      /* 查看模式 */
                      <>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-bold block mb-1">📢 任务要求:</span>
                          {item.originalNote ? item.originalNote : '无特殊要求'}
                        </div>

                        {item.userNote && (
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase text-gray-500">我的备注:</label>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {item.userNote}
                            </div>
                          </div>
                        )}

                        {item.formData?.attachmentUrl && (
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase text-gray-500">附件图片:</label>
                            <div
                              className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setFullscreenImage(item.formData?.attachmentUrl || null)}
                            >
                              <CapacitorImage src={getImageUrl(item.formData.attachmentUrl)} className="w-full h-full object-cover" alt="attachment" />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                                <span className="material-symbols-outlined text-white opacity-0 hover:opacity-100 text-3xl drop-shadow-lg">zoom_in</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {canAddItem && (
              <button onClick={addItem} className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-[#0ea5e9] hover:border-[#0ea5e9]">
                <span className="material-symbols-outlined">add</span> 添加新项
              </button>
            )}
          </div>
        </div>

        {!readonly && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#101c22]/90 backdrop-blur-lg flex justify-center w-full sm:max-w-md mx-auto border-t border-gray-200">
            <button
              onClick={handleConfirmAutoSave}
              disabled={saving}
              className={`w-full bg-[#111618] dark:bg-white text-white dark:text-[#111618] h-12 rounded-full font-bold shadow-xl flex items-center justify-center gap-2 ${saving ? 'opacity-80' : ''}`}
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">{autoStart ? 'rocket_launch' : 'check_circle'}</span>
              )}
              {saving ? '保存中...' : (autoStart ? '完成备战并出发' : '确认全部备战')}
            </button>
          </div>
        )}
      </div>

      {/* 全屏图片预览 */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 size-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <CapacitorImage
            src={getImageUrl(fullscreenImage)}
            className="max-w-full max-h-full object-contain"
            alt="全屏预览"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <TaskMoreMenu isOpen={showTaskMenu} taskTitle="任务备战" onClose={() => setShowTaskMenu(false)} onShare={() => { }} onFavorite={() => { }} onReport={() => { }} />
    </div>
  );
};

export default TaskPrepScreen;
