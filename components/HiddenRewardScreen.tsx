import React, { useState, useEffect } from 'react';
import { reward as rewardApi } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface HiddenRewardScreenProps {
  onBack: () => void;
  onExplore: () => void;
  // Optional: pass specific reward if already known
  initialReward?: any;
}

const HiddenRewardScreen: React.FC<HiddenRewardScreenProps> = ({ onBack, onExplore, initialReward }) => {
  const [showModal, setShowModal] = useState(true);
  const [particles, setParticles] = useState<any[]>([]);
  const [rewardData, setRewardData] = useState<any>(initialReward || null);
  const [loading, setLoading] = useState(!initialReward);

  useEffect(() => {
    // Static particles matching the Vue example for consistency
    setParticles([
      { style: { top: '15%', left: '10%' }, className: 'w-4 h-4 bg-[#13ec6a] rounded-full opacity-60 animate-bounce delay-75' },
      { style: { top: '20%', left: '20%' }, className: 'w-3 h-3 bg-yellow-400 rotate-45 opacity-80 animate-pulse' },
      { style: { top: '10%', left: '30%' }, className: 'w-2 h-6 bg-pink-400 -rotate-12 opacity-70' },
      { style: { top: '18%', right: '15%' }, className: 'w-5 h-5 border-4 border-blue-400 rounded-full opacity-60' },
      { style: { top: '25%', right: '25%' }, className: 'w-3 h-3 bg-[#13ec6a] rotate-12 opacity-80' },
      { style: { top: '12%', right: '8%' }, className: 'w-6 h-2 bg-purple-400 rotate-45 opacity-70' }
    ]);

    if (!rewardData) {
      const fetchReward = async () => {
        try {
          const response = await rewardApi.getPending();
          setRewardData(response.data);
        } catch (err) {
          console.error('Failed to fetch reward:', err);
          // Fallback to default if API fails just to show something (or could error out)
          setRewardData({
            title: '成都大熊猫繁育基地',
            medal: '蓉城护卫',
            rarity: 4,
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjsFA2Qd7pnXh57i_3l4ObF6ZYIyBqdyexOgT5L0RPF9WkkBRq46k1lbKmbcscCb-ubsDD5uvjPE8ZgCIx55a4RqS1aiKLm1hjwkfJiGbiTOKFxRZhDL7PAK2jtje9H8xqcIA5noUF-qlPCNrUvbx4YS1LlPDiegtJKK76uJchmjpoZTAfPYjXvedvtAUi0i-7IjHLrtUrDG-crwu-Z7C9DdVyPENIA-gBtHx9IYQTSTJGPI5XLnVprn5N2LGdbsHe1nOEJvbtM1E'
          });
        } finally {
          setLoading(false);
        }
      };
      fetchReward();
    }
  }, [rewardData]);

  const handleCollect = () => {
    console.log('收下奖励:', rewardData?.title);
    setShowModal(false);
    // Navigate after animation
    setTimeout(() => {
      onExplore();
    }, 300);
  };

  const handleClose = () => {
    setShowModal(false);
    setTimeout(() => {
      onBack();
    }, 300);
  };

  if (loading) {
    return <div className="bg-[#102217] h-screen w-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#13ec6a] border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  // Guard against null data
  if (!rewardData) return null;

  return (
    <div className="bg-[#102217] font-display antialiased overflow-hidden h-screen w-full relative flex items-center justify-center transition-colors duration-500">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full opacity-40 blur-[8px] scale-110">
          <CapacitorImage
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnqu83GysOduAETLvHsoNmm5719KAt5fpFwOP26EJb7E6AzLFEMyHCfszGZxjGM2P0HAUbjZ7kL3N3kgmvKao0He3Dz6ecHMfBtd-PhODNzi4N5l_cpKZBTiSSrD-IH08KWP2f0IrumiQAwwFGIl768TxfoILsD304lpx9UQS66Ux3E98Pg_ukoreY_g0CPvA1eAZTex0AO1EbNQV9D6lqr90PgWBmA5yyS3P8Yt_Jgedi3mcHkKF2BLYdW7nw7VhX_Iky9KDCS5s"
            className="w-full h-full object-cover"
            alt="Background"
          />
        </div>
        <div className="absolute inset-0 bg-[#102217]/60"></div>
      </div>

      {/* Particles Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {particles.map((p, index) => (
          <div
            key={index}
            className={`absolute ${p.className}`}
            style={p.style}
          ></div>
        ))}
      </div>

      {/* Modal Container */}
      {showModal && (
        <div className="relative z-20 w-full max-w-[340px] px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">

          <button
            onClick={handleClose}
            className="absolute -top-12 right-4 text-white/80 hover:text-white transition-colors p-2 bg-black/20 rounded-full backdrop-blur-sm z-30"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>

          <div className="relative flex flex-col items-center bg-[#f6f8f7] dark:bg-[#102217] rounded-[2.5rem] p-6 pb-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-white/20">

            {/* Glow Effect behind Title */}
            <div className="absolute top-[80px] left-1/2 -translate-x-1/2 w-48 h-48 bg-[#13ec6a]/40 blur-[50px] rounded-full pointer-events-none"></div>

            {/* 'New Discovery' Badge */}
            <div className="relative z-20 -mt-2 mb-6">
              <div className="flex h-9 items-center justify-center gap-x-2 rounded-full bg-[#13ec6a]/10 border border-[#13ec6a]/20 pl-4 pr-5 shadow-sm backdrop-blur-sm">
                <span className="text-lg">✨</span>
                <p className="text-[#102217] dark:text-[#13ec6a] text-sm font-bold tracking-wide">新发现！</p>
              </div>
            </div>

            {/* Card Image */}
            <div className="relative w-full aspect-square mb-6 group/card perspective-1000">
              <div className="w-full h-full rounded-[1.5rem] bg-white dark:bg-gray-800 p-2 shadow-xl transform transition-transform duration-500 hover:scale-[1.02] rotate-1 hover:rotate-0 border-b-4 border-r-4 border-black/5 dark:border-white/5">
                <div className="w-full h-full rounded-[1rem] overflow-hidden relative">
                  <div className="w-full h-full">
                    <CapacitorImage
                      src={getImageUrl(rewardData.image)}
                      className="w-full h-full object-cover"
                      alt={rewardData.title}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Rarity Stars */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-[#102217] px-3 py-1 rounded-full border border-white/10 shadow-lg">
                {Array.from({ length: rewardData.rarity }).map((_, n) => (
                  <span
                    key={n}
                    className="material-symbols-outlined text-yellow-400 text-[16px] leading-none"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >star</span>
                ))}
              </div>
            </div>

            {/* Reward Title & Info */}
            <div className="text-center w-full px-2 mb-8">
              <h1 className="text-[#111814] dark:text-white tracking-tight text-2xl font-extrabold leading-tight mb-2">
                {rewardData.title}
              </h1>
              <div className="flex items-center justify-center gap-1.5 opacity-80">
                <span className="material-symbols-outlined text-[#13ec6a] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <p className="text-[#111814]/70 dark:text-white/70 text-sm font-medium leading-normal">
                  获得勋章：{rewardData.medal}
                </p>
              </div>
            </div>

            {/* Collect Button */}
            <button
              onClick={handleCollect}
              className="w-full group relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#13ec6a] py-4 px-6 transition-transform active:scale-95 shadow-[0_8px_20px_-6px_rgba(19,236,106,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(19,236,106,0.5)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="material-symbols-outlined text-[#102217] text-[20px]">inventory_2</span>
              <span className="text-[#102217] text-base font-bold leading-none tracking-wide z-10">收下奖励</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default HiddenRewardScreen;
