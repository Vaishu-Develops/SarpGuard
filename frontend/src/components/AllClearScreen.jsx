import React from 'react';
import { CheckCircle, RefreshCcw, Shield } from 'lucide-react';

export default function AllClearScreen({ onReset, analysisTime }) {
    return (
        <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12">

            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-scale-in">

                {/* Hero Section */}
                <div className="bg-gradient-to-br from-safe to-safe-dark p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-12 translate-x-12"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full translate-y-24 -translate-x-12"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white text-safe w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-safe-dark/50">
                            <Shield size={48} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2">Clear Region</h1>
                        <p className="text-safe-light text-lg font-medium opacity-90 max-w-sm">No snakes or venomous threats detected in the processed footage.</p>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="p-8 md:p-12 bg-white">
                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-10">
                        <div className="flex flex-col items-center text-center gap-2 p-4">
                            <span className="text-3xl text-slate-700">⏱️</span>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">Process Time</p>
                            <p className="text-2xl font-black text-slate-800">{analysisTime}s</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-4 border-l border-slate-200">
                            <span className="text-3xl text-slate-700">🛡️</span>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">Status Level</p>
                            <p className="text-2xl font-black text-safe uppercase">Secure</p>
                        </div>
                    </div>

                    <button
                        onClick={onReset}
                        className="w-full bg-slate-900 text-white font-bold text-lg p-5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex justify-center items-center gap-3"
                    >
                        <RefreshCcw size={20} />
                        PROCESS NEW FOOTAGE
                    </button>
                </div>
            </div>
        </div>
    );
}
