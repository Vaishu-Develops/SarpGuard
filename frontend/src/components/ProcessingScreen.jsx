import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function ProcessingScreen({ isReady, onComplete, locationName }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let current = progress;

        if (progress === 100 && isReady) {
            const t = setTimeout(() => onComplete(), 400); // Small delay for UX
            return () => clearTimeout(t);
        }

        if (progress === 100 && !isReady) return;

        const timer = setInterval(() => {
            // Hold at 94% if waiting on network
            if (!isReady && current > 94) return;

            current += 1.5 + Math.random() * 2;
            if (current > 100) current = 100;

            setProgress(Math.floor(current));
        }, 50);

        return () => clearInterval(timer);
    }, [progress, isReady, onComplete]);

    return (
        <div className="w-full flex-1 min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden text-white">

            {/* Background ambient effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-processing/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center animate-scale-in max-w-lg w-full">
                {/* Dynamic Scanning Visualization */}
                <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 border-[3px] border-dashed border-processing/30 rounded-full animate-scan-spin-slow"></div>
                    {/* Middle Ring */}
                    <div className="absolute inset-4 border-[2px] border-processing/50 rounded-full animate-scan-spin-reverse delay-150 relative">
                        <div className="absolute top-0 left-1/2 w-3 h-3 bg-processing-light rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                    {/* Inner Ring */}
                    <div className="absolute inset-10 border-[4px] border-processing rounded-full opacity-60 animate-scan-pulse"></div>

                    {/* Center Logo */}
                    <div className="relative z-10 bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center border-2 border-processing/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                        <span className="text-4xl filter drop-shadow-md">🐍</span>
                    </div>
                </div>

                {/* Typography */}
                <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                    <Loader2 className="animate-spin text-processing" size={28} />
                    Analyzing Footage
                </h2>
                <p className="text-slate-400 text-lg mb-10 font-medium">Scanning <span className="text-slate-200">"{locationName}"</span></p>

                {/* Progress Display */}
                <div className="w-full bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-end mb-3">
                        <div className="flex items-center gap-2 text-processing-light text-sm font-semibold tracking-wider uppercase">
                            <ShieldCheck size={18} />
                            AI Pipeline Active
                        </div>
                        <span className="text-3xl font-black text-white font-mono">{progress}%</span>
                    </div>

                    <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden relative">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-processing-dark to-processing-light rounded-full transition-all duration-200 ease-out"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-scan-shimmer"></div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        <p className="text-xs text-slate-500 font-mono flex justify-between">
                            <span>Model: YOLOv8-Nano</span>
                            <span className="text-processing">Active</span>
                        </p>
                        <p className="text-xs text-slate-500 font-mono flex justify-between">
                            <span>Frame Extraction:</span>
                            <span className="text-processing">Validating</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
