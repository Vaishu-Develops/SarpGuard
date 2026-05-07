import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, Activity, Terminal, Crosshair, Hexagon } from 'lucide-react';

export default function ProcessingScreen({ isReady, onComplete, locationName }) {
    const [progress, setProgress] = useState(0);
    const [logText, setLogText] = useState('INITIALIZING YOLOV8N PRE-FILTER...');

    useEffect(() => {
        let current = progress;

        if (progress === 100 && isReady) {
            const t = setTimeout(() => onComplete(), 500);
            return () => clearTimeout(t);
        }

        if (progress === 100 && !isReady) return;

        const failsafe = setTimeout(() => {
            if (!isReady && screen === 'processing') {
                console.error("Analysis Timeout Reached");
            }
        }, 30000); // 30s max wait

        const timer = setInterval(() => {
            // Hold at 94% if waiting on network
            if (!isReady && current > 94) return;

            current += 1.2 + Math.random() * 2;
            if (current > 100) current = 100;

            setProgress(Math.floor(current));

            // Cyberpunk log updates based on progress
            if (current > 20 && current < 50) setLogText('SCANNING SUPERVISION LAYER...');
            else if (current >= 50 && current < 80) setLogText('ISOLATING BOUNDING BOX CROPS...');
            else if (current >= 80 && current < 95) setLogText('QUERYING SNAKE-VENOM/1 CLASSIFIER...');
            else if (current >= 95) setLogText('RESOLVING DETECTION MATRIX...');

        }, 60);

        return () => {
            clearInterval(timer);
            clearTimeout(failsafe);
        };
    }, [progress, isReady, onComplete]);

    return (
        <div className="w-full h-full min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden text-slate-200 z-10">

            {/* Background Grid & Glare */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-processing/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0B0F19_70%)] pointer-events-none z-0"></div>

            {/* Corner Bracket Decorations */}
            <div className="absolute top-8 left-8 w-16 h-16 border-t-[3px] border-l-[3px] border-processing/40"></div>
            <div className="absolute top-8 right-8 w-16 h-16 border-t-[3px] border-r-[3px] border-processing/40"></div>
            <div className="absolute bottom-8 left-8 w-16 h-16 border-b-[3px] border-l-[3px] border-processing/40"></div>
            <div className="absolute bottom-8 right-8 w-16 h-16 border-b-[3px] border-r-[3px] border-processing/40"></div>

            <div className="relative z-10 flex flex-col items-center animate-scale-in max-w-2xl w-full">

                {/* HUD Typography / Header */}
                <div className="text-center mb-12">
                    <h2 className="text-2xl md:text-3xl font-black tracking-[0.3em] mb-2 flex items-center justify-center gap-4 text-slate-100 uppercase">
                        <Activity className="animate-pulse text-processing" size={28} />
                        Network Processing
                    </h2>
                    <p className="text-processing/70 text-xs md:text-sm tracking-widest uppercase font-bold border-b border-processing/30 pb-4 inline-block px-8">
                        TARGET ZONE: <span className="text-white">{locationName}</span>
                    </p>
                </div>

                {/* Cyberpunk Scanning Sphere / Hexagon */}
                <div className="relative w-72 h-72 mb-16 flex items-center justify-center">

                    {/* Outer Hexagon */}
                    <div className="absolute inset-0 text-processing/20 animate-scan-spin-slow flex items-center justify-center">
                        <Hexagon size={280} strokeWidth={0.5} />
                    </div>

                    {/* Middle Dashed Ring */}
                    <div className="absolute inset-6 border lg border-dashed border-processing/40 rounded-full animate-scan-spin-reverse delay-150"></div>

                    {/* Target Crosshairs */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Crosshair size={320} strokeWidth={0.5} className="text-processing/30 animate-pulse" />
                    </div>

                    {/* Inner Solid Pulse Ring */}
                    <div className="absolute inset-16 border-2 border-processing rounded-full opacity-60 animate-scan-pulse shadow-[0_0_30px_rgba(56,189,248,0.3)]"></div>

                    {/* Core Element */}
                    <div className="relative z-10 bg-panel w-24 h-24 rounded-full flex items-center justify-center border border-processing shadow-[0_0_40px_rgba(56,189,248,0.5)]">
                        <Loader2 className="animate-spin text-processing" size={40} />
                    </div>

                    {/* HUD Data Tags */}
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-[9px] text-processing tracking-widest font-bold">
                        LAT: 34.0522<br />LNG: 118.2437
                    </div>
                    <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-[9px] text-processing tracking-widest font-bold text-right">
                        SYS: ONLINE<br />UPLINK: ACTIVE
                    </div>
                </div>

                {/* Progress & Telemetry Terminal */}
                <div className="w-full bg-panel/90 backdrop-blur rounded-none p-6 border border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-processing"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-processing"></div>

                    <div className="flex justify-between items-end mb-4">
                        <div className="flex items-center gap-3 text-processing text-xs font-bold tracking-[0.2em] uppercase">
                            <Terminal size={16} />
                            Neural Analysis Matrix
                        </div>
                        <span className="text-4xl font-black text-white font-mono">{progress}%</span>
                    </div>

                    {/* Progress Bar High-Tech */}
                    <div className="h-2 w-full bg-surface border border-slate-700/50 mb-6 relative">
                        <div
                            className="absolute top-0 left-0 h-full bg-processing transition-all duration-100 ease-out shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.2)_4px,rgba(0,0,0,0.2)_8px)]"></div>
                        </div>
                    </div>

                    {/* Cyberpunk Telemetry Feed */}
                    <div className="flex flex-col gap-2 font-mono text-[10px] uppercase tracking-widest">
                        <div className="flex justify-between border-b border-slate-700/50 pb-2">
                            <span className="text-slate-500">OPERATION PHASE:</span>
                            <span className="text-processing animate-pulse">{logText}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700/50 pb-2">
                            <span className="text-slate-500">FRAME EXTRACTION:</span>
                            <span className="text-slate-300">VALIDATING (10K BATCH)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">THREAT GATEWAY:</span>
                            <span className="text-slate-300">ARMED (60% THRESHOLD)</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
