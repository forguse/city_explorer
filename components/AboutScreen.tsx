
import React from 'react';

interface AboutScreenProps {
    onBack: () => void;
    onUserAgreement: () => void;
    onPrivacyPolicy: () => void;
}

const AboutScreen: React.FC<AboutScreenProps> = ({ onBack, onUserAgreement, onPrivacyPolicy }) => {
    // 模拟公告数据，实际开发中建议从后端获取
    const announcements = [
        {
            id: 1,
            title: "内测版本 v1.0.0 正式发布",
            date: "2026-01-26",
            content: "欢迎来到线旅 (LineTrip)！这是我们的第一个内测版本。如果您在探索过程中遇到任何 bug，欢迎在设置页面的“反馈与申诉”中告诉我们。"
        },
        {
            id: 2,
            title: "关于数据安全的说明",
            date: "2026-01-25",
            content: "我们会严格保护您的隐私安全。内测期间可能会不定期进行数据维护，请知悉。"
        }
    ];

    return (
        <div className="bg-[#f8f7f5] dark:bg-[#101322] min-h-screen w-full flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <div className="sticky top-0 w-full z-30 bg-[#f8f7f5]/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-gray-200 dark:border-[#2d3555]">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto w-full">
                    <button
                        onClick={onBack}
                        className="text-gray-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-[#1c2136] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
                    </button>
                    <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">关于线旅</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full max-w-md mx-auto px-6 py-8 pb-20 custom-scrollbar">

                {/* Logo & Version */}
                <div className="flex flex-col items-center justify-center mb-10">
                    <div className="size-24 rounded-3xl shadow-xl shadow-blue-500/20 flex items-center justify-center mb-4 transform hover:scale-105 transition-transform duration-500 overflow-hidden">
                        <img src="/images/logo.png" alt="LineTrip Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">LineTrip</h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-mono tracking-wide">Version 1.0.0 (Beta)</p>
                </div>

                {/* Bulletin Board */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-blue-500">campaign</span>
                        <h3 className="text-gray-900 dark:text-white text-lg font-bold">最新公告</h3>
                    </div>

                    <div className="space-y-4">
                        {announcements.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-[#1c2136] p-5 rounded-2xl border border-gray-100 dark:border-[#2d3555] shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-gray-900 dark:text-white font-bold text-base leading-snug">{item.title}</h4>
                                    <span className="text-xs text-gray-400 font-mono shrink-0 ml-2 mt-0.5">{item.date}</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed text-justify">
                                    {item.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Technical Support / Contact */}
                <div className="mb-12">
                    <h3 className="text-gray-900 dark:text-white text-sm font-bold uppercase tracking-wider mb-3 opacity-60">联系与支持</h3>
                    <div className="bg-white dark:bg-[#1c2136] rounded-xl overflow-hidden border border-gray-100 dark:border-[#2d3555]">
                        <div className="p-4 flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-200 text-sm">问题反馈</span>
                            <span className="text-gray-400 text-sm">请使用应用内反馈中心</span>
                        </div>
                    </div>
                </div>

                {/* Open Source Licenses */}
                <div className="mb-12">
                    <h3 className="text-gray-900 dark:text-white text-sm font-bold uppercase tracking-wider mb-3 opacity-60">开源许可声明 (Licenses)</h3>
                    <div className="bg-white dark:bg-[#1c2136] rounded-xl overflow-hidden border border-gray-100 dark:border-[#2d3555] p-5 space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-gray-400 text-lg">font_download</span>
                                <p className="text-gray-900 dark:text-white text-sm font-bold">字体 (Fonts)</p>
                            </div>
                            <div className="pl-7 space-y-1">
                                <p className="text-gray-500 text-xs">Plus Jakarta Sans <span className="text-gray-300 mx-1">|</span> <span className="font-mono text-blue-500">SIL OFL 1.1</span></p>
                                <p className="text-gray-500 text-xs">Noto Sans SC <span className="text-gray-300 mx-1">|</span> <span className="font-mono text-blue-500">SIL OFL 1.1</span></p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-[#2d3555]/50 pt-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-gray-400 text-lg">extension</span>
                                <p className="text-gray-900 dark:text-white text-sm font-bold">图标 (Icons)</p>
                            </div>
                            <div className="pl-7 space-y-1">
                                <p className="text-gray-500 text-xs">Material Symbols <span className="text-gray-300 mx-1">|</span> <span className="font-mono text-blue-500">Apache 2.0</span></p>
                                <p className="text-gray-500 text-xs">Lucide React <span className="text-gray-300 mx-1">|</span> <span className="font-mono text-blue-500">ISC License</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legal Links Footer */}
                <div className="mt-auto pt-8 border-t border-gray-200 dark:border-[#2d3555] text-center">
                    <p className="text-gray-400 text-xs mb-3">
                        Copyright © 2026 LineTrip Team. All Rights Reserved.
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>阅读并同意</span>
                        <button
                            onClick={onUserAgreement}
                            className="font-bold hover:text-blue-500 dark:hover:text-blue-400 transition-colors underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600"
                        >
                            用户协议
                        </button>
                        <span>与</span>
                        <button
                            onClick={onPrivacyPolicy}
                            className="font-bold hover:text-blue-500 dark:hover:text-blue-400 transition-colors underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600"
                        >
                            隐私政策
                        </button>
                    </div>
                </div>

            </div>
        </div >
    );
};

export default AboutScreen;
