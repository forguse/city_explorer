import React, { useState, useEffect } from 'react';
import { club as clubApi, utils as utilsApi } from '../services/api';
import { compressImage } from '../src/utils/imageCompression';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { useImageUpload } from '../src/hooks/useImageUpload';

// 城市列表
const CITY_OPTIONS = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉',
  '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛',
  '沈阳', '宁波', '昆明', '大连', '厦门', '合肥', '无锡', '福州',
  '济南', '哈尔滨', '佛山', '长春', '温州', '石家庄', '南宁', '常州',
  '泉州', '南昌', '贵阳', '太原', '烟台', '嘉兴', '南通', '金华',
  '珠海', '惠州', '徐州', '海口', '乌鲁木齐', '绍兴', '中山', '台州',
  '兰州', '潍坊', '保定', '镇江', '扬州', '桂林', '唐山', '三亚',
  '湖州', '呼和浩特', '廊坊', '洛阳', '威海', '盐城', '临沂', '江门',
  '汕头', '泰州', '漳州', '邯郸', '济宁', '芜湖', '淄博', '银川',
  '柳州', '绵阳', '湛江', '鞍山', '赣州', '大庆', '宜昌', '包头',
  '咸阳', '秦皇岛', '株洲', '莆田', '吉林', '淮安', '肇庆', '宁德',
  '衡阳', '南平', '连云港', '丹东', '丽江', '延边', '舟山', '九江',
  '龙岩', '沧州', '抚顺', '襄阳', '上饶', '营口', '三明', '蚌埠',
  '丽水', '岳阳', '清远', '荆州', '泰安', '衢州', '盘锦', '东营',
  '南阳', '马鞍山', '南充', '西宁', '孝感', '齐齐哈尔'
];

interface ClubCreateScreenProps {
  onBack: () => void;
  onSuccess?: (club: any) => void;
}

const ClubCreateScreen: React.FC<ClubCreateScreenProps> = ({ onBack, onSuccess }) => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [desc, setDesc] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [limitInfo, setLimitInfo] = useState({ created: 0, total: 0 });
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const { upload: uploadImage } = useImageUpload();

  // Check creation limit on mount
  useEffect(() => {
    const checkLimit = async () => {
      setCheckingLimit(true);
      try {
        const response = await clubApi.getMyClubs();
        const { created, totalCount } = response.data;
        setLimitInfo({ created: created.length, total: totalCount });

        if (created.length >= 3) {
          setCanCreate(false);
          setError('您已创建3个社团，无法继续创建');
        } else if (totalCount >= 8) {
          setCanCreate(false);
          setError('您已加入8个社团，无法继续创建');
        }
      } catch (err) {
        console.error('Failed to check limit:', err);
      } finally {
        setCheckingLimit(false);
      }
    };
    checkLimit();
  }, []);

  // Filter cities based on search
  const filteredCities = citySearch
    ? CITY_OPTIONS.filter(c => c.includes(citySearch))
    : CITY_OPTIONS;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check original file size (reject if > 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('原图大小不能超过10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Compress image to 1MB max
      const compressedFile = await compressImage(file, { maxSizeMB: 1 });

      const result = await uploadImage(compressedFile);
      if (result.url) {
        setCoverUrl(result.url);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setError(err.response?.data?.error || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canCreate) {
      return;
    }
    if (!name.trim()) {
      setError('请输入社团名称');
      return;
    }
    if (!city) {
      setError('请选择城市');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await clubApi.create({
        name: name.trim(),
        city: city,
        description: desc.trim(),
        coverUrl: coverUrl || undefined
      });

      alert('社团已提交，请等待审核通过后即可使用！');
      if (onSuccess) {
        onSuccess(response.data);
      } else {
        onBack();
      }
    } catch (err: any) {
      console.error('Failed to create club:', err);
      setError(err.response?.data?.error || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (checkingLimit) {
    return (
      <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 dark:text-slate-400">检查中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f7f5] dark:bg-[#1a120b] font-display text-slate-900 dark:text-white min-h-screen w-full">
      <div className="relative flex flex-col min-h-screen w-full bg-white dark:bg-[#2d241c] overflow-hidden">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#2d241c]/90 backdrop-blur border-b border-gray-100 dark:border-gray-800 w-full">
          <div className="flex items-center px-4 py-3 gap-3 w-full">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold flex-1">创建社团</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 w-full">
          {/* 限制提示 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined text-lg">info</span>
              <span>已创建 {limitInfo.created}/3 个社团，已加入 {limitInfo.total}/8 个社团</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {!canCreate ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">block</span>
              <p className="text-gray-500">无法创建更多社团</p>
              <button
                onClick={onBack}
                className="mt-4 px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
              >
                返回
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-[#2d241c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm w-full">
                {/* 社团封面图片 */}
                <div className="flex flex-col gap-2 mb-4">
                  <label className="text-sm font-bold">社团封面</label>
                  <div className="relative">
                    {coverUrl ? (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden">
                        <CapacitorImage src={getImageUrl(coverUrl)} alt="社团封面" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setCoverUrl('')}
                          className="absolute top-2 right-2 size-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-[#0ea5e9] transition-colors">
                        {uploading ? (
                          <div className="w-6 h-6 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-gray-400 text-3xl">add_photo_alternate</span>
                            <span className="text-xs text-gray-400 mt-1">点击上传封面图片</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading || loading}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">建议尺寸 750x300，最大5MB</p>
                </div>

                {/* 社团名称 */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold">社团名称 *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-4 py-3 text-sm outline-none focus:border-[#0ea5e9] transition-colors"
                    placeholder="输入社团名称"
                    maxLength={20}
                    disabled={loading}
                  />
                </div>

                {/* 城市选择 */}
                <div className="flex flex-col gap-2 mt-4">
                  <label className="text-sm font-bold">城市 *</label>
                  <button
                    onClick={() => setShowCityPicker(true)}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-4 py-3 text-sm text-left flex items-center justify-between"
                  >
                    <span className={city ? 'text-slate-900 dark:text-white' : 'text-gray-400'}>
                      {city || '选择城市'}
                    </span>
                    <span className="material-symbols-outlined text-gray-400">expand_more</span>
                  </button>
                </div>

                {/* 社团简介 */}
                <div className="flex flex-col gap-2 mt-4">
                  <label className="text-sm font-bold">社团简介</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2d241c] px-4 py-3 text-sm outline-none min-h-[120px] focus:border-[#0ea5e9] transition-colors resize-none"
                    placeholder="简单介绍社团特色、活动类型等"
                    maxLength={200}
                    disabled={loading}
                  />
                  <div className="text-right text-xs text-gray-400 mt-1">{desc.length}/200</div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || uploading}
                className="w-full rounded-full bg-[#0ea5e9] text-white py-3 font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    创建中...
                  </>
                ) : (
                  '提交创建'
                )}
              </button>
            </>
          )}
        </main>
      </div>

      {/* 城市选择弹窗 */}
      {showCityPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white dark:bg-[#2d241c] rounded-t-3xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  setShowCityPicker(false);
                  setCitySearch('');
                }}
                className="text-gray-500"
              >
                取消
              </button>
              <span className="font-bold">选择城市</span>
              <div className="w-10"></div>
            </div>

            {/* 搜索框 */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
                <input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="搜索城市"
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* 城市列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-4 gap-2">
                {filteredCities.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCity(c);
                      setShowCityPicker(false);
                      setCitySearch('');
                    }}
                    className={`px-3 py-2 rounded-xl text-sm transition-colors ${city === c
                      ? 'bg-[#0ea5e9] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {filteredCities.length === 0 && (
                <div className="text-center text-gray-400 py-8">未找到匹配的城市</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubCreateScreen;
