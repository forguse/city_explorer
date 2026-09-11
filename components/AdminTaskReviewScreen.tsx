import React from 'react';

interface AdminTaskReviewScreenProps {
    onBack: () => void;
}

const AdminTaskReviewScreen: React.FC<AdminTaskReviewScreenProps> = ({ onBack }) => {
    return (
        <div className="h-full w-full bg-[#f8f7f5] dark:bg-[#101322] flex flex-col">
            <div className="flex items-center p-4 bg-white dark:bg-[#1c2136] shadow-sm">
                <button onClick={onBack} className="mr-4">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">审核中心</h1>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl mb-4">gavel</span>
                    <p>审核功能开发中...</p>
                </div>
            </div>
        </div>
    );
};

export default AdminTaskReviewScreen;
