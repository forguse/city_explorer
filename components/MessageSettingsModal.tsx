import React, { useEffect, useState } from 'react';
import { user } from '../services/api';

interface MessageSettingsModalProps {
    onClose: () => void;
}

export default function MessageSettingsModal({ onClose }: MessageSettingsModalProps) {
    const [settings, setSettings] = useState({
        like: true,
        comment: true,
        invite: true,
        friend_request: true,
        task_invite: true,
        task_approved: true,
        task_rejected: true,
        task_removed: true,
        task_milestone: true,
        post_approved: true,
        post_rejected: true,
        post_removed: true,
        report_approved: true,
        report_rejected: true,
        self_task_completed: true,
        friend_accepted: true,
        system: true, // Keep for backward compatibility
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await user.getMe(); // Correct API method
            if (res.data.preferences?.notificationSettings) {
                setSettings(res.data.preferences.notificationSettings);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key: keyof typeof settings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);

        // Save to server
        try {
            // We need to support updating nested preferences. 
            // The API might need to handle merging.
            // Assuming userController.updateMyProfile handles deep merge or we send full structure
            await user.updateMe({
                preferences: {
                    notificationSettings: newSettings
                }
            });
        } catch (error) {
            console.error('Failed to save settings', error);
            // Revert on error?
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">消息通知设置</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="py-8 text-center text-slate-400 text-sm">加载中...</div>
                    ) : (
                        <>
                            {/* 社交互动 */}
                            <div>
                                <div className="text-xs font-bold text-slate-400 mb-2 px-3">社交互动</div>
                                <ToggleItem
                                    label="收到点赞"
                                    desc="当有人点赞你的内容时"
                                    checked={settings.like}
                                    onChange={() => handleToggle('like')}
                                    icon="favorite"
                                    color="text-rose-500"
                                />
                                <ToggleItem
                                    label="收到评论"
                                    desc="当有人评论你的内容时"
                                    checked={settings.comment}
                                    onChange={() => handleToggle('comment')}
                                    icon="chat_bubble"
                                    color="text-emerald-500"
                                />
                                <ToggleItem
                                    label="好友请求"
                                    desc="收到好友申请时"
                                    checked={settings.friend_request}
                                    onChange={() => handleToggle('friend_request')}
                                    icon="person_add"
                                    color="text-purple-500"
                                />
                                <ToggleItem
                                    label="好友接受"
                                    desc="对方接受你的好友请求时"
                                    checked={settings.friend_accepted}
                                    onChange={() => handleToggle('friend_accepted')}
                                    icon="check_circle"
                                    color="text-green-500"
                                />
                                <ToggleItem
                                    label="任务邀请"
                                    desc="收到任务同行邀请时"
                                    checked={settings.task_invite}
                                    onChange={() => handleToggle('task_invite')}
                                    icon="group_add"
                                    color="text-blue-500"
                                />
                                <ToggleItem
                                    label="其他邀请"
                                    desc="社团或活动邀请"
                                    checked={settings.invite}
                                    onChange={() => handleToggle('invite')}
                                    icon="mail"
                                    color="text-indigo-500"
                                />
                            </div>

                            {/* 任务相关 */}
                            <div>
                                <div className="text-xs font-bold text-slate-400 mb-2 px-3">任务相关</div>
                                <ToggleItem
                                    label="任务审核通过"
                                    desc="你发布的任务通过审核"
                                    checked={settings.task_approved}
                                    onChange={() => handleToggle('task_approved')}
                                    icon="check_circle"
                                    color="text-green-500"
                                />
                                <ToggleItem
                                    label="任务审核拒绝"
                                    desc="你发布的任务未通过审核"
                                    checked={settings.task_rejected}
                                    onChange={() => handleToggle('task_rejected')}
                                    icon="cancel"
                                    color="text-red-500"
                                />
                                <ToggleItem
                                    label="任务被下架"
                                    desc="你的任务因举报被下架"
                                    checked={settings.task_removed}
                                    onChange={() => handleToggle('task_removed')}
                                    icon="delete"
                                    color="text-red-500"
                                />
                                <ToggleItem
                                    label="任务里程碑"
                                    desc="你的任务达到完成人数里程碑"
                                    checked={settings.task_milestone}
                                    onChange={() => handleToggle('task_milestone')}
                                    icon="emoji_events"
                                    color="text-yellow-500"
                                />
                                <ToggleItem
                                    label="完成任务"
                                    desc="你完成任务时的通知"
                                    checked={settings.self_task_completed}
                                    onChange={() => handleToggle('self_task_completed')}
                                    icon="celebration"
                                    color="text-purple-500"
                                />
                            </div>

                            {/* 帖子相关 */}
                            <div>
                                <div className="text-xs font-bold text-slate-400 mb-2 px-3">帖子相关</div>
                                <ToggleItem
                                    label="帖子审核通过"
                                    desc="你发布的帖子通过审核"
                                    checked={settings.post_approved}
                                    onChange={() => handleToggle('post_approved')}
                                    icon="check_circle"
                                    color="text-green-500"
                                />
                                <ToggleItem
                                    label="帖子审核拒绝"
                                    desc="你发布的帖子未通过审核"
                                    checked={settings.post_rejected}
                                    onChange={() => handleToggle('post_rejected')}
                                    icon="cancel"
                                    color="text-red-500"
                                />
                                <ToggleItem
                                    label="帖子被下架"
                                    desc="你的帖子因举报被下架"
                                    checked={settings.post_removed}
                                    onChange={() => handleToggle('post_removed')}
                                    icon="delete"
                                    color="text-red-500"
                                />
                            </div>

                            {/* 举报相关 */}
                            <div>
                                <div className="text-xs font-bold text-slate-400 mb-2 px-3">举报相关</div>
                                <ToggleItem
                                    label="举报被接受"
                                    desc="你的举报已被处理"
                                    checked={settings.report_approved}
                                    onChange={() => handleToggle('report_approved')}
                                    icon="gavel"
                                    color="text-blue-500"
                                />
                                <ToggleItem
                                    label="举报被驳回"
                                    desc="你的举报未通过审核"
                                    checked={settings.report_rejected}
                                    onChange={() => handleToggle('report_rejected')}
                                    icon="gavel"
                                    color="text-gray-500"
                                />
                            </div>

                            {/* 系统通知（向后兼容） */}
                            <div>
                                <div className="text-xs font-bold text-slate-400 mb-2 px-3">其他</div>
                                <ToggleItem
                                    label="系统通知"
                                    desc="重要公告和其他通知"
                                    checked={settings.system}
                                    onChange={() => handleToggle('system')}
                                    icon="notifications"
                                    color="text-amber-500"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button onClick={onClose} className="text-[#13a4ec] font-bold text-sm">
                        完成
                    </button>
                </div>
            </div>
        </div>
    );
}

function ToggleItem({ label, desc, checked, onChange, icon, color }: any) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-slate-100 ${color}`}>
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>
                <div>
                    <div className="text-slate-800 font-bold text-[14px]">{label}</div>
                    <div className="text-slate-400 text-[11px]">{desc}</div>
                </div>
            </div>
            <button
                onClick={onChange}
                className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${checked ? 'bg-[#13a4ec]' : 'bg-slate-200'}`}
            >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${checked ? 'translate-x-5' : ''}`}></div>
            </button>
        </div>
    )
}
