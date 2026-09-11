import React, { useState, useEffect } from 'react';
import { CITY_DATA, RegionNode, CityNode } from '../src/constants/cityData';

interface CitySelectorProps {
    value: string[];
    onChange: (cities: string[]) => void;
    onClose: () => void;
    maxSelection?: number;
    mode?: 'single' | 'multiple'; // New prop
}

const CitySelector: React.FC<CitySelectorProps> = ({ value, onChange, onClose, maxSelection = 8, mode = 'multiple' }) => {
    const [selectedCities, setSelectedCities] = useState<string[]>(value);
    const [activeRegionIndex, setActiveRegionIndex] = useState(0);
    const [activeProvinceIndex, setActiveProvinceIndex] = useState(0);

    useEffect(() => {
        setSelectedCities(value);
    }, [value]);

    const handleCityToggle = (cityName: string) => {
        if (mode === 'single') {
            onChange([cityName]);
            onClose();
            return;
        }

        if (selectedCities.includes(cityName)) {
            setSelectedCities(prev => prev.filter(c => c !== cityName));
        } else {
            if (selectedCities.length >= maxSelection) {
                alert(`最多只能选择${maxSelection}个城市`);
                return;
            }
            setSelectedCities(prev => [...prev, cityName]);
        }
    };

    const handleSelectNational = () => {
        onChange(['全国']);
        onClose();
    };

    const handleConfirm = () => {
        onChange(selectedCities);
        onClose();
    };

    const currentRegion = CITY_DATA[activeRegionIndex];
    const currentProvince = currentRegion?.provinces[activeProvinceIndex];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {mode === 'single' ? '切换城市' : '选择目标城市'}
                        </h2>
                        {mode === 'multiple' && (
                            <p className="text-xs text-gray-500 mt-1">最多可选 {maxSelection} 个城市 ({selectedCities.length}/{maxSelection})</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {/* National Button for Single Mode */}
                        {mode === 'single' && (
                            <button
                                onClick={handleSelectNational}
                                className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-sm font-bold transition-colors mr-2"
                            >
                                🌏 全国/不限
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            取消
                        </button>
                        {mode === 'multiple' && (
                            <button
                                onClick={handleConfirm}
                                className="px-6 py-2 bg-[#0ea5e9] hover:bg-sky-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-sky-500/20"
                            >
                                确认选择
                            </button>
                        )}
                    </div>
                </div>

                {/* Selected Tags Area (Only for Multiple Mode) */}
                {mode === 'multiple' && (
                    <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2 min-h-[60px] max-h-[120px] overflow-y-auto shrink-0">
                        {selectedCities.length === 0 ? (
                            <div className="text-gray-400 text-sm py-1">请从下方选择城市...</div>
                        ) : (
                            selectedCities.map(city => (
                                <div key={city} className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-200 shadow-sm animate-fadeIn">
                                    <span>{city}</span>
                                    <button
                                        onClick={() => handleCityToggle(city)}
                                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Region Sidebar (Left) */}
                    <div className="w-32 bg-gray-50 dark:bg-slate-800 border-r border-gray-100 dark:border-gray-700 overflow-y-auto shrink-0">
                        {CITY_DATA.map((region, idx) => (
                            <button
                                key={region.name}
                                onClick={() => {
                                    setActiveRegionIndex(idx);
                                    setActiveProvinceIndex(0); // Reset province when region changes
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-l-4 ${activeRegionIndex === idx
                                    ? 'bg-white dark:bg-slate-700/50 text-[#0ea5e9] border-[#0ea5e9]'
                                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {region.name}
                            </button>
                        ))}
                    </div>

                    {/* Province Tabs (Top of Right Panel) */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700 no-scrollbar bg-white dark:bg-slate-800">
                            {currentRegion && currentRegion.provinces.map((province, idx) => (
                                <button
                                    key={province.name}
                                    onClick={() => setActiveProvinceIndex(idx)}
                                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeProvinceIndex === idx
                                        ? 'text-[#0ea5e9] border-[#0ea5e9]'
                                        : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {province.name}
                                </button>
                            ))}
                        </div>

                        {/* City Grid (Content) */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-800">
                            {currentProvince ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {currentProvince.cities.map(city => {
                                        const isSelected = selectedCities.includes(city);
                                        return (
                                            <button
                                                key={city}
                                                onClick={() => handleCityToggle(city)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all text-center border ${isSelected
                                                    ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white shadow-md shadow-sky-500/20'
                                                    : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-[#0ea5e9]/50 hover:text-[#0ea5e9]'
                                                    }`}
                                            >
                                                {city}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    该地区暂无城市数据
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CitySelector;
