import React, { useState, useEffect } from 'react';
import { task as taskApi, execution as executionApi, user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface TaskSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (task: any) => void;
    fixedTab?: TabType; // If provided, locks the modal to this tab
}

type TabType = 'created' | 'completed' | 'saved';

const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({ visible, onClose, onSelect, fixedTab }) => {
    const [activeTab, setActiveTab] = useState<TabType>(fixedTab || 'created');
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Get current user ID (assuming stored in localStorage for now, ideally passed via context)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (visible) {
            if (fixedTab) setActiveTab(fixedTab);
            else if (!tasks.length) setActiveTab('created'); // Reset if re-opening

            if (currentUser.id) fetchTasks();
        }
    }, [visible, activeTab]);

    const fetchTasks = async () => {
        setLoading(true);
        setTasks([]);
        try {
            let data = [];
            if (activeTab === 'created') {
                const res = await userApi.getTasks(currentUser.id);
                data = res.data.map((t: any) => ({
                    id: t._id,
                    title: t.title,
                    image: getImageUrl(t.coverImageUrl),
                    desc: '发布的任务'
                }));
            } else if (activeTab === 'completed') {
                const res = await userApi.getCompletions(currentUser.id);
                data = res.data.map((exec: any) => ({
                    id: exec.task._id, // Use Master Task ID
                    title: exec.task.title,
                    image: getImageUrl(exec.task.coverImageUrl),
                    desc: `完成于 ${new Date(exec.completedAt).toLocaleDateString()}`
                }));
            } else if (activeTab === 'saved') {
                const res = await userApi.getSavedTasks();
                data = res.data.map((t: any) => ({
                    id: t._id,
                    title: t.title,
                    image: getImageUrl(t.coverImageUrl),
                    desc: '收藏的任务'
                }));
            }
            setTasks(data);
        } catch (error) {
            console.error('Failed to fetch tasks for modal', error);
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end max-w-md mx-auto">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            ></div>

            <div className="relative w-full bg-white dark:bg-[#1e1e1e] rounded-t-[32px] shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom duration-300">

                {/* Handle Bar */}
                <div className="flex justify-center pt-3 pb-2" onClick={onClose}>
                    <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></div>
                </div>

                {/* Title */}
                <div className="px-6 pb-2">
                    <h3 className="text-lg font-bold text-center">关联任务</h3>
                </div>

                {/* Tabs (Hide if fixedTab is set) */}
                {!fixedTab && (
                    <div className="flex border-b border-gray-100 dark:border-gray-800 px-4">
                        <button
                            onClick={() => setActiveTab('created')}
                            className={`flex-1 py-3 text-sm font-bold relative ${activeTab === 'created' ? 'text-[#0ea5e9]' : 'text-gray-500'}`}
                        >
                            我发布的
                            {activeTab === 'created' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#0ea5e9] rounded-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`flex-1 py-3 text-sm font-bold relative ${activeTab === 'completed' ? 'text-[#0ea5e9]' : 'text-gray-500'}`}
                        >
                            我完成的
                            {activeTab === 'completed' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#0ea5e9] rounded-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('saved')}
                            className={`flex-1 py-3 text-sm font-bold relative ${activeTab === 'saved' ? 'text-[#0ea5e9]' : 'text-gray-500'}`}
                        >
                            我收藏的
                            {activeTab === 'saved' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#0ea5e9] rounded-full"></div>}
                        </button>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-6 h-6 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">assignment_late</span>
                            <p className="text-sm">没有找到相关任务</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {tasks.map((task, idx) => (
                                <div
                                    key={`${task.id}-${idx}`}
                                    onClick={() => onSelect(task)}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-gray-200 shrink-0 overflow-hidden">
                                        <CapacitorImage
                                            src={task.image}
                                            alt={task.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{task.title}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.desc}</p>
                                    </div>
                                    <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-sm text-transparent">check</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskSelectionModal;
