import React, { useState, useEffect } from 'react';
import { task as taskApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ExplorationBlindBoxProps {
    currentCity: string;
    onTaskVerify: (id: string) => void;
}

const ExplorationBlindBox: React.FC<ExplorationBlindBoxProps> = ({ currentCity, onTaskVerify }) => {
    const [loading, setLoading] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [resultTask, setResultTask] = useState<any>(null);
    const [dailyTask, setDailyTask] = useState<any>(null);

    // Check for daily saved task on mount
    useEffect(() => {
        const today = new Date().toDateString();
        const saved = localStorage.getItem(`daily_blind_box_${today}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Validate that the saved data has required fields
                if (parsed && parsed._id && parsed.title) {
                    setDailyTask(parsed);
                    // Also preload image
                    if (parsed.coverImageUrl) {
                        const img = new Image();
                        img.src = getImageUrl(parsed.coverImageUrl);
                    }
                } else {
                    // Invalid data format, clear it
                    console.warn("Invalid daily task data, clearing cache");
                    localStorage.removeItem(`daily_blind_box_${today}`);
                }
            } catch (e) {
                console.error("Failed to parse saved daily task", e);
                localStorage.removeItem(`daily_blind_box_${today}`);
            }
        }
    }, []);

    const handleDraw = async () => {
        if (loading || dailyTask) {
            if (dailyTask) {
                setResultTask(dailyTask);
                setShowResult(true);
            }
            return;
        }

        setLoading(true);
        try {
            const res = await taskApi.getRandomTask(currentCity);
            if (res.data) {
                // Preload image for smoother reveal
                if (res.data.coverImageUrl) {
                    const img = new Image();
                    img.src = getImageUrl(res.data.coverImageUrl);
                }

                // Add a small artificial delay for headers/suspense if api is too fast
                setTimeout(() => {
                    const taskData = res.data;
                    setResultTask(taskData);
                    setDailyTask(taskData);

                    // Save to local storage
                    const today = new Date().toDateString();
                    localStorage.setItem(`daily_blind_box_${today}`, JSON.stringify(taskData));

                    setShowResult(true);
                    setLoading(false);
                }, 800);
            } else {
                alert(`在${currentCity}暂时没有找到合适的奇遇，试试切换到"不限"或其他城市？`);
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to draw random task:', error);
            alert('探索雷达似乎有些干扰，请稍后再试');
            setLoading(false);
        }
    };

    const handleClose = () => {
        setShowResult(false);
        setResultTask(null);
    };

    const handleGo = () => {
        const target = resultTask || dailyTask;
        if (target) {
            onTaskVerify(target._id);
            handleClose();
        }
    };

    // Determine background style
    // Determine background style - Cleaned up


    return (
        <>
            {/* Blind Box Card */}
            <section className="px-4 pt-4">
                <div
                    onClick={handleDraw}
                    className="relative w-full h-48 rounded-2xl overflow-hidden shadow-lg shadow-green-900/20 group cursor-pointer active:scale-95 transition-all duration-300 ring-1 ring-black/5"
                >
                    {/* Background */}
                    {dailyTask ? (
                        <>
                            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                                {dailyTask?.coverImageUrl && (
                                    <CapacitorImage
                                        src={getImageUrl(dailyTask.coverImageUrl)}
                                        className="w-full h-full object-cover"
                                        alt="Background"
                                    />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#6ee7b7] via-[#059669] to-[#022c22] animate-gradient-xy"></div>
                    )}

                    {/* Decorative shapes (only if no daily task) */}
                    {!dailyTask && (
                        <>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:translate-x-5 transition-transform duration-700"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl transform -translate-x-10 translate-y-10 group-hover:translate-x-0 transition-transform duration-700"></div>
                        </>
                    )}

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between p-6 text-white z-10">
                        <div className="flex justify-between items-start">
                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-white/20">
                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                {currentCity}
                            </div>
                            {!dailyTask && (
                                <span className="material-symbols-outlined opacity-50 text-[48px] absolute top-2 right-4 rotate-12 group-hover:rotate-45 transition-transform duration-500">
                                    mystery
                                </span>
                            )}
                        </div>

                        <div>
                            <h2 className="text-3xl font-black mb-1 tracking-tight drop-shadow-md line-clamp-1">
                                {dailyTask ? dailyTask.title : (loading ? '正在寻宝...' : '探索盲盒')}
                            </h2>
                            <p className="text-white/90 text-sm font-medium mb-4 line-clamp-1">
                                {dailyTask ? '今日奇遇已锁定，点击查看详情' : (loading ? '命运指引中' : '点击开启今日份的城市奇遇')}
                            </p>

                            {dailyTask ? (
                                <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">verified</span>
                                    已查收 (明天再来)
                                </button>
                            ) : (
                                <button className={`bg-white text-[#059669] px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all ${loading ? 'opacity-80' : 'group-hover:scale-105 group-hover:shadow-white/25'}`}>
                                    {loading ? (
                                        <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">casino</span>
                                    )}
                                    {loading ? '雷达扫描中...' : '立即抽取'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Result Modal */}
            {showResult && resultTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
                    <div className="bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-300 relative">

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>

                        {/* Image */}
                        <div className="h-48 w-full bg-gray-200 relative">
                            {resultTask.coverImageUrl ? (
                                <CapacitorImage src={getImageUrl(resultTask.coverImageUrl)} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#10b981] text-white">
                                    <span className="material-symbols-outlined text-[48px]">flag</span>
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 text-white">
                                <div className="flex items-center gap-2 text-xs font-bold opacity-90 mb-1">
                                    <span className="bg-[#16a34a] px-1.5 py-0.5 rounded">推荐</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h3 className="text-xl font-bold dark:text-white mb-2 line-clamp-1">{resultTask.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
                                {resultTask.description}
                            </p>

                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                        <CapacitorImage
                                            src={getImageUrl(resultTask.author?.avatarUrl)}
                                            className="w-full h-full object-cover"
                                            alt={resultTask.author?.username || 'User'}
                                        />
                                    </div>
                                    <div className="text-xs">
                                        <div className="font-bold dark:text-gray-200">{resultTask.author?.username || '神秘人'}</div>
                                        <div className="text-gray-400">任务作者</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleGo}
                                className="w-full bg-[#16a34a] text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-green-500/30 hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <span>去探索</span>
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ExplorationBlindBox;
