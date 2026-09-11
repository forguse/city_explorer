import React, { useState, useEffect, useRef, useCallback } from 'react';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { task as taskApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';

interface MapScreenProps {
  onBack: () => void;
  onProfile: () => void;
  onHiddenReward?: () => void;
  onTaskSelect?: (taskId: string) => void;
}

const MapScreen: React.FC<MapScreenProps> = ({ onBack, onProfile, onHiddenReward, onTaskSelect }) => {
  const [isRaining, setIsRaining] = useState(true);
  const [activeFilter, setActiveFilter] = useState('indoor');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const filters = [
    { id: 'all', label: '全部', icon: 'apps' },
    { id: 'indoor', label: '室内优先', icon: 'roofing' },
    { id: 'nearby', label: '附近任务', icon: 'near_me' },
    { id: 'food', label: '美食', icon: 'restaurant' },
    { id: 'culture', label: '文化', icon: 'museum' }
  ];

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        // User requested "Exploration Mode" (All avail tasks), so we use getAll
        const response = await taskApi.getAll({ limit: 20 });
        const items = response.data;

        const tasksWithPos = items.map((t: any, index: number) => {
          // Infer type since backend Task model doesn't have it yet, or use difficulty
          let type = '探索任务';
          if (t.title.includes('食') || t.title.includes('菜')) type = '美食';
          else if (t.title.includes('馆') || t.title.includes('展')) type = '文化';

          return {
            id: t._id,
            title: t.title,
            type: type,
            image: getImageUrl(t.coverImageUrl) || 'https://via.placeholder.com/150',
            location: t.location?.name || '未知地点',
            // Deterministic random position based on ID or index
            position: {
              top: `${20 + (index * 13) % 60}%`,
              left: `${15 + (index * 17) % 70}%`
            },
            icon: getIconByType(type),
            typeFilter: getFilterByType(type)
          };
        });

        // Randomly shuffle and take max 6 tasks to avoid overcrowding
        const shuffled = tasksWithPos.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 6);

        setTasks(selected);
        if (selected.length > 0) {
          setSelectedTask(selected[0]);
        }
      } catch (error) {
        console.error('Failed to fetch map tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // LBS Discovery Logic
  useEffect(() => {
    // Check for nearby proverbs every 10 seconds (Simulated location change)
    const checkLBS = async () => {
      try {
        // Mock location varies slightly
        const lat = 31.2 + Math.random() * 0.01;
        const lng = 121.4 + Math.random() * 0.01;

        // Assume proverbApi is imported (will add import)
        // const res = await proverbApi.getLBS(lat, lng); 
        // Since we don't have real LBS logic on backend fully working with geo-index, 
        // we simulate a find here if random chance hits.

        if (Math.random() > 0.95) { // 5% chance every 10s
          // Found a proverb!
          // In real app, show a toast or a special marker
          console.log('Found LBS Proverb!');
          // Could set a state to show a "Message Bottle" icon on map
          // For now, let's just alert for demo purposes
          const sound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          sound.play().catch(() => { });
          // alert('你发现了一个漂流瓶！(LBS Demo)');
        }
      } catch (e) {
        console.error(e);
      }
    };
    const interval = setInterval(checkLBS, 10000);
    return () => clearInterval(interval);
  }, []);

  const getIconByType = (type: string) => {
    if (type.includes('食')) return 'restaurant';
    if (type.includes('文化')) return 'museum';
    if (type.includes('探索')) return 'park';
    return 'place';
  };

  const getFilterByType = (type: string) => {
    if (type.includes('食')) return 'food';
    if (type.includes('文化')) return 'culture';
    return 'outdoor';
  }

  const handleStart = () => {
    if (selectedTask && onTaskSelect) {
      onTaskSelect(selectedTask.id);
    }
  };

  const filteredTasks = activeFilter === 'all'
    ? tasks
    : tasks.filter(t => t.typeFilter === activeFilter || activeFilter === 'nearby'); // nearby shows all for now

  return (
    <div className="bg-[#0f172a] font-display text-white overflow-hidden h-screen w-full select-none relative">
      <div className="relative w-full h-full flex flex-col">

        {/* Map Layer */}
        <div className="absolute inset-0 z-0 bg-slate-900 overflow-hidden">
          <div className="w-full h-full transition-all duration-1000">
            <CapacitorImage
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBTQBSUtQdJV3t0bJhWF45L5ltIzZM1eH91q_-hPiYYW7eaiXFr-CLtSpovOo2DkBocEmyRcJNWoYCtESsEmNfGK2JR7juoZkqySZIS82U-X3-FJlW_ZN0RRtv1zmvcL2r3CsB7H-VP3UTSA5nog3nYcGE2G0jK_VcPkvRwTaWw_flLrQwEu96euxoZPPJEpoJaXwVoXZYhCDuEgrMLV2hyn5H36YhwCazKxm3pr0oyg3_mhvrdvgQpOXCxKJdNsjdut5BsGDSy2g"
              className="w-full h-full object-cover"
              style={{
                filter: 'brightness(0.4) contrast(1.3) hue-rotate(200deg) grayscale(0.4) saturate(1.1)'
              }}
              alt="Map Background"
            />
          </div>

          {isRaining && (
            <div className="rain-container">
              <div className="rain-layer"></div>
            </div>
          )}

          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-slate-900 via-slate-900/60 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent pointer-events-none"></div>

          {/* User Location */}
          <div className="absolute top-[45%] left-[48%] flex items-center justify-center">
            <div className="relative w-4 h-4 bg-[#16a34a] rounded-full border-2 border-white shadow-[0_0_15px_rgba(22,163,74,0.8)] z-10"></div>
            <div className="pulse-ring"></div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="text-white font-bold">加载地图任务中...</div>
            </div>
          )}

          {/* Pins */}
          {!loading && filteredTasks.map((pin) => (
            <React.Fragment key={pin.id}>
              <button
                onClick={() => setSelectedTask(pin)}
                className={`absolute group transform transition-transform hover:scale-110 active:scale-95 z-10 ${selectedTask?.id === pin.id ? 'scale-125 z-20' : ''}`}
                style={{ top: pin.position.top, left: pin.position.left }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 border text-white rounded-full flex items-center justify-center shadow-lg mb-1 relative overflow-hidden transition-colors ${selectedTask?.id === pin.id
                      ? 'bg-[#16a34a] border-white shadow-[#16a34a]/40'
                      : 'bg-slate-800 border-[#16a34a]/50 text-[#16a34a]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">{pin.icon}</span>
                  </div>
                  {selectedTask?.id === pin.id && (
                    <div className="w-2 h-2 bg-[#16a34a] rounded-full shadow-[0_0_10px_rgba(22,163,74,1)]"></div>
                  )}
                </div>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Top Controls */}
        <div className="absolute top-0 left-0 w-full z-20 px-4 pt-safe flex flex-col gap-3 pointer-events-none" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 2.5rem)' }}>
          {isRaining && (
            <div className="self-center pointer-events-auto animate-in fade-in zoom-in duration-500">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-white px-4 py-2 rounded-full shadow-lg">
                <span className="material-symbols-outlined text-green-400 text-[20px]">rainy</span>
                <span className="text-xs font-medium tracking-wide text-sky-50">正在下雨！已为你高亮室内探险任务</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 w-full pointer-events-auto">
            <div className="flex-1 h-12 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full shadow-lg flex items-center px-2">
              <div className="w-10 h-10 flex items-center justify-center text-gray-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input className="bg-transparent border-none outline-none flex-1 text-sm text-white placeholder-gray-400 focus:ring-0 h-full" placeholder="搜索城市或任务..." type="text" />
              <button className="w-10 h-10 flex items-center justify-center text-gray-400 rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">mic</span>
              </button>
            </div>
            <button
              onClick={onBack}
              className="h-12 w-12 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">format_list_bulleted</span>
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto pb-2 pl-1">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full shadow-sm text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === filter.id
                  ? 'bg-[#16a34a] text-slate-900 shadow-lg shadow-green-600/30 font-bold'
                  : 'bg-slate-800/80 backdrop-blur border border-slate-700/50 text-gray-300 hover:bg-slate-700'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 items-end pointer-events-auto">
          <div className="flex flex-col gap-px bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full shadow-lg overflow-hidden">
            <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20"><span className="material-symbols-outlined">add</span></button>
            <div className="h-px w-full bg-slate-600"></div>
            <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20"><span className="material-symbols-outlined">remove</span></button>
          </div>
          <button className="w-10 h-10 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full shadow-lg flex items-center justify-center text-[#16a34a] hover:bg-white/10 active:scale-95 transition-all">
            <span className="material-symbols-outlined">my_location</span>
          </button>
          <button
            onClick={() => {
              if (onHiddenReward) onHiddenReward();
            }}
            className="w-10 h-10 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">layers</span>
          </button>
        </div>

        {/* Bottom Card */}
        {selectedTask && (
          <div className="absolute bottom-[80px] left-0 w-full z-30 px-4 pb-4 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-slate-700">
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-orange-900/50 border border-orange-500/30 text-orange-400 text-[10px] font-bold tracking-wide uppercase">Popular</span>
                      <span className="text-gray-400 text-xs">500m</span>
                    </div>
                    <h2 className="text-xl font-bold text-white leading-tight mb-2 line-clamp-1">{selectedTask.title}</h2>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <div className="flex items-center text-yellow-500">
                        {[1, 2, 3].map((n) => (
                          <span key={n} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        ))}
                      </div>
                      <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                      <span>{selectedTask.type}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleStart}
                      className="w-full bg-[#16a34a] hover:bg-green-500 text-slate-900 rounded-full h-11 flex items-center justify-center gap-2 font-bold shadow-lg shadow-green-600/20 transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[20px]">play_circle</span>
                      开始挑战
                    </button>
                  </div>
                </div>
                <div className="w-28 h-36 shrink-0 rounded-2xl bg-gray-700 overflow-hidden relative shadow-inner border border-slate-600">
                  <div className="absolute inset-0 transition-transform hover:scale-110 duration-500">
                    <CapacitorImage
                      src={getImageUrl(selectedTask.image) || 'https://via.placeholder.com/150'}
                      alt={selectedTask.title}
                      className="w-full h-full object-cover"
                      style={{ filter: 'brightness(0.9)' }}
                    />
                  </div>
                  <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-white text-[14px]">favorite</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State if no tasks */}
        {!loading && filteredTasks.length === 0 && (
          <div className="absolute bottom-[200px] left-0 w-full text-center pointer-events-none">
            <div className="bg-slate-900/80 inline-block px-4 py-2 rounded-full backdrop-blur-md border border-slate-700/50 text-gray-400">
              暂无符合条件的任务
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="absolute bottom-0 left-0 w-full h-[80px] bg-slate-900 border-t border-slate-800 z-40 flex justify-around items-start pt-3 pb-safe">
          <button className="flex flex-col items-center gap-1 w-16 group cursor-pointer">
            <div className="w-12 h-8 rounded-full flex items-center justify-center bg-[#16a34a]/20 text-[#16a34a] transition-colors">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
            </div>
            <span className="text-[10px] font-medium text-[#16a34a]">探索</span>
          </button>
          <button className="flex flex-col items-center gap-1 w-16 group">
            <div className="w-12 h-8 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[24px]">leaderboard</span>
            </div>
            <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300">排行榜</span>
          </button>
          <button onClick={onProfile} className="flex flex-col items-center gap-1 w-16 group">
            <div className="w-12 h-8 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[24px]">person</span>
            </div>
            <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300">我的</span>
          </button>
        </div>

      </div>

      <style>{`
        .pin-bounce {
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .pulse-ring {
          display: block; position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%); width: 100%; height: 100%;
          border-radius: 50%; border: 2px solid #22c55e; box-sizing: border-box;
          animation: pulsate 2s ease-out infinite; opacity: 0.0;
        }
        @keyframes pulsate {
          0% { transform: translate(-50%, -50%) scale(0.1, 0.1); opacity: 0.0; }
          50% { opacity: 1.0; }
          100% { transform: translate(-50%, -50%) scale(2.2, 2.2); opacity: 0.0; }
        }

        /* Rain Effect */
        .rain-container {
          position: absolute; inset: 0; z-index: 5; pointer-events: none; overflow: hidden;
        }
        .rain-layer {
          position: absolute; width: 150%; height: 150%; top: -25%; left: -25%;
          background-image: repeating-linear-gradient(105deg, transparent 0, transparent 15px, rgba(255, 255, 255, 0.1) 15px, rgba(255, 255, 255, 0.18) 16px);
          animation: rain-fall 0.4s linear infinite; opacity: 0.7; mix-blend-mode: screen;
        }
        @keyframes rain-fall {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-15px, 30px); }
        }

        .indoor-highlight {
          animation: indoor-pulse 2s infinite;
        }
        @keyframes indoor-pulse {
          0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(56, 189, 248, 0); }
          100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
        }

        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
      `}</style>
    </div>
  );
};

export default MapScreen;