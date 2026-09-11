import React, { useState, useEffect } from 'react';
import { utils, task } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface ClipboardDetectScreenProps {
  onBack: () => void;
  onImport: (task?: any) => void;
}

interface ParsedTrip {
  type: 'train' | 'flight' | 'other';
  code: string;
  from: string;
  to: string;
  date: string;
  weekday: string;
  parsed: boolean;
  rawText?: string;
}

const ClipboardDetectScreen: React.FC<ClipboardDetectScreenProps> = ({ onBack, onImport }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedTrip, setDetectedTrip] = useState<ParsedTrip | null>(null);

  // Read clipboard and parse on mount
  useEffect(() => {
    const detectClipboard = async () => {
      setLoading(true);
      setError(null);

      try {
        // Read clipboard
        const clipboardText = await navigator.clipboard.readText();

        if (!clipboardText || clipboardText.trim().length < 5) {
          setError('剪贴板为空或内容不足');
          setLoading(false);
          return;
        }

        // Send to backend for parsing
        const response = await utils.parseTrip(clipboardText);
        const parsed = response.data as ParsedTrip;

        if (parsed.parsed) {
          setDetectedTrip(parsed);
          setShowModal(true);
        } else {
          setError('未能识别有效的行程信息');
        }
      } catch (err: any) {
        console.error('Clipboard detection failed:', err);
        if (err.name === 'NotAllowedError') {
          setError('请授予剪贴板访问权限');
        } else if (err.response?.status === 401) {
          setError('请先登录');
        } else {
          setError('解析失败，请重试');
        }
      } finally {
        setLoading(false);
      }
    };

    detectClipboard();
  }, []);

  const handleImport = async () => {
    if (!detectedTrip) return;

    setImporting(true);
    try {
      const response = await utils.importTrip({
        type: detectedTrip.type,
        code: detectedTrip.code,
        from: detectedTrip.from,
        to: detectedTrip.to,
        date: detectedTrip.date
      });

      setShowModal(false);
      setTimeout(() => {
        onImport(response.data);
      }, 300);
    } catch (err) {
      console.error('Import failed:', err);
      alert('导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleIgnore = () => {
    setShowModal(false);
    setTimeout(() => onBack(), 300);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'train': return 'train';
      case 'flight': return 'flight';
      default: return 'directions_car';
    }
  };

  return (
    <div className="font-display bg-[#f6f8f8] dark:bg-[#102220] text-slate-900 dark:text-white antialiased overflow-hidden h-screen w-full relative transition-colors duration-300">

      {/* Background Map Simulation */}
      <div className="absolute inset-0 z-0 flex flex-col w-full h-full bg-[#112221]">
        <div className="relative w-full h-full">
          <CapacitorImage
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCW2F-Bv1vibYp--l9VXdtDh2WKlkdVLM8XXR2-mMW3jGxSS6NYRH_bpGmVEBAWINNaUY7Sq5zA_jaMLvJW7z9hIuCswOHM3O8qeKGSfIzGjLDIgMS517rPSK_OykJIxBZEy6y3ZANQFRa-ArA-fSgHgiUcmKJiSluzTdZZLJ7PrG30iM5uxIH8rpGVCOUEHWgpOygxAVFktff7C4yzlRZ3Wm72JawyRpgMFKhlySkky78WqG14VQJFAiSAznu_b-XzqCwlKC-jYLs"
            className="w-full h-full object-cover"
            alt="Map Background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#112221]/90 via-[#112221]/20 to-[#112221]/60 mix-blend-multiply dark:mix-blend-normal"></div>

          {/* Top Bar */}
          <div className="absolute top-0 left-0 w-full p-4 pt-12 z-10 flex gap-3 items-start pointer-events-none">
            <button onClick={onBack} className="pointer-events-auto size-12 bg-white/90 dark:bg-[#193331]/90 backdrop-blur-md rounded-xl text-[#13ecda] dark:text-[#92c9c5] flex items-center justify-center shadow-lg border border-gray-100 dark:border-white/5">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex-1 h-12 bg-white/90 dark:bg-[#193331]/90 backdrop-blur-md rounded-xl flex items-center px-4 shadow-lg border border-gray-100 dark:border-white/5">
              <span className="material-symbols-outlined text-[#13ecda] dark:text-[#92c9c5]">search</span>
              <input className="bg-transparent border-none text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-[#92c9c5]/70 focus:ring-0 w-full ml-2 text-base outline-none" disabled placeholder="搜索地点..." type="text" />
            </div>
          </div>

          {/* Side Buttons */}
          <div className="absolute bottom-32 right-4 flex flex-col gap-3 z-10 pointer-events-none">
            <div className="flex flex-col rounded-2xl bg-white/90 dark:bg-[#193331]/90 backdrop-blur-md shadow-lg border border-gray-100 dark:border-white/5 overflow-hidden pointer-events-auto">
              <button className="size-12 flex items-center justify-center text-slate-700 dark:text-white border-b border-gray-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button className="size-12 flex items-center justify-center text-slate-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>
            <button className="size-12 rounded-full bg-white/90 dark:bg-[#193331]/90 backdrop-blur-md shadow-lg border border-gray-100 dark:border-white/5 flex items-center justify-center text-[#13ecda] pointer-events-auto hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined">my_location</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b1615]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#13ecda] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[#92c9c5]">正在检测剪贴板...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b1615]/80 backdrop-blur-sm p-6">
          <div className="bg-white dark:bg-[#193331] rounded-2xl p-6 max-w-sm w-full text-center">
            <span className="material-symbols-outlined text-orange-500 text-4xl mb-3">info</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{error}</h3>
            <p className="text-sm text-slate-500 dark:text-[#92c9c5] mb-4">请复制包含行程信息的文本后重试</p>
            <button
              onClick={onBack}
              className="w-full py-3 bg-[#13ecda] text-[#112221] font-bold rounded-full"
            >
              返回
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div
        className={`absolute inset-0 z-40 bg-[#0b1615]/60 backdrop-blur-[6px] transition-opacity duration-300 ${showModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      ></div>

      {/* Modal */}
      {showModal && detectedTrip && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative w-full max-w-[360px] bg-white dark:bg-[#193331] rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-[#2d4f4b]">

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[#13ecda]/10 blur-[50px] rounded-full pointer-events-none"></div>

            <div className="relative flex flex-col p-6 items-center text-center">
              <div className="mb-5 relative">
                <div className="absolute inset-0 bg-[#13ecda]/20 blur-xl rounded-full animate-pulse"></div>
                <div className="relative size-16 bg-gradient-to-br from-white to-gray-50 dark:from-[#234845] dark:to-[#112221] rounded-2xl flex items-center justify-center ring-1 ring-gray-200 dark:ring-[#3a6e68] shadow-lg">
                  <span className="material-symbols-outlined text-[#13ecda] text-[32px]">content_paste_go</span>
                </div>
                <div className="absolute -top-1 -right-1 size-5 bg-[#13ecda] rounded-full border-[3px] border-white dark:border-[#193331]"></div>
              </div>

              <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-snug mb-2 tracking-tight">
                检测到剪贴板包含行程信息
              </h2>
              <p className="text-slate-500 dark:text-[#92c9c5] text-sm mb-6 leading-relaxed px-4">
                线旅智能识别到一条新的出行计划，<br />是否立即导入到您的行程中？
              </p>

              <div className="w-full bg-gray-50 dark:bg-[#112221] rounded-2xl p-4 border border-gray-100 dark:border-[#2d4f4b] mb-8 shadow-inner flex items-center gap-4">
                <div className="flex items-center justify-center rounded-xl bg-[#13ecda]/10 dark:bg-[#234845] shrink-0 size-12 text-[#13ecda] dark:text-white">
                  <span className="material-symbols-outlined">{getTypeIcon(detectedTrip.type)}</span>
                </div>
                <div className="flex flex-col flex-1 items-start min-w-0">
                  <div className="flex items-center gap-2 w-full text-slate-800 dark:text-white text-base font-bold">
                    <span className="truncate">{detectedTrip.from}</span>
                    <span className="material-symbols-outlined text-sm text-[#13ecda]">arrow_forward</span>
                    <span className="truncate">{detectedTrip.to}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 w-full">
                    <span className="bg-[#13ecda]/10 text-[#13ecda] text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">{detectedTrip.code}</span>
                    <span className="text-slate-400 dark:text-[#92c9c5] text-xs font-medium truncate">{detectedTrip.date} · {detectedTrip.weekday}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-6 bg-[#13ecda] text-[#112221] font-bold text-base transition-transform active:scale-95 shadow-[0_4px_20px_rgba(19,236,218,0.25)] hover:shadow-[0_4px_25px_rgba(19,236,218,0.4)] disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {importing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#112221] border-t-transparent rounded-full animate-spin"></div>
                        导入中...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        立即导入
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
                </button>

                <button
                  onClick={handleIgnore}
                  className="flex w-full cursor-pointer items-center justify-center rounded-full h-12 px-6 text-slate-500 dark:text-[#92c9c5] hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white transition-colors text-sm font-medium"
                >
                  忽略
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Simulation */}
      <div className="absolute bottom-0 w-full h-20 bg-white/90 dark:bg-[#112221]/90 border-t border-gray-200 dark:border-white/5 flex items-center justify-around z-30 pointer-events-none backdrop-blur-md">
        <div className="flex flex-col items-center gap-1 text-[#13ecda]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
          <span className="text-[10px]">地图</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-[#5a7d79]">
          <span className="material-symbols-outlined">airplane_ticket</span>
          <span className="text-[10px]">行程</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-[#5a7d79]">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px]">我的</span>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

    </div>
  );
};

export default ClipboardDetectScreen;
