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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function UploadScreen({ onAnalyze, onLiveSnakeDetected, onLiveSpoofDetected, file, setFile, location, setLocation }) {
    const fileInputRef = useRef(null);
    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const canvasRef = useRef(null);
    const hasTriggeredRef = useRef(false);
    const liveSnakeRequestInFlightRef = useRef(false);
    const liveDeviceRequestInFlightRef = useRef(false);
    const motionLoopRafRef = useRef(null);
    const motionThrottleRef = useRef(0);
    const motionPreviousFrameRef = useRef(null);

    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isLiveDetecting, setIsLiveDetecting] = useState(false);
    const [liveDetections, setLiveDetections] = useState([]);
    const [liveDeviceBoxes, setLiveDeviceBoxes] = useState([]);
    const [liveSpoofAlert, setLiveSpoofAlert] = useState(null); // null | { detected: bool, reason: string }
    const [motionBox, setMotionBox] = useState(null);
    // Static snake tracking: track frames where a snake was found but didn't move
    const snakePositionHistoryRef = useRef([]);
    const [staticWarning, setStaticWarning] = useState(false);

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

    // LOOP 1: Fast device-only detection (400ms) — draws phone/TV/book boxes instantly
    useEffect(() => {
        if (!isLiveDetecting || !isCameraActive || hasTriggeredRef.current) {
            setLiveDeviceBoxes([]);
            setLiveSpoofAlert(null);
            return;
        }

        if (liveDeviceRequestInFlightRef.current) {
            return;
        }

        const detectDevice = async () => {
            if (!webcamRef.current) return;
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;
            if (liveDeviceRequestInFlightRef.current) return;
            liveDeviceRequestInFlightRef.current = true;
            try {
                const res = await fetch(`${API_BASE_URL}/detect-device`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ frame: imageSrc })
                });
                if (res.ok) {
                    const data = await res.json();
                    setLiveDeviceBoxes(data.device_boxes || []);
                    if (data.is_screen) {
                        const spoofReason = data.reason || 'Screen/device detected';
                        setLiveSpoofAlert({ detected: true, reason: spoofReason });
                        if (onLiveSpoofDetected && location && !hasTriggeredRef.current) {
                            hasTriggeredRef.current = true;
                            setIsLiveDetecting(false);
                            onLiveSpoofDetected({
                                reason: spoofReason,
                                timestamp: new Date().toLocaleTimeString(),
                                confidence: 0,
                            });
                        }
                    } else {
                        setLiveSpoofAlert(null);
                    }
                }
            } catch (err) {
                console.error("Device detection error:", err);
            } finally {
                liveDeviceRequestInFlightRef.current = false;
            }
        };

        detectDevice(); // run immediately on enable
        const deviceInterval = setInterval(detectDevice, 1500);
        return () => clearInterval(deviceInterval);
    }, [isLiveDetecting, isCameraActive]);

    // Instant motion box for any object entering the webcam frame
    useEffect(() => {
        if (!isLiveDetecting || !isCameraActive) {
            setMotionBox(null);
            motionPreviousFrameRef.current = null;
            if (motionLoopRafRef.current) {
                cancelAnimationFrame(motionLoopRafRef.current);
                motionLoopRafRef.current = null;
            }
            return;
        }

        const scanMotion = () => {
            const video = webcamRef.current?.video;
            if (!video || video.readyState < 2) {
                motionLoopRafRef.current = requestAnimationFrame(scanMotion);
                return;
            }

            const now = performance.now();
            if (now - motionThrottleRef.current < 120) {
                motionLoopRafRef.current = requestAnimationFrame(scanMotion);
                return;
            }
            motionThrottleRef.current = now;

            const sampleWidth = 160;
            const sampleHeight = 90;
            const offscreen = document.createElement('canvas');
            offscreen.width = sampleWidth;
            offscreen.height = sampleHeight;
            const ctx = offscreen.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                motionLoopRafRef.current = requestAnimationFrame(scanMotion);
                return;
            }

            ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
            const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;

            if (!motionPreviousFrameRef.current) {
                motionPreviousFrameRef.current = new Uint8ClampedArray(imageData);
                motionLoopRafRef.current = requestAnimationFrame(scanMotion);
                return;
            }

            let minX = sampleWidth;
            let minY = sampleHeight;
            let maxX = 0;
            let maxY = 0;
            let changedPixels = 0;

            for (let y = 0; y < sampleHeight; y += 2) {
                for (let x = 0; x < sampleWidth; x += 2) {
                    const index = (y * sampleWidth + x) * 4;
                    const prev = motionPreviousFrameRef.current;
                    const currentLuma = (imageData[index] + imageData[index + 1] + imageData[index + 2]) / 3;
                    const previousLuma = (prev[index] + prev[index + 1] + prev[index + 2]) / 3;
                    const diff = Math.abs(currentLuma - previousLuma);

                    if (diff > 28) {
                        changedPixels += 1;
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            motionPreviousFrameRef.current = new Uint8ClampedArray(imageData);

            if (changedPixels > 80 && maxX > minX && maxY > minY) {
                const canvasWidth = video.videoWidth || 1;
                const canvasHeight = video.videoHeight || 1;
                const scaleX = canvasWidth / sampleWidth;
                const scaleY = canvasHeight / sampleHeight;

                setMotionBox({
                    x: minX * scaleX,
                    y: minY * scaleY,
                    width: (maxX - minX) * scaleX,
                    height: (maxY - minY) * scaleY,
                });
            } else {
                setMotionBox(null);
            }

            motionLoopRafRef.current = requestAnimationFrame(scanMotion);
        };

        motionLoopRafRef.current = requestAnimationFrame(scanMotion);

        return () => {
            if (motionLoopRafRef.current) {
                cancelAnimationFrame(motionLoopRafRef.current);
                motionLoopRafRef.current = null;
            }
        };
    }, [isLiveDetecting, isCameraActive]);

    // LOOP 2: Live snake detection — trigger alert UI immediately, confirm in background
    useEffect(() => {
        let intervalId;

        const detectSnake = async () => {
            if (!webcamRef.current || !isLiveDetecting) return;
            if (liveSnakeRequestInFlightRef.current) return;

            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;
            liveSnakeRequestInFlightRef.current = true;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                const response = await fetch(`${API_BASE_URL}/detect-live`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ frame: imageSrc }),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    const snakeBoxes = data.snake_boxes || data.boxes || [];

                    setLiveDetections(snakeBoxes);
                    setLiveDeviceBoxes(data.device_boxes || []);

                    // Static snake detection
                    if (data.spoof_detected && !hasTriggeredRef.current && onLiveSpoofDetected) {
                        hasTriggeredRef.current = true;
                        setIsLiveDetecting(false);
                        onLiveSpoofDetected({
                            reason: data.spoof_reason || 'Screen/device detected',
                            timestamp: new Date().toLocaleTimeString(),
                            confidence: data.confidence || 0,
                        });
                        return;
                    }

                    if (data.detected && snakeBoxes.length > 0) {
                        const centroid = { x: snakeBoxes[0].x, y: snakeBoxes[0].y };
                        snakePositionHistoryRef.current.push(centroid);
                        if (snakePositionHistoryRef.current.length > 5) snakePositionHistoryRef.current.shift();
                        if (snakePositionHistoryRef.current.length === 5) {
                            const xs = snakePositionHistoryRef.current.map(p => p.x);
                            const ys = snakePositionHistoryRef.current.map(p => p.y);
                            setStaticWarning(Math.max(...xs) - Math.min(...xs) < 10 && Math.max(...ys) - Math.min(...ys) < 10);
                        }
                    } else {
                        snakePositionHistoryRef.current = [];
                        setStaticWarning(false);
                    }

                    // AUTO-TRIGGER: snake found and not spoof -> show alert screen immediately
                    if (data.detected && snakeBoxes.length > 0 && !data.spoof_detected && location && !hasTriggeredRef.current) {
                        hasTriggeredRef.current = true;
                        setIsLiveDetecting(false);

                        const snapshot = webcamRef.current.getScreenshot();
                        const imageToUse = snapshot || imageSrc;
                        const fetchRes = await fetch(imageToUse);
                        const blob = await fetchRes.blob();
                        const frameFile = new File([blob], `live_threat_${Date.now()}.jpg`, { type: 'image/jpeg' });

                        setFile(frameFile);

                        if (onLiveSnakeDetected) {
                            onLiveSnakeDetected({
                                confidence: Number(data.confidence) || (snakeBoxes[0]?.confidence ? Number((snakeBoxes[0].confidence * 100).toFixed(1)) : 0),
                                status: 'SNAKE DETECTED',
                                imagePath: '',
                                timestamp: new Date().toLocaleTimeString(),
                            });
                        }

                        if (onAnalyze) {
                            // Heavy backend confirmation runs in background so alert UI is instant.
                            onAnalyze(frameFile, { silent: true }).catch((err) => {
                                console.error('Background analyze failed:', err);
                            });
                        }
                    }
                } else {
                    console.warn(`Live snake detection failed with status ${response.status}`);
                }
            } catch (err) {
                if (err?.name === 'AbortError') {
                    console.warn('Live snake detection timed out (skipped frame).');
                }
                console.error("Snake detection error:", err);
            } finally {
                liveSnakeRequestInFlightRef.current = false;
            }
        };

        if (isLiveDetecting && isCameraActive && !hasTriggeredRef.current) {
            detectSnake(); // run immediately on enable
            intervalId = setInterval(detectSnake, 1200);
        } else {
            setLiveDetections([]);
            setStaticWarning(false);
            setMotionBox(null);
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }

        return () => { if (intervalId) clearInterval(intervalId); };
    }, [isLiveDetecting, isCameraActive, location, onAnalyze, onLiveSnakeDetected, onLiveSpoofDetected, setFile]);

    // Draw bounding boxes when detection state changes
    useEffect(() => {
        if (!canvasRef.current || !webcamRef.current || !webcamRef.current.video) return;

        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.lineJoin = 'round';

        const drawLabel = (x, y, width, height, label, fillColor, textColor = '#000000') => {
            const fontSize = Math.max(18, Math.floor(canvas.width / 32));
            ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
            const textMetrics = ctx.measureText(label);
            const labelWidth = textMetrics.width + 22;
            const labelHeight = fontSize + 14;

            const fitsAbove = y - labelHeight - 8 > 0;
            const labelX = Math.max(4, Math.min(canvas.width - labelWidth - 4, x));
            const labelY = fitsAbove ? y - labelHeight - 8 : Math.min(canvas.height - labelHeight - 4, y + height + 8);

            // Draw semi-transparent dark background for contrast
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(labelX - 2, labelY - 2, labelWidth + 4, labelHeight + 4);

            // Draw the colored accent bar
            ctx.fillStyle = fillColor;
            ctx.fillRect(labelX, labelY, labelWidth, 4);

            // Draw outer border
            ctx.strokeStyle = fillColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(labelX - 2, labelY - 2, labelWidth + 4, labelHeight + 4);

            // Draw text with strong outline for readability
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
            ctx.lineWidth = 5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeText(label, labelX + 11, labelY + fontSize + 4);
            
            ctx.fillStyle = fillColor;
            ctx.lineWidth = 2;
            ctx.strokeText(label, labelX + 11, labelY + fontSize + 4);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(label, labelX + 11, labelY + fontSize + 4);
        };

        // --- Draw SNAKE boxes (Neon style)
        liveDetections.forEach(box => {
            const w = box.width;
            const h = box.height;
            const x = Math.max(0, Math.min(canvas.width - w, box.x - (w / 2)));
            const y = Math.max(0, Math.min(canvas.height - h, box.y - (h / 2)));

            // High-visibility Neon Border
            ctx.strokeStyle = '#00FF00'; // Neon Green for threat
            ctx.lineWidth = Math.max(3, canvas.width / 200); 
            ctx.shadowColor = '#00FF00';
            ctx.shadowBlur = 15;
            ctx.strokeRect(x, y, w, h);
            ctx.shadowBlur = 0;

            const label = `🐍 SNAKE ${(box.confidence * 100).toFixed(0)}%`;
            drawLabel(x, y, w, h, label, '#00FF00');
        });

        // --- Draw DEVICE / SPOOF boxes (amber, absolute xyxy coords from YOLO)
        liveDeviceBoxes.forEach(box => {
            const x = Math.max(0, Math.min(canvas.width, box.x1));
            const y = Math.max(0, Math.min(canvas.height, box.y1));
            const w = box.x2 - box.x1;
            const h = box.y2 - box.y1;

            ctx.strokeStyle = '#F59E0B'; // Amber
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            const labelText = `📱 ${box.label.toUpperCase()} ${(box.confidence * 100).toFixed(0)}%`;
            drawLabel(x, y, w, h, labelText, '#F59E0B');
        });

        // --- Draw instant motion box for early feedback before backend confirmation
        if (motionBox) {
            ctx.strokeStyle = '#22C55E';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#22C55E';
            ctx.shadowBlur = 14;
            ctx.strokeRect(motionBox.x, motionBox.y, motionBox.width, motionBox.height);

            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(34,197,94,0.9)';
            ctx.fillRect(motionBox.x, Math.max(0, motionBox.y - 22), 150, 20);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('MOTION DETECTED', motionBox.x + 4, Math.max(12, motionBox.y - 7));
        }

        // --- HEARTBEAT / DEBUG DOT (shows the canvas is actually rendering)
        if (isLiveDetecting) {
            ctx.fillStyle = '#10B981'; // Emerald Green
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`● DRAW_ENGINE_ACTIVE [${canvas.width}x${canvas.height}]`, 15, canvas.height - 15);
        }

    }, [liveDetections, liveDeviceBoxes, motionBox]);

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
                                {isLiveDetecting && (
                                    <p className={liveDetections.length > 0 ? "text-red-400 animate-pulse" : "text-safe"}>
                                        {'>'} LIVE STATUS: {liveDetections.length} SNAKE(S) DETECTED
                                    </p>
                                )}
                                {liveSpoofAlert && (
                                    <p className="text-yellow-400">
                                        {'>'} ALERT: SPOOFING DETECTED ({liveSpoofAlert.reason})
                                    </p>
                                )}
                                <p className={file ? "text-processing" : "text-slate-500"}>
                                    {'>'} {file ? `FILE LOADED: ${file.name}` : "READY FOR INPUT."}
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
                                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                                            <Webcam
                                                audio={false}
                                                ref={webcamRef}
                                                screenshotFormat="image/jpeg"
                                                videoConstraints={{ facingMode: "environment" }}
                                                className="absolute inset-0 w-full h-full object-cover opacity-80"
                                            />
                                        </div>

                                        <canvas
                                            ref={canvasRef}
                                            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[60] block"
                                        />

                                        {/* Camera Overlay HUD */}
                                        <div className="absolute inset-0 pointer-events-none border-[4px] border-black/50"></div>
                                        <div className="absolute inset-4 pointer-events-none border border-processing/30 flex">
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-processing"></div>
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-processing"></div>
                                        </div>

                                        {/* Spoof warning banner */}
                                        {liveSpoofAlert?.detected && (
                                            <div className="absolute top-4 right-4 left-4 z-30 bg-yellow-500/90 border border-yellow-300 text-black font-bold text-xs font-mono px-3 py-2 flex items-center gap-2 animate-pulse shadow-lg">
                                                ⚠ PHONE/SCREEN DETECTED — {liveSpoofAlert.reason}
                                            </div>
                                        )}
                                        {staticWarning && !liveSpoofAlert?.detected && (
                                            <div className="absolute top-4 right-4 left-4 z-30 bg-orange-400/90 border border-orange-300 text-black font-bold text-xs font-mono px-3 py-2 flex items-center gap-2 shadow-lg">
                                                ⏸ STATIC OBJECT — Snake not moving, verify manually
                                            </div>
                                        )}

                                        <div className="absolute top-4 left-4 text-processing font-mono text-[10px] tracking-widest flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-processing animate-pulse"></div>
                                            LIVE SENSOR OPTICS
                                        </div>

                                        {/* Recording Controls */}
                                        <div className="absolute bottom-6 flex flex-wrap justify-center gap-4 z-20 w-full px-4">
                                            {!capturing && (
                                                <button
                                                    onClick={() => setIsLiveDetecting(!isLiveDetecting)}
                                                    className={`border font-bold tracking-widest text-[10px] uppercase px-4 py-2 hover:bg-opacity-80 transition-all flex items-center gap-2 ${isLiveDetecting
                                                        ? 'bg-danger/20 border-danger text-danger shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                                                        : 'bg-processing/10 border-processing text-processing'
                                                        }`}
                                                >
                                                    <Crosshair size={14} className={isLiveDetecting ? "animate-spin-slow" : ""} />
                                                    {isLiveDetecting ? "ACTIVE TRACKING: ON" : "ENABLE LIVE TRACKING"}
                                                </button>
                                            )}

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
                                                    RECORD 10S
                                                </button>
                                            )}

                                            {!capturing && (
                                                <button
                                                    onClick={() => {
                                                        setIsCameraActive(false);
                                                        setIsLiveDetecting(false);
                                                        setLiveDetections([]);
                                                    }}
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
                        onClick={() => onAnalyze()}
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
