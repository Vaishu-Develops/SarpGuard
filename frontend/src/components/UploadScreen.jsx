import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, FolderOpen, MapPin, Search, Crosshair, Terminal, Activity, Video } from 'lucide-react';
import Webcam from 'react-webcam';

const LOCATIONS = [
    { id: 'block-a', name: 'BLOCK A - MAIN SENSOR' },
    { id: 'block-b', name: 'BLOCK B - GATE 2 SENSOR' },
    { id: 'block-c', name: 'BLOCK C - PARKING GRID' },
    { id: 'block-d', name: 'BLOCK D - GARDEN PERIMETER' },
    { id: 'block-e', name: 'BLOCK E - BACK GATE' },
    { id: 'block-f', name: 'BLOCK F - PLAYGROUND' },
];

export default function UploadScreen({ onAnalyze, file, setFile, location, setLocation }) {
    const fileInputRef = useRef(null);
    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [recordingTime, setRecordingTime] = useState(0);

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setIsCameraActive(false);
        }
    };

    const handleStartCaptureClick = useCallback(() => {
        setCapturing(true);
        setRecordingTime(10); // 10 second countdown

        mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
            mimeType: "video/webm"
        });
        mediaRecorderRef.current.addEventListener(
            "dataavailable",
            handleDataAvailable
        );
        mediaRecorderRef.current.start();

        // Auto stop after 10 seconds
        setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
        }, 10000);
    }, [webcamRef, setCapturing, mediaRecorderRef]);

    const handleDataAvailable = useCallback(
        ({ data }) => {
            if (data.size > 0) {
                setRecordedChunks((prev) => prev.concat(data));
            }
        },
        [setRecordedChunks]
    );

    const handleStopCaptureClick = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    }, [mediaRecorderRef]);

    // Format the chunks into a File object when recording stops
    useEffect(() => {
        if (!capturing && recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, {
                type: "video/webm"
            });
            // Create a fake File object to match the expected API
            const finalFile = new File([blob], `live_capture_${Date.now()}.webm`, { type: 'video/webm' });
            setFile(finalFile);
            setRecordedChunks([]); // reset
            setIsCameraActive(false);
        }
    }, [capturing, recordedChunks, setFile]);

    // Recording countdown timer
    useEffect(() => {
        if (capturing && recordingTime > 0) {
            const t = setTimeout(() => setRecordingTime(r => r - 1), 1000);
            return () => clearTimeout(t);
        }
        if (recordingTime === 0 && capturing) {
            setCapturing(false);
        }
    }, [capturing, recordingTime]);

    return (
        <div className="w-full h-full min-h-screen p-4 md:p-8 flex flex-col justify-center items-center relative z-10">
            {/* Top HUD decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-processing/50 to-transparent opacity-50"></div>
            <div className="absolute top-4 left-8 text-xs text-processing/70 tracking-widest hidden md:flex items-center gap-2">
                <Activity size={12} className="animate-pulse" />
                SYS.V3.0.1_ACTIVE
            </div>

            {/* Header Section */}
            <div className="mb-8 text-center animate-float-up w-full max-w-5xl">
                <div className="inline-flex items-center justify-center w-20 h-20 border border-processing/30 bg-processing/10 shadow-[0_0_20px_rgba(56,189,248,0.2)] mb-6 relative">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-processing"></div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-processing"></div>
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-processing"></div>
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-processing"></div>
                    <Crosshair size={32} className="text-processing animate-scan-spin-slow" />
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-[0.2em] mb-3 uppercase">
                    SarpGuard <span className="text-processing text-shadow-sm">Command</span>
                </h1>
                <p className="text-sm md:text-base text-processing/70 font-medium tracking-widest max-w-2xl mx-auto uppercase">
                    Threat Detection Uplink • Awaiting Visual Data Input
                </p>
            </div>

            {/* Main Dashboard Panel */}
            <div className="bg-panel/80 backdrop-blur border border-slate-700 p-6 md:p-10 max-w-5xl mx-auto w-full relative shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-float-up" style={{ animationDelay: '0.1s' }}>

                {/* Tech Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-processing/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-processing/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-processing/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-processing/50"></div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-12">

                    {/* Left Column: Location & Terminals */}
                    <div className="flex flex-col gap-6">
                        <div className="relative">
                            <label className="flex items-center gap-2 text-xs font-bold text-processing uppercase tracking-[0.15em] mb-4">
                                <MapPin size={16} />
                                Select Telemetry Array
                            </label>

                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-processing/20 opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
                                <select
                                    className="relative w-full p-4 pl-4 pr-12 text-slate-200 bg-surface/80 border border-slate-600 font-mono text-sm appearance-none focus:outline-none focus:border-processing focus:ring-1 focus:ring-processing transition-all cursor-pointer uppercase tracking-wider"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                >
                                    <option value="" disabled hidden>— INITIATE TARGET ZONE —</option>
                                    {LOCATIONS.map((loc) => (
                                        <option key={loc.id} value={loc.id} className="bg-panel text-slate-300">{loc.name}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-processing">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* Terminal Readout */}
                        <div className="bg-surface/90 border border-slate-700/50 p-5 mt-auto relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-processing/0 via-processing/30 to-processing/0"></div>
                            <h3 className="text-xs text-processing/80 mb-3 flex items-center gap-2 tracking-widest uppercase">
                                <Terminal size={14} /> System Log
                            </h3>
                            <div className="text-[11px] text-slate-400 font-mono flex flex-col gap-1.5 opacity-80">
                                <p>{'>'} INITIALIZING CONNECTION...</p>
                                <p className="text-safe">{'>'} NEURAL NET ONLINE.</p>
                                <p>{'>'} AWAITING VISUAL FEED FOR ANALYSIS.</p>
                                <p className={file ? "text-processing" : "text-slate-500"}>
                                    {'>'} {file ? `FILE LOADED: ${file.name}` : "NO FEED DETECTED."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Upload Grid */}
                    <div className="flex flex-col gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-processing uppercase tracking-[0.15em] mb-1">
                            Visual Data Input
                        </label>

                        {!file ? (
                            <div className="flex flex-col gap-4 h-full min-h-[240px]">
                                {isCameraActive ? (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black border border-processing overflow-hidden shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                                        <Webcam
                                            audio={false}
                                            ref={webcamRef}
                                            className="w-full h-full object-cover opacity-80"
                                        />

                                        {/* Camera Overlay HUD */}
                                        <div className="absolute inset-0 pointer-events-none border-[4px] border-black/50"></div>
                                        <div className="absolute inset-4 pointer-events-none border border-processing/30 flex">
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-processing"></div>
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-processing"></div>
                                        </div>

                                        <div className="absolute top-4 left-4 text-processing font-mono text-[10px] tracking-widest flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-processing animate-pulse"></div>
                                            LIVE SENSOR OPTICS
                                        </div>

                                        {/* Recording Controls */}
                                        <div className="absolute bottom-6 flex gap-4 z-20">
                                            {capturing ? (
                                                <button
                                                    onClick={handleStopCaptureClick}
                                                    className="bg-danger/90 border border-danger-light text-white font-bold tracking-widest text-[10px] uppercase px-4 py-2 flex items-center gap-2 animate-pulse"
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                                    RECORDING... 00:0{recordingTime}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleStartCaptureClick}
                                                    className="bg-processing/20 border border-processing text-processing font-bold tracking-widest text-[10px] uppercase px-4 py-2 hover:bg-processing hover:text-black transition-all flex items-center gap-2"
                                                >
                                                    <Video size={14} />
                                                    INITIATE CAPTURE LOOP
                                                </button>
                                            )}

                                            {!capturing && (
                                                <button
                                                    onClick={() => setIsCameraActive(false)}
                                                    className="bg-surface/80 border border-slate-600 text-slate-300 font-bold tracking-widest text-[10px] uppercase px-4 py-2 hover:bg-slate-700 transition-all"
                                                >
                                                    ABORT
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full flex-1">
                                        <button
                                            onClick={() => setIsCameraActive(true)}
                                            className="group relative flex flex-col items-center justify-center p-6 bg-surface/50 border border-slate-700 hover:border-processing/70 transition-all overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-processing/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="absolute top-2 right-2 text-[10px] text-slate-600 group-hover:text-processing/50">CAM_LINK_01</div>
                                            <Camera size={32} strokeWidth={1} className="text-slate-400 group-hover:text-processing transition-colors mb-3 relative z-10" />
                                            <span className="text-xs font-semibold text-slate-300 group-hover:text-processing tracking-widest uppercase relative z-10">Live Feed</span>
                                        </button>

                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="group relative flex flex-col items-center justify-center p-6 bg-surface/50 border border-slate-700 hover:border-processing/70 transition-all overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-processing/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="absolute top-2 left-2 w-2 h-2 bg-slate-700 group-hover:bg-processing/50"></div>
                                            <FolderOpen size={32} strokeWidth={1} className="text-slate-400 group-hover:text-processing transition-colors mb-3 relative z-10" />
                                            <span className="text-xs font-semibold text-slate-300 group-hover:text-processing tracking-widest uppercase relative z-10">Local File</span>

                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="video/*"
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-processing/10 border border-processing/30 p-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-processing animate-scan-shimmer shadow-[0_0_10px_rgba(56,189,248,1)]"></div>

                                <div className="w-12 h-12 border border-processing/50 flex items-center justify-center mb-4 text-processing animate-pulse">
                                    <Activity size={20} />
                                </div>
                                <h4 className="font-bold text-slate-200 text-sm tracking-wider text-center truncate w-full px-4 mb-1">{file.name}</h4>
                                <p className="text-processing/70 text-xs mb-6 tracking-widest">{(file.size / (1024 * 1024)).toFixed(2)} MB // READY</p>

                                <button
                                    onClick={() => setFile(null)}
                                    className="text-[10px] font-bold text-danger hover:text-danger-light tracking-widest uppercase border border-danger/30 hover:bg-danger/10 px-4 py-2 transition-all"
                                >
                                    [ ABORT UPLOAD ]
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-end">
                    <button
                        disabled={!file || !location}
                        onClick={onAnalyze}
                        className={`group relative px-8 py-4 text-xs font-bold tracking-[0.2em] uppercase transition-all overflow-hidden ${(!file || !location) ? 'bg-surface border border-slate-700 text-slate-600 cursor-not-allowed' : 'bg-processing/20 border border-processing text-processing hover:bg-processing hover:text-surface hover:shadow-[0_0_20px_rgba(56,189,248,0.5)]'}`}
                    >
                        {/* Button corner details */}
                        <div className="absolute top-0 left-0 w-1 h-1 bg-current opacity-50"></div>
                        <div className="absolute bottom-0 right-0 w-1 h-1 bg-current opacity-50"></div>

                        <div className="flex items-center gap-3 relative z-10">
                            <Search size={16} className={(!file || !location) ? 'opacity-50' : ''} />
                            EXECUTE ANALYSIS
                        </div>
                    </button>
                </div>
            </div>

            <div className="mt-8 text-[10px] text-slate-600 tracking-widest uppercase">
                SECURE END-TO-END ENCRYPTION // SARPGUARD PROTOCOL RUNNING
            </div>
        </div>
    );
}
