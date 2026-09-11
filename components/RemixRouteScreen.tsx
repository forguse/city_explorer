import React, { useState, useEffect } from 'react';
import { task as taskApi } from '../services/api';
import CitySelector from './CitySelector';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface RemixRouteScreenProps {
  onBack: () => void;
  sourceTaskId?: string;
  originalTask?: {
    id: string;
    title: string;
    description: string;
    author: string;
    nodes: Array<{
      id: number;
      name: string;
      description: string;
      location?: string;
      imageUrl?: string;
    }>;
  };
}

interface TaskNode {
  id: number;
  description: string;
  useLocation: boolean;
  locationName?: string;
  useImage: boolean;
  imageUrl?: string;
}

const RemixRouteScreen: React.FC<RemixRouteScreenProps> = ({ onBack, sourceTaskId, originalTask: propOriginalTask }) => {
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedTask, setFetchedTask] = useState<any>(null);

  // 如果有 sourceTaskId 但没有 originalTask，则从 API 获取任务数据
  useEffect(() => {
    const fetchTask = async () => {
      if (sourceTaskId && !propOriginalTask) {
        setLoading(true);
        try {
          const res = await taskApi.getById(sourceTaskId);
          const t = res.data;
          setFetchedTask({
            id: t._id,
            title: t.title,
            description: t.description || '',
            author: t.creator?.nickname || '未知作者',
            nodes: (t.nodes || []).map((n: any, idx: number) => ({
              id: idx + 1,
              name: n.name || `节点 ${idx + 1}`,
              description: n.description || '',
              location: n.location?.name,
              imageUrl: getImageUrl(n.referenceImageUrl)
            }))
          });
        } catch (err) {
          console.error('Failed to fetch task for remix:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchTask();
  }, [sourceTaskId, propOriginalTask]);

  const originalTask = propOriginalTask || fetchedTask;

  // 加载中状态
  if (loading) {
    return (
      <div className="relative flex h-full w-full flex-col min-h-screen overflow-x-hidden bg-[#f8f7f5] dark:bg-[#221910] font-display items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">加载任务数据中...</p>
      </div>
    );
  }

  // 如果没有原始任务数据，显示提示
  if (!originalTask) {
    return (
      <div className="relative flex h-full w-full flex-col min-h-screen overflow-x-hidden bg-[#f8f7f5] dark:bg-[#221910] font-display items-center justify-center">
        <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">fork_right</span>
        <p className="text-gray-500 dark:text-gray-400 mb-4">请先选择一个任务进行魔改</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-[#0ea5e9] text-white rounded-full font-medium"
        >
          返回
        </button>
      </div>
    );
  }

  const task = originalTask;

  // 这些状态需要在组件顶部定义，所以改用一个内部组件
  return (
    <RemixRouteEditor
      task={task}
      onBack={onBack}
      publishing={publishing}
      setPublishing={setPublishing}
    />
  );
};

// 内部编辑器组件，确保 task 已存在时才渲染
const RemixRouteEditor: React.FC<{
  task: any;
  onBack: () => void;
  publishing: boolean;
  setPublishing: (v: boolean) => void;
}> = ({ task, onBack, publishing, setPublishing }) => {
  const [missionTitle, setMissionTitle] = useState(task.title + ' (我的版本)');
  const [description, setDescription] = useState(task.description || '');
  const [nodes, setNodes] = useState<TaskNode[]>(
    (task.nodes || []).map((n: any) => ({
      id: n.id,
      description: n.description || '',
      useLocation: !!n.location,
      locationName: n.location,
      useImage: !!n.imageUrl,
      imageUrl: n.imageUrl
    }))
  );
  const [coverImage, setCoverImage] = useState<string>(getImageUrl(task.coverImageUrl) || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuVrR25vPucExOPvBtk-9b5dMy-WPZVhvlembTdy7Stt9O04K7ktGqbWu_Qf5ehLW-VGpn6om4vrVYAHeUN0GuDfk9rV4QaeLsz5c4b04xoAbYByhcQ5touW52nXqjWcpLHe7UUt91wHbfdLy6K9sHt0nXBgodbGGFvqrJvaFisuq4hucpMxgX1VnAymfyiTLXZCW1Lqpm9zklpolVl0SoQn5oDdOabtCy3pd3nZHJ3-wtLLYjD11onbr-nc-QwptmCvUZ8KBw3lw');

  const handlePublish = async (type: 'public' | 'private') => {
    if (publishing) return;

    setPublishing(true);
    try {
      // 构建任务节点数据
      const taskNodes = nodes.map((node, index) => ({
        description: node.description,
        isLocationSpecific: node.useLocation,
        coordinates: node.locationName ? {
          latitude: 0, // TODO: 从地图选择器获取真实坐标
          longitude: 0
        } : undefined,
        referenceImageUrl: node.imageUrl
      }));

      // 创建魔改任务
      await taskApi.create({
        title: missionTitle,
        description: description,
        nodes: taskNodes,
        coverImageUrl: coverImage,
        isAI: false,
        isOfficial: false,
        status: type === 'private' ? 'approved' : 'pending', // 私密发布直接通过，公开发布需要审核
        remixedFrom: task.id // 标记原始任务
      });

      alert(type === 'private' ? '已保存为私密任务' : '已提交审核，通过后将公开显示');
      onBack();
    } catch (error: any) {
      console.error('Failed to publish remix:', error);
      if (error.response?.data?.code === 'SENSITIVE_CONTENT') {
        alert('内容包含敏感词，请修改后重试');
      } else {
        alert('发布失败，请重试');
      }
    } finally {
      setPublishing(false);
    }
  };

  const addNode = () => {
    setNodes([...nodes, {
      id: Date.now(),
      description: '',
      useLocation: false,
      useImage: false
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
    updateNode(id, 'locationName', '上海 · 新天地 (示例坐标)');
  };

  const handleNodeImage = (id: number) => {
    const randomImg = `https://picsum.photos/seed/${id}/400/250`;
    updateNode(id, 'imageUrl', randomImg);
  };

  return (
    <div className="relative flex h-full w-full flex-col min-h-screen overflow-x-hidden bg-[#f8f7f5] dark:bg-[#221910] pb-32 font-display transition-colors duration-200">

      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#2d241c] px-4 py-3 justify-between shadow-sm transition-colors duration-200">
        <button
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#111618] dark:text-white text-[24px]">arrow_back_ios_new</span>
        </button>
        <h2 className="text-[#111618] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">魔改路线</h2>
      </div>

      {/* Original Task Banner */}
      <div className="mx-5 mt-4 rounded-xl bg-gradient-to-r from-[#0ea5e9]/10 to-purple-500/10 border border-[#0ea5e9]/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[#0ea5e9] text-lg">fork_right</span>
          <span className="text-sm font-medium text-[#0ea5e9]">改编自</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-bold text-[#0ea5e9]">{task.author}</span> 的 "{task.title}"
        </p>
      </div>

      {/* Title Area */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-[#111618] dark:text-white text-2xl font-extrabold leading-tight tracking-tight mb-2">自定义你的路线</h1>
        <p className="text-[#64748b] dark:text-gray-400 text-sm font-normal leading-relaxed">
          基于原路线进行修改，创建属于你的专属探险。
        </p>
      </div>

      <div className="flex flex-col gap-6 px-5 mt-4">

        {/* Task Name */}
        <div className="flex flex-col gap-2">
          <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">任务名称</label>
          <input
            value={missionTitle}
            onChange={(e) => setMissionTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-4 py-4 text-base font-medium text-[#111618] dark:text-white placeholder:text-gray-400 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none transition-all shadow-sm"
            placeholder="给你的魔改路线起个名字..."
            type="text"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">任务简介</label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-4 py-4 text-base font-medium text-[#111618] dark:text-white placeholder:text-gray-400 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none transition-all shadow-sm min-h-[100px]"
              placeholder="介绍一下你的修改版本..."
            ></textarea>
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1">
              <span className="material-symbols-outlined text-gray-400 text-xs">edit</span>
              <span className="text-xs font-medium text-gray-400">{description.length}/200</span>
            </div>
          </div>
        </div>

        {/* Task Nodes Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">
              路线节点 ({nodes.length})
            </label>
          </div>

          <div className="flex flex-col gap-4">
            {nodes.map((node, index) => (
              <div key={node.id} className="relative flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] text-xs font-bold ring-2 ring-white dark:ring-[#2d241c]">
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

                <textarea
                  value={node.description}
                  onChange={(e) => updateNode(node.id, 'description', e.target.value)}
                  placeholder="输入节点任务说明..."
                  className="w-full resize-none rounded-lg bg-gray-50 dark:bg-[#221910] border-transparent focus:bg-white dark:focus:bg-[#2d241c] focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] px-3 py-3 text-sm text-[#111618] dark:text-white placeholder:text-gray-400 transition-all outline-none border"
                  rows={3}
                />

                <div className="flex flex-wrap gap-2 mt-1">
                  <button
                    onClick={() => updateNode(node.id, 'useLocation', !node.useLocation)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${node.useLocation
                      ? 'bg-[#0ea5e9]/10 border-[#0ea5e9] text-[#0ea5e9]'
                      : 'bg-gray-50 dark:bg-[#323b42] border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d464e]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {node.useLocation ? '已启用地点' : '指定任务地点'}
                  </button>

                  <button
                    onClick={() => updateNode(node.id, 'useImage', !node.useImage)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${node.useImage
                      ? 'bg-[#0ea5e9]/10 border-[#0ea5e9] text-[#0ea5e9]'
                      : 'bg-gray-50 dark:bg-[#323b42] border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d464e]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    {node.useImage ? '已启用图片' : '插入参考图'}
                  </button>
                </div>

                {node.useLocation && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-lg bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 mt-1 cursor-pointer hover:bg-[#0ea5e9]/10 transition-colors"
                    onClick={() => handleNodeLocation(node.id)}
                  >
                    <span className="material-symbols-outlined text-[#0ea5e9] text-[20px]">add_location_alt</span>
                    <span className="text-sm font-medium text-[#0ea5e9] truncate flex-1 leading-none">
                      {node.locationName || "点击选择地图位置..."}
                    </span>
                  </div>
                )}

                {node.useImage && (
                  <div className="mt-1">
                    {node.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                        <CapacitorImage src={node.imageUrl} className="w-full h-full object-cover" alt="Node" />
                        <button
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors backdrop-blur-sm"
                          onClick={(e) => { e.stopPropagation(); updateNode(node.id, 'imageUrl', undefined); }}
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className="w-full aspect-[3/1] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#0ea5e9] hover:border-[#0ea5e9] hover:bg-[#0ea5e9]/5 transition-all cursor-pointer"
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

            <button
              onClick={addNode}
              className="flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-[#0ea5e9] hover:text-[#0ea5e9] hover:bg-[#0ea5e9]/5 transition-all w-full active:scale-[0.99]"
            >
              <span className="material-symbols-outlined">add_circle</span>
              <span className="text-base font-bold">添加新节点</span>
            </button>
          </div>
        </div>

        {/* Cover Image */}
        <div className="flex flex-col gap-2">
          <label className="text-[#111618] dark:text-white text-base font-bold leading-normal ml-1">任务封面</label>
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            {coverImage ? (
              <>
                <CapacitorImage src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button className="px-4 py-2 bg-white/90 rounded-full text-sm font-bold">更换封面</button>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2">add_photo_alternate</span>
                <span className="text-sm">上传封面图片</span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-2 mb-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent p-[1px]">
          <div className="flex items-start gap-4 rounded-xl bg-white dark:bg-[#2d241c] p-5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-pink-400 text-white shadow-lg shadow-purple-500/30">
              <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-[#111618] dark:text-white">魔改说明</h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                你的魔改版本会标注原作者，同时保留你的创作版权。私密发布仅自己可见。
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center p-4 bg-gradient-to-t from-[#f8f7f5] via-[#f8f7f5] to-transparent dark:from-[#221910] dark:via-[#221910] pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md px-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              onClick={() => handlePublish('private')}
              disabled={publishing}
              className={`flex-1 rounded-full border border-gray-200 dark:border-gray-700 py-4 text-center text-base font-bold shadow-sm active:scale-[0.98] transition-all ${publishing
                ? 'bg-gray-100 dark:bg-slate-900 text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-slate-800 text-[#111618] dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
            >
              {publishing ? '发布中...' : '私密发布'}
            </button>
            <button
              onClick={() => handlePublish('public')}
              disabled={publishing}
              className={`flex-1 rounded-full py-4 text-center text-base font-bold shadow-lg shadow-purple-500/30 active:scale-[0.98] transition-all ${publishing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#0ea5e9] to-purple-500 hover:opacity-90'
                } text-white`}
            >
              {publishing ? '发布中...' : '立即发布'}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 px-2 leading-tight">
            私密发布不需要审核，仅自己可见
          </p>
        </div>
      </div>
    </div>
  );
};

export default RemixRouteScreen;
