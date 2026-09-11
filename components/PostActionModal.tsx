import React from 'react';

interface PostActionModalProps {
    visible: boolean;
    onClose: () => void;
    isOwner: boolean;
    onDelete: () => void;
    onReport: () => void;
}

const PostActionModal: React.FC<PostActionModalProps> = ({ visible, onClose, isOwner, onDelete, onReport }) => {
    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-center mb-6" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full cursor-pointer"></div>
                </div>

                <div className="flex flex-col gap-3">
                    {/* 举报选项 (所有人可见) */}
                    <button
                        onClick={() => { onReport(); onClose(); }}
                        className="w-full py-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined">flag</span>
                        举报帖子
                    </button>

                    {/* 删除选项 (仅作者可见) */}
                    {isOwner && (
                        <button
                            onClick={() => { onDelete(); onClose(); }}
                            className="w-full py-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined">delete</span>
                            删除帖子
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-gray-500 font-bold text-lg mt-2"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostActionModal;
