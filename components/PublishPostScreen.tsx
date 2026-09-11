
import React, { useState, useEffect } from 'react';
import { task, community, encounter } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import { useImageUpload } from '../src/hooks/useImageUpload';
import EncounterMiniCard from './EncounterMiniCard';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface PublishPostScreenProps {
  onBack: () => void;
  onPublish: (data: any) => void;
  entrySource?: 'my_tasks' | 'community';
  defaultMissionId?: string | number;
  defaultEncounterId?: string;
  initialTask?: any;
}

import TaskSelectionModal from './TaskSelectionModal';

const PublishPostScreen: React.FC<PublishPostScreenProps> = ({
  onBack,
  onPublish,
  entrySource = 'community',
  defaultMissionId,
  defaultEncounterId,
  initialTask
}) => {
  const [content, setContent] = useState('');
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(defaultMissionId?.toString() || (initialTask ? initialTask.id : null));
  const [selectedMission, setSelectedMission] = useState<any>(initialTask || null); // Store full object for display
  const [remixTask, setRemixTask] = useState<any>(null); // New: Store selected remix version task
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showRemixSelector, setShowRemixSelector] = useState(false); // New: Task selector visibility for remix

  // For Task Node Publishing Mode
  const [nodes, setNodes] = useState<any[]>([]);
  const [taskPoolImages, setTaskPoolImages] = useState<string[]>([]);

  // 关联奇遇
  const [completedEncounters, setCompletedEncounters] = useState<any[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
  const [showEncounterSelector, setShowEncounterSelector] = useState(false);

  // 图片上传 hook
  const { upload, loading: imageUploading, error: uploadError } = useImageUpload();

  useEffect(() => {
    if (initialTask && initialTask.nodes && Array.isArray(initialTask.nodes)) {
      const mappedNodes = initialTask.nodes.map((node: any, index: number) => ({
        id: index,
        title: `打卡点 ${index + 1}: ${node.description || '节点'}`,
        content: '',
        images: [],
        defaultImg: node.referenceImageUrl || ''
      }));
      setNodes(mappedNodes);
    }
  }, [initialTask]);

  // 自动加载关联任务详情（分享成就时传入 defaultMissionId）
  useEffect(() => {
    if (defaultMissionId && !initialTask) {
      // 同步 ID
      setSelectedMissionId(defaultMissionId.toString());

      // 如果没有详情数据，去加载
      if (!selectedMission || selectedMission.id !== defaultMissionId.toString()) {
        const fetchTask = async () => {
          try {
            console.log('Fetching linked task:', defaultMissionId);
            const res = await task.getById(defaultMissionId.toString());
            if (res.data) {
              console.log('Loaded linked task:', res.data.title);
              setSelectedMission({
                id: res.data._id,
                title: res.data.title,
                desc: res.data.description,
                image: getImageUrl(res.data.coverImageUrl)
              });
            }
          } catch (err) {
            console.error('Failed to fetch linked task:', err);
          }
        };
        fetchTask();
      }
    }
  }, [defaultMissionId, initialTask]);

  // 获取已完成奇遇列表
  useEffect(() => {
    const fetchEncounters = async () => {
      try {
        const res = await encounter.getMyCompleted();
        setCompletedEncounters(res.data || []);

        // 如果有默认奇遇ID，自动选中
        if (defaultEncounterId && res.data) {
          const found = res.data.find((enc: any) => enc._id === defaultEncounterId);
          if (found) {
            setSelectedEncounter(found);
          }
        }
      } catch (err) {
        console.error('Failed to fetch completed encounters:', err);
      }
    };
    fetchEncounters();
  }, [defaultEncounterId]);

  const handlePublishClick = async () => {
    // 必须有文字内容
    if (!content.trim()) {
      alert('请输入分享内容');
      return;
    }

    setPublishing(true);
    try {
      // Call backend API to create post
      await community.createPost({
        content,
        imageUrls: uploadedImages,
        relatedTask: selectedMissionId || undefined,
        remixTask: remixTask?.id || undefined,
        relatedSerendipity: selectedEncounter?._id || undefined
      });

      // Notify parent component
      onPublish({
        source: entrySource,
        content,
        images: uploadedImages,
        missionId: selectedMissionId,
        remixTask: remixTask, // Pass full object or ID based on what parent expects, but previously it was date. let's pass object or id
        isRemix: !!remixTask, // Keep for backward compatibility if needed, or removing it if we change parent
        // missionSequence: selectedMission?.nodes || [], // Removed as we don't fetch full nodes unless requested
        nodeThoughts: initialTask ? nodes : []
      });
    } catch (error) {
      console.error('Failed to publish post', error);
      alert('发布失败，请重试');
    } finally {
      setPublishing(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 创建隐藏的 file input 引用
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 逐个上传图片到服务器
    const fileList = Array.from(files) as File[];
    for (const file of fileList) {
      const result = await upload(file);
      if (result.url) {
        setUploadedImages(prev => [...prev, result.url!]);
      } else if (result.error) {
        alert(result.error);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Node editing handlers
  const updateNodeContent = (id: number, text: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, content: text } : n));
  };

  const addImageToNode = (nodeId: number, img: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        if (n.images.includes(img)) return n;
        return { ...n, images: [...n.images, img] };
      }
      return n;
    }));
  };

  const removeImageFromNode = (nodeId: number, imgIndex: number) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return { ...n, images: n.images.filter((_: any, i: number) => i !== imgIndex) };
      }
      return n;
    }));
  };

  const deleteNode = (id: number) => {
    if (window.confirm('确定要删除这个节点吗？')) {
      setNodes(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <div className="bg-[#f8f7f6] dark:bg-[#221810] font-display min-h-screen flex flex-col antialiased text-gray-900 dark:text-gray-100 transition-colors duration-300">

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-[#f8f7f6]/95 dark:bg-[#221810]/95 backdrop-blur-sm px-4 py-3 border-b border-gray-200/50 dark:border-white/5">
        <button
          onClick={onBack}
          className="flex items-center justify-center p-2 -ml-2 rounded-full text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[28px]">close</span>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
          {initialTask ? '分享心得' : '发布分享'}
        </h1>
        <button
          onClick={handlePublishClick}
          disabled={publishing}
          className={`text-white text-sm font-bold px-5 py-2 rounded-full shadow-sm transition-all transform active:scale-95 ${publishing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#ee7c2b] hover:bg-[#ee7c2b]/90'
            }`}
        >
          {publishing ? '发布中...' : '发布'}
        </button>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto pb-10 overflow-y-auto no-scrollbar">

        {/* Overall Content Input */}
        <div className="px-4 py-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            className="w-full bg-transparent border-none p-0 text-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 resize-none min-h-[120px] leading-relaxed outline-none"
            placeholder={initialTask ? "写下整体的探险感受..." : "分享你的探险心得..."}
          ></textarea>
          <div className="text-right text-xs text-gray-400 mt-1">{content.length}/500</div>
        </div>

        {/* If publishing a specific task review */}
        {initialTask && (
          <div className="px-4 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#ee7c2b]">rate_review</span>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">分节点心得</h3>
            </div>

            <div className="flex flex-col gap-6">
              {nodes.map((node) => (
                <div key={node.id} className="bg-white dark:bg-[#1a1614] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 overflow-hidden">
                        <CapacitorImage src={getImageUrl(node.defaultImg)} className="w-full h-full object-cover" alt={node.title} />
                      </div>
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{node.title}</span>
                    </div>
                    <button onClick={() => deleteNode(node.id)} className="text-gray-400 hover:text-red-500">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>

                  <textarea
                    value={node.content}
                    onChange={(e) => updateNodeContent(node.id, e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 resize-none min-h-[60px] leading-relaxed outline-none mb-3"
                    placeholder="这个点位有什么特别之处？"
                  ></textarea>

                  {/* Selected Images for Node */}
                  {node.images.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                      {node.images.map((img: string, idx: number) => (
                        <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden group">
                          <CapacitorImage src={getImageUrl(img)} className="w-full h-full object-cover" alt="Selected" />
                          <button
                            onClick={() => removeImageFromNode(node.id, idx)}
                            className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl-md hover:bg-red-500"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Task Image Pool Selector */}
                  <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                    <p className="text-xs text-gray-400 mb-2">从任务相册选择图片:</p>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {taskPoolImages.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => addImageToNode(node.id, img)}
                          className="w-12 h-12 shrink-0 rounded-md overflow-hidden cursor-pointer hover:opacity-80 ring-2 ring-transparent hover:ring-[#ee7c2b] transition-all"
                        >
                          <CapacitorImage src={getImageUrl(img)} className="w-full h-full object-cover" alt="Pool" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Image Upload (Only if not task review or mixed use) */}
        {!initialTask && (
          <div className="px-4 pb-6">
            <div className="grid grid-cols-3 gap-3">
              {/* 隐藏的文件输入框 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={triggerFileUpload}
                className="aspect-square flex flex-col items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 border-2 border-dashed border-gray-300 dark:border-white/10 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors group cursor-pointer"
              >
                <span className="material-symbols-outlined text-3xl mb-1 group-hover:text-[#ee7c2b] transition-colors">add_a_photo</span>
                <span className="text-xs font-medium">添加照片</span>
              </button>

              {uploadedImages.map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl overflow-hidden group shadow-sm bg-gray-200 dark:bg-gray-800"
                >
                  <div className="absolute inset-0 transition-transform hover:scale-105 duration-500">
                    <CapacitorImage
                      src={getImageUrl(img)}
                      alt="Upload Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 backdrop-blur-sm transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-2 bg-gray-100 dark:bg-white/5 w-full"></div>

        {/* Use TaskSelectionModal instead of rendered list */}
        {!initialTask && (
          <div className="px-4 py-4">
            {selectedMissionId ? (
              // Selected Task Preview
              <div className="relative flex flex-col p-4 rounded-xl border border-[#ee7c2b] bg-[#ee7c2b]/5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 text-[#ee7c2b]">
                    <span className="material-symbols-outlined text-lg">flag</span>
                    <span className="text-sm font-bold">已关联任务</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMissionId(null);
                      setSelectedMission(null);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-200 shrink-0 overflow-hidden">
                    <CapacitorImage
                      src={selectedMission?.image || ''}
                      alt={selectedMission?.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{selectedMission?.title || '任务'}</h4>
                    <p className="text-xs text-gray-500">{selectedMission?.desc || '关联任务将显示在您的动态中'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Add Task Entry
              <div
                onClick={() => setShowTaskSelector(true)}
                className="flex items-center justify-between py-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-[#ee7c2b] transition-colors">flag</span>
                  <span className="font-medium">关联任务</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <span className="text-xs mr-1">选择任务</span>
                  <span className="material-symbols-outlined">chevron_right</span>
                </div>
              </div>
            )}

            {/* Location Entry (Keep existing) */}
            <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-white/5 cursor-pointer mt-2">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                <span className="material-symbols-outlined text-gray-400">location_on</span>
                <span className="font-medium">添加地点</span>
              </div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </div>

            <TaskSelectionModal
              visible={showTaskSelector}
              onClose={() => setShowTaskSelector(false)}
              onSelect={(task) => {
                setSelectedMissionId(task.id);
                setSelectedMission(task);
                setShowTaskSelector(false);
              }}
            />

            {/* 关联奇遇 */}
            <div className="border-t border-gray-100 dark:border-white/5 pt-3 mt-3">
              {selectedEncounter ? (
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2 text-purple-600">
                    <span className="text-lg">🎲</span>
                    <span className="text-sm font-bold">已关联奇遇</span>
                    <button
                      onClick={() => setSelectedEncounter(null)}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                  <EncounterMiniCard
                    title={selectedEncounter.serendipityTask?.title || '奇遇任务'}
                    city={selectedEncounter.serendipityTask?.targetCities?.[0]}
                    status="completed"
                  />
                </div>
              ) : completedEncounters.length > 0 ? (
                <div
                  onClick={() => setShowEncounterSelector(true)}
                  className="flex items-center justify-between py-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <span className="text-lg">🎲</span>
                    <span className="font-medium">关联奇遇</span>
                    <span className="text-xs text-purple-500 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                      {completedEncounters.length}个可选
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </div>
              ) : null}
            </div>

            {/* 奇遇选择器弹窗 */}
            {showEncounterSelector && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 max-h-[60vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">选择已完成的奇遇</h3>
                    <button onClick={() => setShowEncounterSelector(false)}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {completedEncounters.map((enc: any) => (
                      <div
                        key={enc._id}
                        onClick={() => {
                          setSelectedEncounter(enc);
                          setShowEncounterSelector(false);
                        }}
                        className="cursor-pointer hover:opacity-80"
                      >
                        <EncounterMiniCard
                          title={enc.serendipityTask?.title || '奇遇任务'}
                          city={enc.serendipityTask?.targetCities?.[0]}
                          status="completed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remix Toggle (Only if not specific task review, or make it available?) */}
        {/* Remix Selector (Only if not specific task review) */}
        {!initialTask && (
          <div className="px-4">
            <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex-1">
                <div className="text-gray-900 dark:text-white font-semibold text-base mb-1">
                  分享我改写的版本
                </div>

                {remixTask ? (
                  <div className="relative flex items-center gap-3 p-3 rounded-xl border border-purple-500 bg-purple-50 dark:bg-purple-900/10 mt-2">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0 overflow-hidden">
                      <CapacitorImage
                        src={remixTask.image || ''}
                        alt="Remix Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-purple-700 dark:text-purple-300 truncate">{remixTask.title}</h4>
                      <p className="text-xs text-purple-600/70 dark:text-purple-400/70 truncate">作为魔改版本分享</p>
                    </div>
                    <button
                      onClick={() => setRemixTask(null)}
                      className="p-1 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRemixSelector(true)}
                    className="flex items-center text-sm text-[#ee7c2b] font-medium mt-1 hover:opacity-80 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-lg mr-1">add_circle</span>
                    点击选择我发布的任务
                  </button>
                )}
              </div>
            </div>

            {/* Reuse TaskSelectionModal for Remix Selection - Locked to 'created' tab */}
            <TaskSelectionModal
              visible={showRemixSelector}
              onClose={() => setShowRemixSelector(false)}
              onSelect={(task) => {
                setRemixTask(task);
                setShowRemixSelector(false);
              }}
              fixedTab="created"
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default PublishPostScreen;
