import React, { useState, useEffect, useRef } from 'react';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface MessageCardScreenProps {
  onBack: () => void;
  messageData?: any;
  onSave?: (data: any) => void;
}

const MessageCardScreen: React.FC<MessageCardScreenProps> = ({ onBack, messageData, onSave }) => {
  const [isSaved, setIsSaved] = useState(false);

  // Use provided data or fallback to mock (for dev)
  // Mapping logic: 
  // quote -> content
  // signature -> author name
  // image -> cover image
  const messageCard = messageData || {
    // ... default mock ...
    location: '未知地点',
    image: 'https://via.placeholder.com/400',
    quote: '这是一条未知的赠言',
    signature: '— 神秘探险家',
    creator: { name: 'Unknown', level: 1, title: 'Novice', avatar: 'https://via.placeholder.com/50' }
  };

  const handleSave = async () => {
    if (isSaved) return;
    try {
      // If it's a "Task Completion" message being shown, saving it means adding it to "My Proverbs"
      // If messageData has an ID, it might already be saved or temporary.
      // Assuming we are "receiving" it now.
      if (onSave) {
        onSave(messageCard);
      } else {
        // Call API directly if no parent handler
        // const res = await proverb.create({ ... });
      }
      setIsSaved(true);
      alert('已收藏到奇遇相册');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReply = async () => {
    // Return gift feature
    const replyContent = prompt('请输入您的回赠寄语：');
    if (replyContent) {
      // Mock asking for image
      let replyImage = undefined;
      if (confirm('是否附带一张精美明信片？')) {
        replyImage = `https://picsum.photos/seed/${Date.now()}_reply/400/300`;
      }

      try {
        // In real app:
        /*
        await proverbApi.create({ 
            content: replyContent,
            imageUrl: replyImage,
            isReturnGift: true, 
            recipientId: messageCard.creator?.id 
        });
        */
        console.log('Reply sent:', { replyContent, replyImage });
        alert('回赠成功！对方也能收到你的祝福。');
      } catch (e) {
        alert('回赠失败');
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('确定要移除这条赠言吗？')) {
      // await proverb.delete(id);
      onBack();
    }
  }

  const handleReport = async () => {
    // await proverb.report(id);
    alert('已举报，感谢您的反馈');
  }


  const showCreatorInfo = () => {
    if (messageCard?.creator?.name) {
      alert(`查看用户: ${messageCard.creator.name}`);
    }
  };

  const handleLeave = () => {
    onBack();
  };

  return (
    <div className="bg-[#f8f7f6] dark:bg-[#221810] font-display antialiased overflow-hidden relative h-screen w-full flex flex-col items-center justify-center transition-colors duration-300">

      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="w-full h-full opacity-40 dark:opacity-20 blur-sm scale-110 transition-all duration-700">
          <CapacitorImage
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTqcntt4KhqEf1D57zDw2zMy_9yfIw7zFRiAQCLNAecaVK_yhJVaX9dlR6xBmofmCSbxJziEcxJ_l2Z6Jgw4i2RAaZYBgYrpHR1IoZFr0hZ3R8jJxMDjfqi13_JhxZG2bsgUq7SZJUpsH4R2AQgmeTp4qi_MEUcCaHrSZ3gxXE894e3BY7qDCvUAfamcVET66UCIkOrGw-gv64bUCmlWBhlwIxIOcMa_Ob9009iS0_Uha-TYhthv3_uoQitkbCQS4h7A31U4Mhlk8"
            className="w-full h-full object-cover"
            alt="Background"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#f8f7f6]/60 to-[#f8f7f6]/90 dark:from-[#221810]/60 dark:to-[#221810]/90"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full w-full items-center justify-center p-6 max-w-md mx-auto">

        {/* Top Status Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center opacity-50">
          <div className="flex items-center gap-1 text-[#1b130d] dark:text-white">
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span className="text-xs font-bold tracking-wide uppercase">Current Location</span>
          </div>
          <div className="h-1 w-16 bg-[#ee7c2b]/20 rounded-full"></div>
        </div>

        {/* Card Container */}
        <div
          className={`w-full bg-[#fdfbf7] dark:bg-[#2a2522] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative transform rotate-1 border border-white/50 dark:border-white/5 group/card mb-6 transition-all duration-500 ${isSaved ? 'scale-95 opacity-50' : ''}`}
        >

          {/* Stamp */}
          <div className="absolute top-4 right-4 z-20 pointer-events-none">
            <div className="relative group">
              <div className="absolute inset-0 bg-[#ee7c2b]/10 rounded-full blur-xl transform scale-150"></div>
              <div className="h-20 w-20 rounded-full border-[3px] border-[#ee7c2b]/80 flex items-center justify-center -rotate-[15deg] backdrop-blur-[2px] shadow-sm bg-[#fdfbf7]/50 dark:bg-[#2a2522]/50 stamp-box">
                <div className="h-[72px] w-[72px] rounded-full border border-[#ee7c2b]/60 border-dashed flex flex-col items-center justify-center text-[#ee7c2b]">
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">Quest</span>
                  <span className="text-sm font-black tracking-tighter leading-none">奇遇</span>
                  <span className="text-sm font-black tracking-tighter leading-none">达成</span>
                  <span className="material-symbols-outlined text-[16px] mt-0.5">verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Image */}
          <div className="w-full h-52 relative">
            <CapacitorImage
              src={getImageUrl(messageCard.image)}
              alt="Card Cover"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-transparent dark:from-[#2a2522] opacity-100"></div>
            <div className="absolute bottom-3 left-4 bg-black/20 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">push_pin</span>
              {messageCard.location || '未知地点'}
            </div>
          </div>

          {/* Card Body */}
          <div className="px-6 pt-2 pb-6 flex flex-col items-center text-center">
            <div className="relative py-4 px-2 mb-4">
              <span className="material-symbols-outlined absolute -top-1 -left-1 text-4xl text-[#ee7c2b]/10 select-none">format_quote</span>
              <h2 className="text-[#2c1810] dark:text-[#eaddcf] text-[22px] font-bold leading-relaxed tracking-tight italic relative z-10 font-serif">
                {messageCard.quote}
              </h2>
              <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-4xl text-[#ee7c2b]/10 rotate-180 select-none">format_quote</span>
            </div>

            <p className="text-[#9a6c4c] dark:text-[#a8907d] text-sm font-medium italic self-end mr-2 mb-6">
              {messageCard.signature}
            </p>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#e5e0db] dark:via-[#4a4038] to-transparent mb-5"></div>

            {/* Creator Info */}
            <div className="w-full flex items-center gap-3 bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-[#e5e0db] dark:border-[#4a4038]">
              <div className="h-12 w-12 rounded-full shadow-sm shrink-0 ring-2 ring-white dark:ring-[#3d342f] overflow-hidden">
                <CapacitorImage
                  src={getImageUrl(messageCard.creator.avatar)}
                  alt={messageCard.creator.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <div className="flex items-center gap-1 w-full">
                  <p className="text-[#1b130d] dark:text-gray-100 text-sm font-bold truncate">{messageCard.creator.name}</p>
                  <span className="bg-[#ee7c2b]/10 text-[#ee7c2b] text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">LV.{messageCard.creator.level}</span>
                </div>
                <p className="text-[#9a6c4c] dark:text-[#8a7a6f] text-xs font-normal truncate w-full">{messageCard.creator.title}</p>
              </div>
              <button
                onClick={showCreatorInfo}
                className="flex items-center justify-center h-8 w-8 rounded-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[#9a6c4c]"
              >
                <span className="material-symbols-outlined text-lg">info</span>
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3 mt-2">
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`group w-full bg-[#ee7c2b] hover:bg-[#d96d22] active:bg-[#c05e1a] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-[#ee7c2b]/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${isSaved ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined group-hover:animate-bounce">{isSaved ? 'check' : 'favorite'}</span>
            <span>{isSaved ? '已收藏' : '收下赠言'}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleReply}
              className="w-full bg-white dark:bg-[#2a2522] hover:bg-gray-50 dark:hover:bg-[#322c29] text-[#1b130d] dark:text-gray-200 font-semibold py-3 rounded-xl border border-gray-100 dark:border-[#3d342f] shadow-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-gray-400">reply</span>
              <span className="text-sm">回赠</span>
            </button>
            <button
              onClick={handleLeave}
              className="w-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#9a6c4c] dark:text-[#8a7a6f] font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <span className="text-sm">仅仅离开</span>
            </button>
          </div>
        </div>

      </div>

      <style>{`
        .stamp-box {
          mask-image: radial-gradient(circle, black 60%, transparent 100%); 
          -webkit-mask-image: radial-gradient(circle, black 60%, transparent 100%);
        }
      `}</style>
    </div>
  );
};

export default MessageCardScreen;
