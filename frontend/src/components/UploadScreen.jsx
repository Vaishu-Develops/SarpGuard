import React, { useRef } from 'react';
import { Camera, FolderOpen, MapPin, Search } from 'lucide-react';

const LOCATIONS = [
    { id: 'block-a', name: 'Block A - Main Entrance' },
    { id: 'block-b', name: 'Block B - Gate 2' },
    { id: 'block-c', name: 'Block C - Parking Area' },
    { id: 'block-d', name: 'Block D - Garden Side' },
    { id: 'block-e', name: 'Block E - Back Gate' },
    { id: 'block-f', name: 'Block F - Playground' },
];

export default function UploadScreen({ onAnalyze, file, setFile, location, setLocation }) {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (selected) setFile(selected);
    };

    const handleCameraCapture = (e) => {
        const selected = e.target.files?.[0];
        if (selected) setFile(selected);
    };

    return (
        <div className="w-full max-w-5xl mx-auto h-screen p-6 md:p-12 flex flex-col justify-center">

            {/* Header Section */}
            <div className="mb-10 text-center animate-float-up">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-2xl mb-6 shadow-sm">
                    <span className="text-4xl filter drop-shadow-sm">🐍</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-3">
                    SarpGuard <span className="text-emerald-500">Security</span>
                </h1>
                <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
                    AI-Powered Snake Detection. Upload security footage for instant, frame-by-frame analysis to ensure area safety.
                </p>
            </div>

            {/* Main Dashboard Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 max-w-4xl mx-auto w-full animate-float-up" style={{ animationDelay: '0.1s' }}>
                <div className="grid md:grid-cols-2 gap-12">

                    {/* Left Column: Location */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
                                <MapPin size={18} className="text-processing" />
                                Capture Location
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 pl-5 pr-12 text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium text-lg appearance-none focus:outline-none focus:border-processing focus:ring-4 focus:ring-processing/20 transition-all cursor-pointer"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                >
                                    <option value="" disabled hidden>— Select Campus Zone —</option>
                                    {LOCATIONS.map((loc) => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 mt-auto">
                            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                <Search size={18} /> System Ready
                            </h3>
                            <p className="text-sm text-blue-700 leading-relaxed">
                                Select a location and upload a video file to begin automated processing. The AI model will scan every frame for venomous and non-venomous threats.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Upload */}
                    <div className="flex flex-col gap-4">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-widest mb-1">
                            Video Source
                        </label>

                        {!file ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full min-h-[220px]">
                                <button
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="group relative flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-processing hover:bg-slate-50 transition-all overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-processing/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <Camera size={40} strokeWidth={1.5} className="text-slate-400 group-hover:text-processing transition-colors mb-4 relative z-10" />
                                    <span className="font-semibold text-slate-700 group-hover:text-processing relative z-10">Use Camera</span>
                                    <span className="text-xs text-slate-500 mt-1 relative z-10">Record live</span>

                                    <input
                                        ref={cameraInputRef}
                                        type="file"
                                        accept="video/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleCameraCapture}
                                    />
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group relative flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-processing hover:bg-slate-50 transition-all overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-processing/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <FolderOpen size={40} strokeWidth={1.5} className="text-slate-400 group-hover:text-processing transition-colors mb-4 relative z-10" />
                                    <span className="font-semibold text-slate-700 group-hover:text-processing relative z-10">Upload File</span>
                                    <span className="text-xs text-slate-500 mt-1 relative z-10">From computer</span>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[220px] bg-processing/5 border-2 border-processing/30 rounded-2xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-processing animate-scan-shimmer"></div>
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 text-2xl">
                                    🎥
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg text-center truncate w-full px-4">{file.name}</h4>
                                <p className="text-slate-500 text-sm mt-1 mb-6">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>

                                <button
                                    onClick={() => setFile(null)}
                                    className="text-sm font-medium text-danger hover:text-danger-dark bg-danger/10 hover:bg-danger/20 px-4 py-2 rounded-full transition-colors"
                                >
                                    Remove File
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Action Button */}
                <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end">
                    <button
                        disabled={!file || !location}
                        onClick={onAnalyze}
                        className="w-full md:w-auto px-10 py-4 bg-slate-900 disabled:bg-slate-300 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <Search size={20} className={(!file || !location) ? 'opacity-50' : 'text-processing-light'} />
                        START ANALYSIS
                    </button>
                </div>
            </div>

        </div>
    );
}
