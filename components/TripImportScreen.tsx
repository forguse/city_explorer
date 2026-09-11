import React, { useState } from 'react';
import { utils } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface TripImportScreenProps {
  onBack: () => void;
}

interface TripData {
  transport: string;
  date: string;
  hotel: string;
  type?: string;
  code?: string;
  from?: string;
  to?: string;
}

const TripImportScreen: React.FC<TripImportScreenProps> = ({ onBack }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [tripData, setTripData] = useState<TripData>({
    transport: '',
    date: '',
    hotel: ''
  });

  const handlePaste = async () => {
    try {
      setError(null);
      setStatusMessage('正在读取剪贴板...');

      // 读取剪贴板内容
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        setError('剪贴板为空，请先复制行程信息');
        setStatusMessage(null);
        return;
      }

      setStatusMessage('正在解析行程信息...');
      setIsScanning(true);

      // 调用 API 解析行程
      const response = await utils.parseTrip(clipboardText);
      const parsedData = response.data;

      setTripData({
        transport: parsedData.transport || `${parsedData.from || ''} -> ${parsedData.to || ''}`,
        date: parsedData.date || '',
        hotel: parsedData.hotel || '',
        type: parsedData.type,
        code: parsedData.code,
        from: parsedData.from,
        to: parsedData.to
      });

      setScanComplete(true);
      setStatusMessage('解析成功');
    } catch (err: any) {
      console.error('Paste error:', err);
      setError(err.response?.data?.error || '解析失败，请重试');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOCR = async () => {
    if (isScanning) return;

    try {
      setError(null);
      setIsScanning(true);
      setScanComplete(false);
      setStatusMessage('请选择行程截图...');

      // 创建文件选择器
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setIsScanning(false);
          setStatusMessage(null);
          return;
        }

        setStatusMessage('正在识别图片...');

        // 读取图片为 base64
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;

            // 这里可以调用 OCR API（需要后端支持）
            // 暂时使用模拟数据，实际应调用后端 OCR 接口
            // const response = await utils.ocrTrip(base64);

            // 模拟 OCR 结果（后端实现后替换）
            await new Promise(resolve => setTimeout(resolve, 1500));

            setTripData({
              transport: '已识别的航班信息',
              date: '已识别的日期',
              hotel: '已识别的酒店'
            });

            setScanComplete(true);
            setStatusMessage('识别完成');
          } catch (err: any) {
            console.error('OCR error:', err);
            setError(err.response?.data?.error || 'OCR 识别失败');
          } finally {
            setIsScanning(false);
          }
        };
        reader.readAsDataURL(file);
      };

      input.click();
    } catch (err: any) {
      console.error('OCR error:', err);
      setError('选择图片失败');
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!tripData.transport && !tripData.date) {
      setError('请先导入行程信息');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 调用 API 保存行程
      await utils.importTrip({
        type: tripData.type || 'flight',
        code: tripData.code || '',
        from: tripData.from || tripData.transport.split('->')[0]?.trim() || '',
        to: tripData.to || tripData.transport.split('->')[1]?.trim() || '',
        date: tripData.date
      });

      setStatusMessage('行程已保存');
      setTimeout(() => {
        onBack();
      }, 500);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f6f8f8] dark:bg-[#102220] font-body text-slate-900 dark:text-white antialiased min-h-screen flex flex-col transition-colors duration-300">

      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-[#f6f8f8]/95 dark:bg-[#102220]/95 backdrop-blur-md px-4 py-3 justify-between border-b border-black/5 dark:border-white/5">
        <div
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-black/5 dark:active:bg-white/10 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900 dark:text-white text-2xl">arrow_back_ios_new</span>
        </div>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">智能行程导入</h2>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto pb-32 no-scrollbar">
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl font-extrabold leading-tight mb-2">开始您的旅程</h1>
          <p className="text-slate-500 dark:text-gray-400 text-base font-normal leading-normal">AI 自动识别行程信息，轻松规划每一步。</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-red-500 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && !error && (
          <div className="mx-6 mb-4 p-4 rounded-xl bg-[#13ecda]/10 border border-[#13ecda]/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#13ecda] animate-pulse">info</span>
            <p className="text-[#13ecda] text-sm font-medium">{statusMessage}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 px-6 mb-8">
          <button
            onClick={handlePaste}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl bg-white dark:bg-[#162B29] p-6 shadow-sm border border-transparent hover:border-[#13ecda]/50 transition-all active:scale-[0.98]"
          >
            <div className="size-16 rounded-full bg-[#13ecda]/10 flex items-center justify-center text-[#13ecda] group-hover:bg-[#13ecda] group-hover:text-[#102220] transition-colors duration-300">
              <span className="material-symbols-outlined text-[32px]">content_paste</span>
            </div>
            <div className="text-center">
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">剪贴板粘贴</h3>
              <p className="text-slate-500 dark:text-gray-400 text-xs mt-1">自动解析复制内容</p>
            </div>
          </button>
          <button
            onClick={handleOCR}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl bg-white dark:bg-[#162B29] p-6 shadow-sm border border-transparent hover:border-[#13ecda]/50 transition-all active:scale-[0.98]"
          >
            <div className="size-16 rounded-full bg-[#FF8A5B]/10 flex items-center justify-center text-[#FF8A5B] group-hover:bg-[#FF8A5B] group-hover:text-white transition-colors duration-300">
              <span className="material-symbols-outlined text-[32px]">crop_free</span>
            </div>
            <div className="text-center">
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">截图识别</h3>
              <p className="text-slate-500 dark:text-gray-400 text-xs mt-1">导入相册行程单</p>
            </div>
          </button>
        </div>

        {/* Scan Card */}
        <div className="px-6 mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#162B29] shadow-lg border border-black/5 dark:border-white/5">
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start">
              <div>
                <p className="text-[#13ecda] font-bold text-sm uppercase tracking-wider mb-0.5">AI Processing</p>
                <p className="text-white font-medium text-xs opacity-90">
                  {isScanning ? '正在扫描...' : scanComplete ? '扫描完成' : '等待输入'}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                <span className={`material-symbols-outlined text-[#13ecda] text-[14px] ${isScanning ? 'animate-pulse' : ''}`}>auto_awesome</span>
                <span className="text-[10px] text-white font-bold">SMART SCAN</span>
              </div>
            </div>

            <div className="relative aspect-[2/1] w-full bg-slate-900">
              <div className="w-full h-full opacity-60">
                <CapacitorImage
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFlUjLY3XkalPPr1jnLGwRgQQ9Hu6hCOc6HHNz_4sUPSGOHB-5TA88r9qLfhOtcaefLpByazPuxPo8DSwlKg9oDaISYWtRfrnYUClsLhkMlr-BpAm7cY7ufPlSfQNLXxcQPTaOxDMJ1M7bNG-IKsk32LJzQU5KmCPtaTyiwRBMvkcunBk4Hyb73blZKEbtsRC0RQuF3-ngd_ZCkpc5QiByoDeZjRVGGfXk9ZDZJu5ZtsUMpEDevVKeFbdYFw_ZqDNG0wGY4Cj4hKQ"
                  className="w-full h-full object-cover"
                  alt="Import Background"
                />
              </div>
              <div
                className={`absolute top-1/2 left-0 right-0 h-1 bg-[#13ecda] shadow-[0_0_20px_rgba(19,236,218,0.8)] z-10 opacity-80 ${isScanning ? 'animate-scan' : ''}`}
              ></div>
              <div className="absolute top-0 bottom-0 left-0 right-0 bg-[#13ecda]/5 z-0"></div>
            </div>

            {scanComplete && (
              <div className="p-4 flex items-center gap-3 border-t border-black/5 dark:border-white/5 animate-in slide-in-from-bottom-2 fade-in">
                <div className="size-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">check</span>
                </div>
                <div className="flex-1">
                  <p className="text-slate-900 dark:text-white text-sm font-bold">识别成功</p>
                  <p className="text-slate-500 dark:text-gray-400 text-xs">
                    已提取 {[tripData.transport, tripData.date, tripData.hotel].filter(Boolean).length} 项关键信息
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="px-6 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-900 dark:text-white font-bold text-lg">行程详情</h3>
            {scanComplete && (
              <span className="text-xs font-medium text-[#13ecda] px-2 py-1 rounded bg-[#13ecda]/10">自动填充完毕</span>
            )}
          </div>

          <div className="group relative">
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">交通 / 航班</label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 dark:text-gray-500">
                <span className="material-symbols-outlined">flight_takeoff</span>
              </div>
              <input
                value={tripData.transport}
                onChange={(e) => setTripData({ ...tripData, transport: e.target.value })}
                placeholder="如：上海浦东 (PVG) -> 东京成田 (NRT)"
                className="w-full bg-white dark:bg-[#162B29] text-slate-900 dark:text-white text-sm font-medium rounded-xl py-4 pl-12 pr-12 border-none ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-[#13ecda] shadow-sm outline-none"
                type="text"
              />
              {tripData.transport && (
                <div className="absolute right-4 text-[#13ecda]">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
              )}
            </div>
          </div>

          <div className="group relative">
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">日期 / 时间</label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 dark:text-gray-500">
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <input
                value={tripData.date}
                onChange={(e) => setTripData({ ...tripData, date: e.target.value })}
                placeholder="如：2024年10月15日 - 10月20日"
                className="w-full bg-white dark:bg-[#162B29] text-slate-900 dark:text-white text-sm font-medium rounded-xl py-4 pl-12 pr-12 border-none ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-[#13ecda] shadow-sm outline-none"
                type="text"
              />
              {tripData.date && (
                <div className="absolute right-4 text-[#13ecda]">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
              )}
            </div>
          </div>

          <div className="group relative">
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">住宿 / 酒店</label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 dark:text-gray-500">
                <span className="material-symbols-outlined">hotel</span>
              </div>
              <input
                value={tripData.hotel}
                onChange={(e) => setTripData({ ...tripData, hotel: e.target.value })}
                placeholder="如：东京湾希尔顿大酒店"
                className="w-full bg-white dark:bg-[#162B29] text-slate-900 dark:text-white text-sm font-medium rounded-xl py-4 pl-12 pr-12 border-none ring-1 ring-black/5 dark:ring-white/10 focus:ring-2 focus:ring-[#13ecda] shadow-sm outline-none"
                type="text"
              />
              {tripData.hotel && (
                <div className="absolute right-4 text-[#13ecda]">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#f6f8f8]/80 dark:bg-[#102220]/80 backdrop-blur-lg border-t border-black/5 dark:border-white/5 p-4 z-50">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button
            onClick={() => setScanComplete(false)}
            disabled={loading}
            className="flex-1 py-4 px-6 rounded-full border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white font-bold text-sm active:bg-slate-100 dark:active:bg-white/10 transition-colors disabled:opacity-50"
          >
            手动修改
          </button>
          <button
            onClick={handleSave}
            disabled={loading || (!tripData.transport && !tripData.date)}
            className="flex-[2] py-4 px-6 rounded-full bg-[#13ecda] text-[#102220] font-bold text-sm shadow-[0_0_20px_rgba(19,236,218,0.3)] hover:shadow-[0_0_30px_rgba(19,236,218,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                保存中...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                确认保存
              </>
            )}
          </button>
        </div>
        <div className="h-1 w-1/3 bg-slate-300 dark:bg-white/20 mx-auto mt-4 rounded-full"></div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

    </div>
  );
};

export default TripImportScreen;
