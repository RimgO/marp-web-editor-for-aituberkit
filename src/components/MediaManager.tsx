import React, { useState, useEffect } from 'react';

interface ImageFile {
    name: string;
    url: string;
}

interface MediaManagerProps {
    onInsert: (url: string) => void;
    onClose: () => void;
}

const MediaManager: React.FC<MediaManagerProps> = ({ onInsert, onClose }) => {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [uploading, setUploading] = useState(false);

    const fetchImages = async () => {
        try {
            const res = await fetch('/api/images');
            if (res.ok) {
                const data = await res.json();
                setImages(data.images);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                await fetchImages();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-white/10 animate-fade-in-up">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Media Library</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-4 border-b border-white/10 bg-[#0f172a]/50">
                    <label
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-[#38bdf8] hover:bg-[#38bdf8]/10 transition-all group"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            handleUpload(e.dataTransfer.files);
                        }}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-3 text-gray-400 group-hover:text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            <p className="mb-2 text-sm text-gray-400 group-hover:text-[#38bdf8]">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF, SVG</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            multiple
                            onChange={(e) => handleUpload(e.target.files)}
                            accept="image/*"
                        />
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {uploading && <div className="text-center text-[#38bdf8] mb-4 animate-pulse">Uploading...</div>}

                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                        {images.map((img) => (
                            <div
                                key={img.name}
                                className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer border border-transparent hover:border-[#38bdf8] transition-all shadow-md hover:shadow-lg hover:shadow-[#38bdf8]/20"
                                onClick={() => onInsert(img.url)}
                                title={img.name}
                            >
                                <img
                                    src={img.url}
                                    alt={img.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                    <span className="text-white text-xs font-bold px-2 py-1 bg-[#38bdf8] rounded-full">Insert</span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 truncate text-[10px] text-gray-300 text-center">
                                    {img.name}
                                </div>
                            </div>
                        ))}
                        {images.length === 0 && !uploading && (
                            <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-10">
                                <span className="text-3xl mb-2">🖼️</span>
                                <p>No images found yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaManager;
