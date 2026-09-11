
import React, { useState, useEffect } from 'react';
import { useImageUpload } from '../../hooks/useImageUpload';
import CapacitorImage from './CapacitorImage';

interface ImageUploaderProps {
    maxCount?: number;
    defaultImages?: string[];
    onUploadSuccess: (urls: string[]) => void;
    folder?: string; // 保留字段，未来可传给后端
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    maxCount = 1,
    defaultImages = [],
    onUploadSuccess
}) => {
    const [images, setImages] = useState<string[]>(defaultImages);
    const { upload, loading, error } = useImageUpload();

    // Sync internal state if defaults change (optional, careful with loops)
    useEffect(() => {
        if (JSON.stringify(defaultImages) !== JSON.stringify(images)) {
            setImages(defaultImages);
        }
    }, [defaultImages.length]); // Simple dependency check

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files) as File[];

        // Check count limit
        const remainingSlots = maxCount - images.length;
        if (files.length > remainingSlots) {
            alert(`最多只能上传 ${maxCount} 张图片`);
            return;
        }

        // Sequential upload to respect strict rate limiting per component logic if needed,
        // though the hook handles single file.
        // We upload one by one.
        const newUrls: string[] = [];

        for (const file of files) {
            const result = await upload(file);
            if (result.url) {
                newUrls.push(result.url);
            } else if (result.error) {
                alert(result.error);
            }
        }

        if (newUrls.length > 0) {
            const updatedList = [...images, ...newUrls];
            setImages(updatedList);
            onUploadSuccess(updatedList);
        }

        // Reset input
        e.target.value = '';
    };

    const removeImage = (index: number) => {
        const updatedList = images.filter((_, i) => i !== index);
        setImages(updatedList);
        onUploadSuccess(updatedList);
    };

    return (
        <div className="w-full">
            {/* Grid Layout */}
            <div className="grid grid-cols-3 gap-2">
                {images.map((src, index) => (
                    <div key={`${src}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 group">
                        <CapacitorImage src={src} className="w-full h-full object-cover" alt="uploaded" />
                        <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                ))}

                {/* Upload Button */}
                {images.length < maxCount && (
                    <label className={`relative aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin text-gray-400">progress_activity</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-gray-400 text-3xl">add_photo_alternate</span>
                                <span className="text-[10px] text-gray-400 mt-1 font-bold">
                                    {images.length}/{maxCount}
                                </span>
                            </>
                        )}
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple={maxCount > 1}
                            onChange={handleFileSelect}
                            disabled={loading}
                        />
                    </label>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-red-500 text-xs mt-2 font-bold animate-pulse">{error}</p>
            )}
        </div>
    );
};

export default ImageUploader;
