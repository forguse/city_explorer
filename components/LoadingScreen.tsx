import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onBack: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const skeletonItems = [0, 100, 200, 300, 400];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      console.log('数据加载完成');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-[#f6f8f8] dark:bg-[#10221f] font-display text-white overflow-hidden antialiased selection:bg-[#13ecc8] selection:text-[#10221f] h-screen w-full relative flex flex-col transition-colors duration-300">
      
      <header className="flex items-center bg-[#f6f8f8] dark:bg-[#10221f] p-4 pb-2 justify-between z-20 relative">
        <button 
          onClick={onBack} 
          className="text-gray-800 dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
          任务广场
        </h2>
      </header>

      <main className="flex-1 overflow-y-auto relative p-4 space-y-4 no-scrollbar">
        
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-[#10221f]/60 to-[#10221f]/90 backdrop-blur-[2px] animate-in fade-in duration-300">
            
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full bg-[#13ecc8]/20 blur-xl animate-pulse"></div>
              <span 
                className="material-symbols-outlined text-[#13ecc8] text-6xl animate-spin-slow drop-shadow-[0_0_15px_rgba(19,236,200,0.5)]" 
                style={{ fontSize: '64px', fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                explore
              </span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <p className="text-[#13ecc8] text-lg font-bold tracking-wide animate-pulse">正在校准指南针...</p>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#13ecc8]/40 animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#13ecc8]/40 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#13ecc8]/40 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
              <p className="text-gray-400 text-xs font-normal mt-2 opacity-70">寻找附近的探险任务</p>
            </div>

          </div>
        )}

        {skeletonItems.map((delay, index) => (
          <div 
            key={index}
            className={`p-4 rounded-xl bg-[rgba(22,43,40,0.5)] border border-white/5 ${index === skeletonItems.length - 1 ? 'opacity-50' : ''}`}
          >
            <div className="flex items-stretch justify-between gap-4">
              <div className="flex flex-col gap-3 flex-[2_2_0px] justify-center">
                <div 
                  className="h-5 w-3/4 bg-white/10 rounded animate-pulse" 
                  style={{ animationDelay: `${delay}ms` }}
                ></div>
                <div 
                  className="h-4 w-1/2 bg-white/5 rounded animate-pulse" 
                  style={{ animationDelay: `${delay}ms` }}
                ></div>
                <div className="flex gap-2 mt-2">
                  <div className="h-6 w-12 bg-white/5 rounded-full animate-pulse"></div>
                  <div className="h-6 w-16 bg-white/5 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div 
                className="w-24 h-24 bg-white/5 rounded-lg flex-shrink-0 animate-pulse bg-gradient-to-br from-white/5 to-white/10" 
                style={{ animationDelay: `${delay}ms` }}
              ></div>
            </div>
          </div>
        ))}

        {!isLoading && (
          <div className="absolute inset-0 p-4 bg-[#10221f] z-20 flex items-center justify-center animate-in fade-in zoom-in-95 duration-300">
            <p className="text-gray-400 font-medium">内容加载完毕 (Content Loaded)</p>
          </div>
        )}

      </main>

      <div className="h-20 border-t border-white/5 bg-[#f6f8f8] dark:bg-[#10221f] flex justify-around items-center px-6 shrink-0 transition-colors duration-300">
        <div className="flex flex-col items-center gap-1 opacity-50">
          <span className="material-symbols-outlined text-gray-400">home</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="material-symbols-outlined text-[#13ecc8] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
          <span className="text-[10px] text-[#13ecc8] font-medium">广场</span>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50">
          <span className="material-symbols-outlined text-gray-400">person</span>
        </div>
      </div>

      <style>{`
        .animate-spin-slow {
          animation: spin 4s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};

export default LoadingScreen;
