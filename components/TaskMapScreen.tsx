import React, { useState, useEffect } from 'react';
import { task as taskApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface TaskMapScreenProps {
  onBack: () => void;
  onTaskDetail?: (taskId: string) => void;
  onStartTask?: (taskId: string) => void;
}

interface MapTask {
  id: string;
  title: string;
  description: string;
  location: string;
  distance: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  reward: number;
  image: string;
  position: { top: string; left: string };
  isHot?: boolean;
  isNew?: boolean;
  coordinates?: { latitude: number; longitude: number }; // 真实GPS坐标
}

const TaskMapScreen: React.FC<TaskMapScreenProps> = ({ onBack, onTaskDetail, onStartTask }) => {
  const [selectedTask, setSelectedTask] = useState<MapTask | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [mapTasks, setMapTasks] = useState<MapTask[]>([]);
  const [loading, setLoading] = useState(false);

  // 从后端获取任务列表
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const response = await taskApi.getAll({ status: 'approved', limit: 20 });
        const tasks = response.data.tasks || response.data || [];

        // 将后端数据转换为地图任务格式
        const convertedTasks: MapTask[] = tasks.map((task: any, index: number) => {
          // 根据难度映射
          const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
            1: 'easy', 2: 'easy', 3: 'medium', 4: 'hard', 5: 'hard'
          };

          // 从任务的真实坐标计算地图位置
          // 如果有坐标则使用，否则使用随机位置
          let position = { top: '50%', left: '50%' };
          if (task.location?.coordinates?.latitude && task.location?.coordinates?.longitude) {
            // 将经纬度转换为地图上的百分比位置
            // 这里假设地图范围：上海大致 纬度 31.0-31.5, 经度 121.0-122.0
            const lat = task.location.coordinates.latitude;
            const lng = task.location.coordinates.longitude;
            // 转换为百分比（可根据实际地图范围调整）
            const top = Math.max(10, Math.min(85, ((31.5 - lat) / 0.5) * 80 + 10));
            const left = Math.max(10, Math.min(85, ((lng - 121.0) / 1.0) * 80 + 10));
            position = { top: `${top}%`, left: `${left}%` };
          } else {
            // 没有坐标时使用基于索引的位置分布
            const fallbackPositions = [
              { top: '25%', left: '30%' }, { top: '40%', left: '70%' },
              { top: '55%', left: '45%' }, { top: '70%', left: '25%' },
              { top: '35%', left: '50%' }, { top: '60%', left: '65%' },
              { top: '30%', left: '55%' }, { top: '45%', left: '35%' },
            ];
            position = fallbackPositions[index % fallbackPositions.length];
          }

          return {
            id: task._id || task.id || String(index),
            title: task.title,
            description: task.description || '',
            location: task.location?.name || '未知位置',
            distance: '计算中...',
            difficulty: difficultyMap[task.difficulty] || 'medium',
            category: 'explore', // 默认分类
            reward: task.difficulty * 20 || 50,
            image: getImageUrl(task.coverImageUrl) || 'https://via.placeholder.com/200',
            position,
            isHot: task.viewCount > 100,
            isNew: new Date(task.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天内
            coordinates: task.location?.coordinates, // 保存原始坐标供后续使用
          };
        });

        setMapTasks(convertedTasks);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const categories = [
    { id: 'all', label: '全部', icon: 'apps' },
    { id: 'explore', label: '探索', icon: 'explore' },
    { id: 'food', label: '美食', icon: 'restaurant' },
    { id: 'culture', label: '文化', icon: 'museum' },
    { id: 'sports', label: '运动', icon: 'directions_run' },
    { id: 'photo', label: '摄影', icon: 'photo_camera' },
  ];

  const filteredTasks = activeCategory === 'all'
    ? mapTasks
    : mapTasks.filter(task => task.category === activeCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '';
    }
  };

  // Loading 状态
  if (loading) {
    return (
      <div className="bg-slate-900 font-display text-white overflow-hidden h-screen w-full select-none relative flex flex-col">
        <header className="relative z-30 px-4 pt-10 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-white">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold flex-1">任务地图</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl text-[#0ea5e9] animate-spin">progress_activity</span>
            <p className="text-slate-400">加载任务中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 font-display text-white overflow-hidden h-screen w-full select-none relative flex flex-col">

      {/* Header */}
      <header className="relative z-30 px-4 pt-10 pb-4 bg-gradient-to-b from-slate-900 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold flex-1">任务地图</h1>
          <button className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur flex items-center justify-center hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-white">search</span>
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur flex items-center justify-center hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-white">filter_list</span>
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id
                ? 'bg-[#0ea5e9] text-white shadow-lg shadow-sky-500/30'
                : 'bg-slate-800/80 text-gray-300 hover:bg-slate-700'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Map Background */}
        <div className="absolute inset-0 bg-slate-800">
          <div className="w-full h-full opacity-40">
            <CapacitorImage
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBTQBSUtQdJV3t0bJhWF45L5ltIzZM1eH91q_-hPiYYW7eaiXFr-CLtSpovOo2DkBocEmyRcJNWoYCtESsEmNfGK2JR7juoZkqySZIS82U-X3-FJlW_ZN0RRtv1zmvcL2r3CsB7H-VP3UTSA5nog3nYcGE2G0jK_VcPkvRwTaWw_flLrQwEu96euxoZPPJEpoJaXwVoXZYhCDuEgrMLV2hyn5H36YhwCazKxm3pr0oyg3_mhvrdvgQpOXCxKJdNsjdut5BsGDSy2g"
              alt="Map Background"
              className="w-full h-full object-cover"
              style={{ filter: 'grayscale(0.5) brightness(0.6)' }}
            />
          </div>

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* User Location */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-4 h-4 bg-[#0ea5e9] rounded-full border-2 border-white shadow-lg shadow-sky-500/50"></div>
            <div className="absolute inset-0 w-4 h-4 bg-[#0ea5e9] rounded-full animate-ping opacity-75"></div>
          </div>
        </div>

        {/* Task Pins */}
        {filteredTasks.map((task) => (
          <button
            key={task.id}
            onClick={() => setSelectedTask(task)}
            className={`absolute z-20 transform -translate-x-1/2 -translate-y-full transition-all duration-300 ${selectedTask?.id === task.id ? 'scale-125 z-30' : 'hover:scale-110'
              }`}
            style={{ top: task.position.top, left: task.position.left }}
          >
            <div className="flex flex-col items-center">
              {(task.isHot || task.isNew) && (
                <div className={`mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${task.isHot ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                  }`}>
                  {task.isHot ? '热门' : '新'}
                </div>
              )}
              <div className={`w-12 h-12 rounded-full border-2 overflow-hidden shadow-lg ${selectedTask?.id === task.id
                ? 'border-[#0ea5e9] ring-4 ring-[#0ea5e9]/30'
                : 'border-white'
                }`}>
                <div className="w-full h-full relative">
                  <CapacitorImage
                    src={task.image}
                    alt={task.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white mt-[-1px]"></div>
            </div>
          </button>
        ))}

        {/* Right Controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <div className="flex flex-col bg-slate-800/90 backdrop-blur rounded-full overflow-hidden shadow-lg">
            <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10">
              <span className="material-symbols-outlined">add</span>
            </button>
            <div className="h-px bg-slate-600"></div>
            <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10">
              <span className="material-symbols-outlined">remove</span>
            </button>
          </div>
          <button className="w-10 h-10 bg-slate-800/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-[#0ea5e9] hover:bg-white/10">
            <span className="material-symbols-outlined">my_location</span>
          </button>
        </div>

        {/* Task Count Badge */}
        <div className="absolute left-4 bottom-4 z-20">
          <div className="bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0ea5e9] text-[20px]">location_on</span>
            <span className="text-sm font-medium">{filteredTasks.length} 个任务</span>
          </div>
        </div>
      </div>

      {/* Selected Task Card */}
      {selectedTask && (
        <div className="absolute bottom-0 left-0 right-0 z-40 p-4 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-slate-700">
            <div className="flex gap-4">
              {/* Task Image */}
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <div className="w-full h-full relative">
                  <CapacitorImage
                    src={selectedTask.image}
                    alt={selectedTask.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-lg text-white truncate pr-2">{selectedTask.title}</h3>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px] text-gray-400">close</span>
                  </button>
                </div>

                <p className="text-sm text-gray-400 line-clamp-2 mb-2">{selectedTask.description}</p>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-gray-400">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {selectedTask.distance}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-white ${getDifficultyColor(selectedTask.difficulty)}`}>
                    {getDifficultyLabel(selectedTask.difficulty)}
                  </span>
                  <span className="flex items-center gap-1 text-yellow-500">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                    +{selectedTask.reward}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => onTaskDetail?.(selectedTask.id)}
                className="flex-1 h-11 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">info</span>
                查看详情
              </button>
              <button
                onClick={() => onStartTask?.(selectedTask.id)}
                className="flex-1 h-11 rounded-xl bg-[#0ea5e9] text-white font-bold hover:bg-sky-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30"
              >
                <span className="material-symbols-outlined text-[20px]">play_circle</span>
                开始任务
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes slide-in-from-bottom {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in { animation: slide-in-from-bottom 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default TaskMapScreen;