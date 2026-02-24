import React from 'react';
import { Phone, AlertTriangle, Crosshair, MapPin, Clock, CheckCircle2 } from 'lucide-react';

export default function SnakeDetectedScreen({ onReset, locationName, confidence, timestamp, imagePath, status = 'VENOMOUS' }) {
    const isHarmless = status === 'HARMLESS';

    return (
        <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center p-6 md:p-12 relative overflow-y-auto">

            {/* Absolute color glow background */}
            <div className={`absolute top-0 left-0 w-full h-96 bg-gradient-to-b ${isHarmless ? 'from-amber-400/20' : 'from-danger/20'} to-transparent pointer-events-none`}></div>

            {/* Header Alert */}
            <div className={`w-full max-w-4xl text-white rounded-3xl p-8 shadow-xl mb-8 animate-float-up sticky top-6 z-20 flex flex-col md:flex-row items-center justify-between gap-6 border-4 mt-4 ${isHarmless ? 'bg-amber-500 border-amber-500/50 shadow-amber-500/30' : 'bg-danger border-danger/50 shadow-danger/30'}`}>
                <div className="flex items-center gap-6 text-center md:text-left">
                    <div className={`bg-white p-4 rounded-full shadow-inner relative ${isHarmless ? 'text-amber-500' : 'text-danger'}`}>
                        <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75"></div>
                        <AlertTriangle size={48} strokeWidth={2.5} className="relative z-10" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">System Alert: {isHarmless ? 'Snake Detected' : 'Threat Detected'}</h1>
                        <p className={`${isHarmless ? 'text-amber-100' : 'text-danger-light'} font-medium text-lg mt-1 opacity-90`}>
                            {isHarmless ? 'Non-venomous snake identified. Security notified for safe removal.' : 'Please do not approach the area. Security notified.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-4xl grid md:grid-cols-3 gap-8 mb-12">
                {/* Main Feed Card - takes up 2 columns */}
                <div className="md:col-span-2 bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden animate-float-up" style={{ animationDelay: '0.1s' }}>
                    <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center text-slate-300 font-mono text-sm max-h-[14rem]">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-danger rounded-full animate-pulse"></span>
                            Live Analysis Feed
                        </div>
                        <span>CAM_04_FEED</span>
                    </div>

                    <div className="relative w-full aspect-video bg-slate-800 flex items-center justify-center overflow-hidden">
                        {/* Real video frame overlay */}
                        {imagePath ? (
                            <img src={imagePath} alt="Detected threat" className="absolute inset-0 w-full h-full object-contain" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Image Failed to Load</div>
                        )}

                        <div className="absolute top-4 right-4 text-white font-mono bg-black/50 px-3 py-1 rounded text-xs">
                            REC • {timestamp}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 flex flex-wrap gap-4 text-sm font-medium text-slate-600">
                        <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded shadow-sm border border-slate-200"><Crosshair size={16} className="text-danger" /> Bounding Box Generated</span>
                        <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded shadow-sm border border-slate-200"><MapPin size={16} className="text-processing" /> Coordinates Locked</span>
                    </div>
                </div>

                {/* Info Sidebar - takes up 1 column */}
                <div className="flex flex-col gap-6 animate-float-up" style={{ animationDelay: '0.2s' }}>

                    {/* Metadata Card */}
                    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 flex flex-col gap-5">
                        <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-3">Detection Metadata</h3>

                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4 items-start">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><MapPin size={24} /></div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Location</p>
                                    <p className="text-slate-800 font-semibold leading-tight">{locationName}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Clock size={24} /></div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Time Logged</p>
                                    <p className="text-slate-800 font-semibold leading-tight">{timestamp}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className={`p-3 rounded-xl ${isHarmless ? 'bg-amber-100 text-amber-600' : 'bg-danger/10 text-danger'}`}><Crosshair size={24} /></div>
                                <div className="w-full">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">AI Confidence</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${isHarmless ? 'bg-amber-500' : 'bg-danger'}`} style={{ width: `${Math.min(100, confidence)}%` }}></div>
                                        </div>
                                        <span className={`${isHarmless ? 'text-amber-600' : 'text-danger'} font-black text-lg`}>{Number(confidence).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Log */}
                    <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-6">
                        <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-500" size={20} />
                            Automated Response
                        </h3>
                        <ul className="space-y-3 relative border-l-2 border-emerald-200 ml-3 pl-5 text-sm font-medium text-emerald-800">
                            <li className="relative">
                                <span className="absolute -left-[1.65rem] top-1 w-3 h-3 bg-emerald-500 rounded-full"></span>
                                Threat logged in database
                            </li>
                            <li className="relative">
                                <span className="absolute -left-[1.65rem] top-1 w-3 h-3 bg-emerald-500 rounded-full"></span>
                                Location tagged as hazardous
                            </li>
                            <li className="relative font-bold text-emerald-900 border border-emerald-300 bg-emerald-100 p-2 rounded -ml-2 mt-1">
                                <span className="absolute -left-[1.125rem] top-3 w-3 h-3 bg-emerald-500 rounded-full"></span>
                                WhatsApp alert delivered to +91-XXXXX (Secretary)
                            </li>
                        </ul>
                    </div>

                </div>
            </div>

            {/* Reset Action */}
            <button
                onClick={onReset}
                className="text-slate-500 hover:text-slate-800 font-bold tracking-wide underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 transition-colors animate-float-up"
                style={{ animationDelay: '0.3s' }}
            >
                Dismiss to Dashboard
            </button>

        </div>
    );
}
