import React from 'react';
import { ShieldCheck, RefreshCcw, Terminal, ArrowRight, Shield } from 'lucide-react';

export default function AllClearScreen({ onReset, analysisTime }) {
    return (
        <div className="w-full min-h-screen bg-surface flex flex-col items-center justify-center p-6 md:p-12 text-slate-200 font-mono overflow-hidden relative z-10">

            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-safe/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-2xl w-full bg-panel/80 backdrop-blur border border-safe/30 p-8 md:p-12 relative shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-scale-in">

                {/* HUD Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-safe/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-safe/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-safe/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-safe/50"></div>

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center relative z-10 mb-10">
                    <div className="relative flex justify-center items-center w-24 h-24 mb-6">
                        {/* Scanning Ring */}
                        <div className="absolute inset-0 border border-safe/40 rounded-full animate-scan-spin-slow"></div>
                        <div className="absolute inset-2 border-2 border-dashed border-safe/20 rounded-full animate-scan-spin-reverse"></div>
                        <div className="absolute inset-0 bg-safe/10 rounded-full animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.3)]"></div>
                        <ShieldCheck size={40} className="text-safe relative z-10" />
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-[0.2em] mb-3 text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        Area<span className="text-safe">Secure</span>
                    </h1>
                    <p className="text-safe/70 text-xs md:text-sm font-bold tracking-[0.15em] uppercase border-b border-safe/30 pb-4 inline-block px-12">
                        NO ANOMALIES DETECTED IN VISUAL FEED
                    </p>
                </div>

                {/* Cyberpunk Stats Section */}
                <div className="grid grid-cols-2 gap-4 bg-surface border border-slate-700/50 p-6 mb-10 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-safe"></div>

                    <div className="flex flex-col items-start gap-1 p-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                            <Terminal size={12} className="text-safe" /> PROCESS CYCLE
                        </p>
                        <p className="text-2xl font-black text-slate-200">{analysisTime}s</p>
                    </div>

                    <div className="flex flex-col items-start gap-1 p-2 border-l border-slate-700/50 pl-6">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                            <Shield size={12} className="text-safe" /> THREAT LEVEL
                        </p>
                        <p className="text-2xl font-black text-safe uppercase tracking-widest">ZERO</p>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-center">
                    <button
                        onClick={onReset}
                        className="group relative px-8 py-4 border border-safe text-safe tracking-[0.2em] font-bold text-xs uppercase hover:bg-safe hover:text-surface transition-all overflow-hidden flex items-center gap-3"
                    >
                        {/* Button Corners */}
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-safe opacity-50 group-hover:bg-surface"></div>
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-safe opacity-50 group-hover:bg-surface"></div>

                        <RefreshCcw size={16} className="group-hover:animate-scan-spin-reverse" />
                        INITIATE NEW SCAN
                        <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            <div className="mt-8 text-[10px] text-safe/50 tracking-[0.3em] uppercase">
                ALL SYSTEMS OPERATIONAL // STANDBY MODE
            </div>
        </div>
    );
}
