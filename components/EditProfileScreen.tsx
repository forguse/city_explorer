import React, { useState, useEffect, useRef } from 'react';
import { user as userApi } from '../services/api';
import { useImageUpload } from '../src/hooks/useImageUpload';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface EditProfileScreenProps {
  onBack: () => void;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onBack }) => {
  const [profileData, setProfileData] = useState({
    avatar: '',
    level: 1,
    guild: '无社团',
    nickname: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userApi.getMe();
        const user = response.data;
        setProfileData({
          avatar: user.avatarUrl || '',
          level: user.level || 1,
          guild: '未加入', // Backend doesn't support guilds yet
          nickname: user.username || '',
          bio: user.bio || ''
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // 头像上传
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { upload, loading: avatarUploading } = useImageUpload();

  const triggerUpload = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result.url) {
      setProfileData(prev => ({ ...prev, avatar: result.url! }));
    } else if (result.error) {
      alert(result.error);
    }
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateMe({
        nickname: profileData.nickname,
        bio: profileData.bio,
        avatarUrl: profileData.avatar
      });
      // Update local storage user info
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        username: profileData.nickname,
        avatarUrl: profileData.avatar
      }));

      onBack();
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#fcfcfc] dark:bg-[#181411] h-screen w-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#f47b25] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#181411] transition-colors duration-300" id="app">

      <header className="sticky top-0 z-50 flex items-center px-4 h-14 bg-[#fcfcfc]/80 dark:bg-[#181411]/80 backdrop-blur-md">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold tracking-tight text-slate-900 dark:text-white mr-8">编辑个人档案</h1>
      </header>

      <main className="flex-1 px-6 pt-4 pb-24 space-y-10">
        {/* 隐藏的头像上传 input */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />

        <section className="flex flex-col items-center">
          <div onClick={triggerUpload} className="relative group cursor-pointer">
            <div className="size-28 rounded-full border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm transition-transform active:scale-95">
              <div className="size-full rounded-full overflow-hidden relative">
                <CapacitorImage alt="Portrait" className="w-full h-full object-cover" src={getImageUrl(profileData.avatar)} fallback="https://via.placeholder.com/150" />
                <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-1 right-1 size-7 bg-[#f47b25] rounded-full border-2 border-white dark:border-[#181411] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-white text-[14px] font-bold">add</span>
            </div>
          </div>
          <p className="mt-3 text-[12px] font-medium text-slate-400 dark:text-slate-500 tracking-wider">点击更换探险者头像</p>
        </section>

        {/* <section className="grid grid-cols-2 gap-8 py-2 border-y border-slate-100/60 dark:border-slate-800/60">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-[16px]">military_tech</span>
              <span className="text-[11px] font-bold uppercase tracking-widest">当前等级</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[#f47b25] font-bold text-xs">LV.</span>
              <span className="text-slate-900 dark:text-white font-bold text-2xl">{profileData.level}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span className="text-[11px] font-bold uppercase tracking-widest">所属社团</span>
            </div>
            <span className="text-slate-900 dark:text-white font-bold text-[15px] mt-1">{profileData.guild}</span>
          </div>
        </section> */}

        <div className="space-y-8">
          <div className="space-y-2.5">
            <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 ml-1">探险家昵称</label>
            <div className="relative group">
              <input
                value={profileData.nickname}
                onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
                className="w-full bg-[#f5f5f5] dark:bg-[#221f1d] border border-transparent focus:border-slate-200 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-[#2c2825] rounded-xl px-4 py-3.5 text-[15px] text-slate-800 dark:text-white placeholder-slate-400 focus:ring-0 transition-all outline-none"
                placeholder="输入你的代号"
                type="text"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none">
                <span className="material-symbols-outlined text-[18px]">pen_size_2</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 ml-1">冒险格言</label>
            <div className="relative">
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="w-full bg-[#f5f5f5] dark:bg-[#221f1d] border border-transparent focus:border-slate-200 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-[#2c2825] rounded-xl px-4 py-4 text-[15px] text-slate-800 dark:text-white placeholder-slate-400 focus:ring-0 transition-all outline-none min-h-[120px] resize-none leading-relaxed"
                placeholder="写下你的座右铭..."
              ></textarea>
            </div>
          </div>
        </div>

      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-gradient-to-t from-[#fcfcfc] via-[#fcfcfc] dark:from-[#181411] dark:via-[#181411] to-transparent">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#f47b25] hover:bg-[#e66d1a] disabled:bg-gray-400 text-white font-bold text-[16px] py-4 rounded-[10px] shadow-sm transition-all active:scale-[0.98] pb-safe flex items-center justify-center gap-2"
        >
          {saving ? (
            <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          )}
          <span>{saving ? '保存中...' : '保存档案'}</span>
        </button>
      </footer>

      <style>{`
        .pb-safe { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
      `}</style>
    </div>
  );
};

export default EditProfileScreen;
