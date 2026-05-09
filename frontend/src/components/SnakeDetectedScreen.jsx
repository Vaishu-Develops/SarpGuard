import React from 'react';
import { AlertTriangle, Crosshair, MapPin, Clock, CheckCircle2, Terminal } from 'lucide-react';

export default function SnakeDetectedScreen({ onReset, locationName, confidence, timestamp, imagePath, status = 'VENOMOUS' }) {
    const isHarmless = status === 'HARMLESS';
    const alertTitle = isHarmless ? 'SYSTEM NOTIFICATION: SNAKE DETECTED' : 'CRITICAL ALERT: THREAT DETECTED';
    const alertSubtitle = isHarmless
        ? 'NON-VENOMOUS (HARMLESS) SPECIMEN IDENTIFIED. SECURITY NOTIFIED.'
        : 'LIVE SNAKE DETECTED. DO NOT APPROACH AREA.';

    // Theme configurations based on threat level
    const themeColor = isHarmless ? 'amber-500' : 'danger';
    const themeColorHex = isHarmless ? 'rgba(245,158,11,0.5)' : 'rgba(244,63,94,0.5)';
    const themeBg = isHarmless ? 'bg-amber-500/10' : 'bg-danger/10';
    const themeBorder = isHarmless ? 'border-amber-500/50' : 'border-danger/50';
    const themeText = isHarmless ? 'text-amber-500' : 'text-danger';
    const themeTextLight = isHarmless ? 'text-amber-200' : 'text-danger-light';

    return (
        <div className="w-full min-h-screen bg-surface flex flex-col items-center p-4 md:p-8 relative overflow-y-auto text-slate-200 z-10">

            {/* Emergency Broadcast Glitch Background */}
            <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,${themeColorHex}_0%,transparent_60%)] pointer-events-none z-0 mix-blend-screen opacity-40 animate-pulse`}></div>

            {/* Warning Tape Border Decoration */}
            <div className={`fixed top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--color-${isHarmless ? 'amber-500' : 'danger'})_10px,var(--color-${isHarmless ? 'amber-500' : 'danger'})_20px)] opacity-50 z-20`}></div>
            <div className={`fixed bottom-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--color-${isHarmless ? 'amber-500' : 'danger'})_10px,var(--color-${isHarmless ? 'amber-500' : 'danger'})_20px)] opacity-50 z-20`}></div>

            {/* Header Alert Matrix */}
            <div className={`w-full max-w-5xl ${themeBg} border ${themeBorder} rounded-none p-6 md:p-8 shadow-[0_0_40px_${themeColorHex}] mb-8 animate-float-up sticky top-4 z-30 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md`}>

                {/* Visual Corners */}
                <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${themeBorder}`}></div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${themeBorder}`}></div>

                <div className="flex items-center gap-6 text-center md:text-left w-full">
                    <div className={`relative flex items-center justify-center w-16 h-16 border-2 ${themeBorder} bg-black/50 ${themeText}`}>
                        <div className={`absolute inset-0 ${themeBg} animate-ping opacity-50`}></div>
                        <AlertTriangle size={32} strokeWidth={2} className="relative z-10" />
                    </div>
                    <div className="flex-1">
                        <h1 className={`text-2xl md:text-4xl font-black uppercase tracking-[0.1em] ${themeText} drop-shadow-[0_0_10px_${themeColorHex}]`}>
                            {alertTitle}
                        </h1>
                        <p className={`${themeTextLight} font-mono text-xs md:text-sm mt-2 tracking-widest uppercase`}>
                            {alertSubtitle}
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-5xl grid md:grid-cols-3 gap-6 mb-10 relative z-10">
                {/* Main Feed Card - takes up 2 columns */}
                <div className="md:col-span-2 bg-panel/80 backdrop-blur border border-slate-700 overflow-hidden animate-float-up flex flex-col relative" style={{ animationDelay: '0.1s' }}>

                    <div className="bg-slate-900 px-4 py-3 border-b border-slate-700 flex justify-between items-center text-slate-400 font-mono text-xs uppercase tracking-widest">
                        <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 ${themeText} bg-current rounded-full animate-pulse shadow-[0_0_5px_currentColor]`}></span>
                            LIVE SENSOR FEED // ISOLATED CROP
                        </div>
                        <span className="text-processing">CAM_04_FEED</span>
                    </div>

                    <div className="relative w-full aspect-video bg-[#05080f] flex items-center justify-center overflow-hidden flex-1 border-b border-slate-700 p-4">
                        {/* Grid Background in Video Area */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                        {/* Real video frame overlay */}
                        {imagePath ? (
                            <img src={imagePath} alt="Detected threat" className={`relative z-10 w-full h-full object-contain border border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.8)]`} />
                        ) : (
                            <div className="relative z-10 flex flex-col items-center justify-center text-slate-500 text-xs font-mono tracking-widest gap-2">
                                <AlertTriangle size={24} />
                                FEED TRANSMISSION FAILED
                            </div>
                        )}

                        {/* HUD Elements over image */}
                        <div className={`absolute top-6 right-6 ${themeBg} border ${themeBorder} ${themeText} font-mono px-3 py-1 text-[10px] tracking-widest uppercase z-20 backdrop-blur flex items-center gap-2`}>
                            <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></div>
                            REC • {timestamp}
                        </div>

                        {/* Target Box Overlay (Fake HUD graphic) */}
                        <div className="absolute inset-8 border border-[rgba(255,255,255,0.1)] pointer-events-none z-10 flex">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-processing/50"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-processing/50"></div>
                        </div>
                    </div>

                    <div className="p-4 bg-panel/50 flex flex-wrap gap-4 text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                        <span className={`flex items-center gap-2 border border-slate-700 bg-surface px-3 py-1.5 ${themeText}`}><Crosshair size={14} /> BOUNDING BOX GENERATED</span>
                        <span className="flex items-center gap-2 border border-slate-700 bg-surface px-3 py-1.5 text-processing"><MapPin size={14} /> TARGET LOCK ACQUIRED</span>
                    </div>
                </div>

                {/* Info Sidebar - takes up 1 column */}
                <div className="flex flex-col gap-6 animate-float-up" style={{ animationDelay: '0.2s' }}>

                    {/* Metadata Card */}
                    <div className="bg-panel/80 backdrop-blur border border-slate-700 p-6 flex flex-col gap-6 relative">
                        <h3 className="font-mono text-slate-300 text-xs tracking-[0.2em] border-b border-slate-700 pb-3 flex items-center gap-2 uppercase">
                            <Terminal size={14} /> Specimen Metadata
                        </h3>

                        <div className="flex flex-col gap-5">
                            <div className="flex gap-4 items-start">
                                <div className="border border-slate-600 bg-surface p-2 text-processing"><MapPin size={18} /></div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-mono tracking-widest mb-1">LOCATION VECTOR</p>
                                    <p className="text-slate-200 font-bold text-sm leading-tight uppercase tracking-wider">{locationName}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="border border-slate-600 bg-surface p-2 text-processing"><Clock size={18} /></div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-mono tracking-widest mb-1">TIME LOGGED</p>
                                    <p className="text-slate-200 font-bold text-sm leading-tight uppercase tracking-wider">{timestamp}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className={`border ${themeBorder} ${themeBg} p-2 ${themeText}`}><Crosshair size={18} /></div>
                                <div className="w-full">
                                    <p className="text-[10px] text-slate-500 font-mono tracking-widest mb-1">MATRIX CONFIDENCE</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-surface border border-slate-700 overflow-hidden relative">
                                            <div className={`absolute top-0 left-0 h-full ${themeBg.replace('/10', '')} shadow-[0_0_10px_${themeColorHex}]`} style={{ width: `${Math.min(100, confidence)}%`, backgroundColor: `var(--color-${isHarmless ? 'amber-500' : 'danger'})` }}></div>
                                        </div>
                                        <span className={`${themeText} font-black font-mono text-sm`}>{Number(confidence).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Log */}
                    <div className="bg-safe/10 border border-safe/30 p-6 relative overflow-hidden backdrop-blur">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-safe/5 rounded-bl-full pointer-events-none"></div>
                        <h3 className="font-mono text-safe mb-4 flex items-center gap-2 text-xs tracking-widest uppercase border-b border-safe/20 pb-3">
                            <CheckCircle2 size={16} /> Automated Response
                        </h3>
                        <ul className="space-y-4 relative border-l border-safe/30 ml-2 pl-4 text-[10px] font-mono tracking-widest text-slate-300">
                            <li className="relative">
                                <span className="absolute -left-[1.3rem] top-1 w-2 h-2 bg-safe shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                                <span className="text-safe mr-2">[OK]</span> Threat logged in central database
                            </li>
                            <li className="relative">
                                <span className="absolute -left-[1.3rem] top-1 w-2 h-2 bg-safe shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                                <span className="text-safe mr-2">[OK]</span> Location tagged as hazardous
                            </li>
                            <li className={`relative font-bold ${themeText} border ${themeBorder} ${themeBg} p-3 -ml-2 mt-2 break-words`}>
                                <span className={`absolute -left-[1.05rem] top-3.5 w-2 h-2 ${themeBg.replace('/10', '')} shadow-[0_0_5px_${themeColorHex}]`} style={{ backgroundColor: `var(--color-${isHarmless ? 'amber-500' : 'danger'})` }}></span>
                                <span className="mr-2 uppercase">[SENT]</span> WhatsApp alert delivered via Twilio Node
                            </li>
                        </ul>
                    </div>

                    <button
                        onClick={onReset}
                        className="w-full border border-slate-600 bg-surface/80 text-slate-200 py-3 text-[10px] font-mono tracking-[0.25em] uppercase hover:bg-slate-700 transition-colors"
                    >
                        CLOSE ALERT
                    </button>

                </div>
            </div>

            {/* Reset Action */}
            <button
                onClick={onReset}
                className="group relative px-6 py-3 border border-slate-500 text-[10px] text-slate-400 font-mono tracking-[0.2em] uppercase hover:bg-slate-800 hover:text-white transition-all animate-float-up"
                style={{ animationDelay: '0.3s' }}
            >
                <div className="absolute top-0 left-0 w-1 h-1 bg-slate-400 group-hover:bg-white"></div>
                <div className="absolute bottom-0 right-0 w-1 h-1 bg-slate-400 group-hover:bg-white"></div>
                [ DISMISS TO COMMAND CENTER ]
            </button>

        </div>
    );
}
