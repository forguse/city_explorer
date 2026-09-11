import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface TaskProverbScreenProps {
    type: 'success' | 'complete'; // success = constraints met, complete = just finished
    authorMessage?: string;
    authorImage?: string;
    onContinue: () => void;
}

const WALDEN_QUOTES = [
    "我愿意深深地扎入生活，吮尽生活的骨髓，过得扎实，简单。\n——《瓦尔登湖》",
    "让我们如大自然般从容地度过一天吧，别因为坚果壳或蚊蝇的一翅而脱轨。\n——《瓦尔登湖》"
];

const TAO_QUOTE = "大成若缺，其用不弊；大盈若冲，其用不穷。\n——《道德经》";

const WALLPAPERS = [
    '/images/proverb-bg-1.jpg', // 壁纸：自然风景 1
    '/images/proverb-bg-2.jpg', // 壁纸：自然风景 2
    '/images/proverb-bg-3.jpg', // 壁纸：自然风景 3
    '/images/proverb-bg-4.jpg'  // 壁纸：自然风景 4
];

const TAO_WALLPAPER = '/images/proverb-tao.jpg'; // 壁纸：道德经背景 (云雾)

export const TaskProverbScreen: React.FC<TaskProverbScreenProps> = ({
    type,
    authorMessage,
    authorImage,
    onContinue
}) => {
    const [content, setContent] = useState<{ text: string, image: string }>({ text: '', image: '' });

    useEffect(() => {
        let text = '';
        let image = '';

        if (type === 'success') {
            // 1. Try Author Message
            if (authorMessage) {
                text = authorMessage;
                image = authorImage || WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
            } else {
                // 2. Fallback to Walden
                text = WALDEN_QUOTES[Math.floor(Math.random() * WALDEN_QUOTES.length)];
                image = authorImage || WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
            }
        } else {
            // Failed constraints - 简约白色
            text = TAO_QUOTE;
            image = ''; // No image for complete type
        }

        setContent({ text, image });
    }, [type, authorMessage, authorImage]);

    // 简约白色模式
    if (type === 'complete') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white animate-in fade-in duration-700">
                <div className="relative z-10 p-8 max-w-lg w-full text-center flex flex-col h-full justify-between py-20">
                    {/* Top Icon */}
                    <div className="opacity-40">
                        <span className="material-symbols-outlined text-gray-400 text-4xl">water_drop</span>
                    </div>

                    {/* Main Text */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
                            {content.text.split('\n').map((line, i) => (
                                <p key={i} className={`text-gray-800 leading-relaxed font-serif tracking-wide ${i === 0 ? 'text-2xl md:text-3xl font-medium' : 'text-lg md:text-xl text-gray-500 mt-4 text-right'}`}>
                                    {line}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Continue Button (Minimal) */}
                    <div className="animate-in fade-in duration-1000 delay-1000 fill-mode-both">
                        <button
                            onClick={onContinue}
                            className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full font-medium tracking-widest transition-all hover:scale-105 active:scale-95"
                        >
                            <span className="text-sm uppercase">Continue Journey</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 成功模式 (Existing Dark/Wallpaper Style)
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black animate-in fade-in duration-700">
            {/* Background Image */}
            <div className="absolute inset-0 transition-opacity duration-1000">
                <CapacitorImage
                    src={getImageUrl(content.image)}
                    alt="Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            </div>

            {/* Content */}
            <div className="relative z-10 p-8 max-w-lg w-full text-center flex flex-col h-full justify-between py-20">

                {/* Top Section */}
                <div className="space-y-2 pt-10">
                    <h2 className="text-white text-2xl font-bold tracking-wider drop-shadow-md animate-in slide-in-from-top-4 duration-700">
                        恭喜您成功完成任务
                    </h2>
                    {authorMessage ? (
                        <p className="text-white/80 text-sm font-medium animate-in slide-in-from-top-4 duration-700 delay-100">
                            听听发布人想说的话吧：
                        </p>
                    ) : (
                        <p className="text-white/80 text-sm font-medium animate-in slide-in-from-top-4 duration-700 delay-100">
                            每段旅程都是美妙的生命体验
                        </p>
                    )}
                </div>

                {/* Main Text */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
                        {content.text.split('\n').map((line, i) => (
                            <p key={i} className={`text-white leading-relaxed font-serif tracking-wide drop-shadow-lg ${i === 0 ? 'text-2xl md:text-3xl font-medium' : 'text-lg md:text-xl opacity-80 mt-4 text-right'}`}>
                                {line}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Continue Button */}
                <div className="animate-in fade-in duration-1000 delay-1000 fill-mode-both">
                    <button
                        onClick={onContinue}
                        className="group relative px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white font-medium tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                        <span className="relative z-10 text-sm uppercase">Continue Journey</span>
                        <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                    </button>
                </div>
            </div>
        </div>
    );
};
