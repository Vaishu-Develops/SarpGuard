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

    const [isLogged, setIsLogged] = useState(false);

    const handleLogClick = () => {
        setIsLogged(true);
        if (onLogTamper) onLogTamper();
    };

    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden bg-surface">
            {/* Animated warning stripes at top and bottom */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 animate-pulse" />

            {/* Ambient pulse */}
            <div className={`absolute inset-0 bg-yellow-500/5 transition-opacity duration-700 pointer-events-none ${pulse ? 'opacity-100' : 'opacity-0'}`} />

            {/* Corner decorations */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-yellow-500/50" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-yellow-500/50" />
            <div className="absolute bottom-8 left-4 w-8 h-8 border-b-2 border-l-2 border-yellow-500/50" />
            <div className="absolute bottom-8 right-4 w-8 h-8 border-b-2 border-r-2 border-yellow-500/50" />

            {/* Main content card */}
            <div className="max-w-xl w-full bg-panel/90 backdrop-blur border border-yellow-500/40 p-8 relative shadow-[0_0_40px_rgba(234,179,8,0.15)]">

                {/* Icon + title */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 border-2 border-yellow-500/60 flex items-center justify-center relative bg-yellow-500/10">
                            {isLogged ? (
                                <ShieldAlert size={44} className="text-green-400" />
                            ) : (
                                <Phone size={44} className="text-yellow-400" />
                            )}
                            <div className={`absolute -top-1 -right-1 w-6 h-6 ${isLogged ? 'bg-green-500' : 'bg-orange-500'} rounded-full flex items-center justify-center`}>
                                <AlertTriangle size={12} className="text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-yellow-400 text-xs font-bold tracking-[0.3em] uppercase mb-2 font-mono">
                            {isLogged ? '✅ INCIDENT OFFICIALLY LOGGED' : '⚠ MEDIA SPOOF DETECTED ⚠'}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-widest uppercase mb-1">
                            {isLogged ? 'SECURITY' : 'PHONE VIDEO'}
                        </h1>
                        <h1 className={`text-2xl md:text-3xl font-black ${isLogged ? 'text-green-400' : 'text-yellow-400'} tracking-widest uppercase`}>
                            {isLogged ? 'REINFORCED' : 'DETECTED'}
                        </h1>
                    </div>
                </div>

                {/* Divider */}
                <div className={`w-full h-px bg-gradient-to-r from-transparent via-${isLogged ? 'green-500' : 'yellow-500'}/40 to-transparent mb-6`} />

                {/* Explanation block */}
                <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                        <ShieldAlert size={16} className={isLogged ? "text-green-400 mt-0.5" : "text-yellow-400 mt-0.5"} />
                        <p className="text-slate-300 text-sm font-mono leading-relaxed">
                            {isLogged ? (
                                <>This attempt to trigger a false alarm has been <span className="text-green-400 font-bold">PERMANENTLY LOGGED</span> to the server. The security secretary has been notified of the tamper attempt at <span className="text-slate-100 font-bold">{locationName || 'this site'}</span>.</>
                            ) : (
                                <>The system detected a <span className="text-yellow-400 font-bold">phone screen or video recording</span>. The alert has been <span className="text-green-400 font-bold">BLOCKED</span> to prevent false alarms.</>
                            )}
                        </p>
                    </div>
                    {!isLogged && (
                        <div className="flex items-start gap-3">
                            <FileWarning size={16} className="text-orange-400 mt-0.5" />
                            <p className="text-slate-400 text-xs font-mono leading-relaxed">
                                Reason: <span className="text-slate-300">{spoofReason || "Pixel pattern mismatch detected"}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onRetry}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-surface border border-slate-700 text-slate-400 font-bold text-xs tracking-[0.2em] uppercase hover:bg-slate-700 hover:text-white transition-all"
                    >
                        <RefreshCw size={14} />
                        RETRY
                    </button>
                    <button
                        onClick={handleLogClick}
                        disabled={isLogged}
                        className={`flex items-center justify-center gap-2 px-6 py-4 font-bold text-xs tracking-[0.2em] uppercase transition-all border ${isLogged
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : 'bg-danger/20 border-danger text-danger hover:bg-danger hover:text-white'
                            }`}
                    >
                        <ShieldAlert size={14} />
                        {isLogged ? 'LOGGED' : 'LOG TAMPER'}
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
