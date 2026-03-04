import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, FileWarning, AlertTriangle, Phone } from 'lucide-react';

export default function SpoofWarningScreen({
    onRetry,
    onLogTamper,
    locationName,
    snakeConfidence,
    spoofReason,
    timestamp,
}) {
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        const t = setInterval(() => setPulse(p => !p), 900);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden bg-surface">
            {/* Animated warning stripes at top and bottom */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 animate-scan-shimmer" />
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 animate-scan-shimmer" />

            {/* Ambient pulse */}
            <div className={`absolute inset-0 bg-yellow-500/5 transition-opacity duration-700 pointer-events-none ${pulse ? 'opacity-100' : 'opacity-0'}`} />

            {/* Corner decorations */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-yellow-500/50" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-yellow-500/50" />
            <div className="absolute bottom-8 left-4 w-8 h-8 border-b-2 border-l-2 border-yellow-500/50" />
            <div className="absolute bottom-8 right-4 w-8 h-8 border-b-2 border-r-2 border-yellow-500/50" />

            {/* HUD badge top left */}
            <div className="absolute top-6 left-8 text-yellow-500/60 text-[10px] font-mono tracking-widest uppercase flex items-center gap-2">
                <AlertTriangle size={12} className="animate-pulse" />
                ANTI-SPOOF LAYER ACTIVE
            </div>

            {/* Main content card */}
            <div className="max-w-xl w-full bg-panel/90 backdrop-blur border border-yellow-500/40 p-8 relative shadow-[0_0_40px_rgba(234,179,8,0.15)]">

                {/* Icon + title */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 border-2 border-yellow-500/60 flex items-center justify-center relative bg-yellow-500/10">
                            <Phone size={44} className="text-yellow-400" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                <AlertTriangle size={12} className="text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-yellow-400 text-xs font-bold tracking-[0.3em] uppercase mb-2 font-mono">
                            ⚠ MEDIA SPOOF DETECTED ⚠
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-widest uppercase mb-1">
                            PHONE VIDEO
                        </h1>
                        <h1 className="text-2xl md:text-3xl font-black text-yellow-400 tracking-widest uppercase">
                            DETECTED
                        </h1>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent mb-6" />

                {/* Snake was still found */}
                <div className="bg-orange-500/10 border border-orange-500/30 p-4 mb-5 text-center">
                    <p className="text-orange-300 font-bold text-sm tracking-widest uppercase">
                        🐍 Snake Pattern Found: {snakeConfidence?.toFixed(1) ?? '—'}%
                    </p>
                    <p className="text-slate-400 text-xs mt-1 font-mono">
                        But the source is a screen / recorded media — NOT a real snake
                    </p>
                </div>

                {/* Explanation block */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                        <ShieldAlert size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-300 text-sm font-mono leading-relaxed">
                            The system detected characteristics of a <span className="text-yellow-400 font-bold">phone screen or video recording</span> in this feed. The WhatsApp alert has been <span className="text-green-400 font-bold">BLOCKED</span> to prevent false alarms.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <FileWarning size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-400 text-xs font-mono leading-relaxed">
                            Detection: <span className="text-slate-300">{spoofReason || "Screen pixel pattern & uniform light field detected"}</span>
                        </p>
                    </div>
                </div>

                {/* Metadata bar */}
                <div className="bg-surface/80 border border-slate-700 p-3 flex flex-wrap gap-4 text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-8">
                    <span>📍 {locationName || 'Unknown'}</span>
                    <span>⏱ {timestamp || '—'}</span>
                    <span className="text-yellow-500 font-bold">🚨 TAMPER LOG CREATED</span>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onRetry}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-processing/20 border border-processing text-processing font-bold text-xs tracking-[0.2em] uppercase hover:bg-processing hover:text-surface transition-all"
                    >
                        <RefreshCw size={14} />
                        RETRY SCAN
                    </button>
                    <button
                        onClick={onLogTamper}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-danger/20 border border-danger text-danger font-bold text-xs tracking-[0.2em] uppercase hover:bg-danger hover:text-white transition-all"
                    >
                        <ShieldAlert size={14} />
                        LOG TAMPER
                    </button>
                </div>
            </div>

            {/* Bottom note */}
            <div className="mt-8 text-[10px] text-slate-600 font-mono tracking-widest uppercase text-center">
                SARPGUARD ANTI-SPOOFING © LAYER 0 ACTIVE
            </div>
        </div>
    );
}
