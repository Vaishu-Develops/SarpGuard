import React, { useState, useEffect, useCallback } from 'react';
import UploadScreen from './components/UploadScreen';
import ProcessingScreen from './components/ProcessingScreen';
import SnakeDetectedScreen from './components/SnakeDetectedScreen';
import AllClearScreen from './components/AllClearScreen';
import SpoofWarningScreen from './components/SpoofWarningScreen';
import { getApiBaseUrl } from './lib/apiBase';

const API_BASE_URL = getApiBaseUrl();

const LOCATIONS = {
    'block-a': { name: 'Block A - Main Entrance' },
    'block-b': { name: 'Block B - Gate 2' },
    'block-c': { name: 'Block C - Parking Area' },
    'block-d': { name: 'Block D - Garden Side' },
    'block-e': { name: 'Block E - Back Gate' },
    'block-f': { name: 'Block F - Playground' },
};

// Screens: 'upload' | 'processing' | 'snake-detected' | 'all-clear'
export default function App() {
    const [screen, setScreen] = useState('upload');
    const [file, setFile] = useState(null);
    const [location, setLocation] = useState('');
    const [analysisTime, setAnalysisTime] = useState(3);

    // Real backend integration states
    const [isReady, setIsReady] = useState(false);
    const [confidence, setConfidence] = useState(0);
    const [apiTimestamp, setApiTimestamp] = useState('');
    const [hasSnake, setHasSnake] = useState(false);
    const [snakeStatus, setSnakeStatus] = useState('VENOMOUS');

    const [imagePath, setImagePath] = useState('');
    const [spoofReason, setSpoofReason] = useState('');

    const locationName = location ? LOCATIONS[location]?.name || location : '';

    const handleAnalyze = async (fileArg = null, options = {}) => {
        // Ensure we only use the argument if it's a real File/Blob (not a click event)
        const fileToUse = (fileArg instanceof File || fileArg instanceof Blob) ? fileArg : file;
        const silent = Boolean(options?.silent);

        if (!silent) {
            setScreen('processing');
            setIsReady(false);
        }

        const startTime = Date.now();

        const formData = new FormData();
        formData.append('file', fileToUse);
        formData.append('location', locationName);

        let resultHasSnake = false;
        let resultConfidence = 0;
        let resultImagePath = '';
        let resultTimestamp = '';
        let resultStatus = 'VENOMOUS';

        const controller = new AbortController();
        const isVideo = Boolean(fileToUse?.type?.startsWith('video/'));
        const fileSizeMB = Number(fileToUse?.size || 0) / (1024 * 1024);
        const timeoutMs = isVideo
            ? (fileSizeMB > 80 ? 300000 : fileSizeMB > 30 ? 210000 : 150000)
            : 90000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        let errorMessage = "Connection to Security Server lost. Please check your internet or wait for server to reboot.";

        try {
            const response = await fetch(`${API_BASE_URL}/detect`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                // ... rest of processing ...
                if (data.status === 'Media Spoof Detected') {
                    setSpoofReason(data.spoof_reason || 'Screen pixel pattern detected');
                    setConfidence(data.confidence || 0);
                    setApiTimestamp(new Date().toLocaleTimeString());
                    setIsReady(false);
                    setScreen('spoof-detected');
                    return;
                }

                resultConfidence = data.confidence || 0;
                resultHasSnake = data.status && data.status.toUpperCase() !== 'NO SNAKE DETECTED';
                resultStatus = data.status.toUpperCase();
                resultImagePath = data.image_path ? `${API_BASE_URL}${data.image_path}` : '';
                resultTimestamp = data.timestamp || '';
                
                console.log('[App] Backend response:', {
                    status: data.status,
                    image_path: data.image_path,
                    final_imagePath: resultImagePath,
                    api_base_url: API_BASE_URL
                });
                
                setHasSnake(resultHasSnake);
                setConfidence(resultConfidence);
                setSnakeStatus(resultStatus);
                setImagePath(resultImagePath);
                setApiTimestamp(resultTimestamp);
                setAnalysisTime(Math.round((Date.now() - startTime) / 1000) || 1);
                if (!silent) {
                    setIsReady(true);
                }
            } else {
                errorMessage = `Server Error (${response.status}): The security matrix is temporarily unavailable.`;
                throw new Error("API Not OK");
            }
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                errorMessage = "Analysis Timeout: The server took too long to respond. Please try a smaller file or better connection.";
            }
            console.error("Fetch failed", err);
            if (!silent) {
                setScreen('upload');
                alert(errorMessage);
            }
        }
    };

    const handleLiveSnakeDetected = useCallback((payload) => {
        setHasSnake(true);
        setConfidence(Number(payload.confidence) || 0);
        setSnakeStatus(payload.status || 'SNAKE DETECTED');
        setImagePath(payload.imagePath || '');
        setApiTimestamp(payload.timestamp || new Date().toLocaleTimeString());
        setIsReady(false);
        setScreen('snake-detected');
    }, []);

    const handleLiveSpoofDetected = useCallback((payload) => {
        setSpoofReason(payload.reason || 'Screen/device detected');
        setConfidence(Number(payload.confidence) || 0);
        setApiTimestamp(payload.timestamp || new Date().toLocaleTimeString());
        setIsReady(false);
        setScreen('spoof-detected');
    }, []);

    const handleProcessingComplete = useCallback(() => {
        setScreen(hasSnake ? 'snake-detected' : 'all-clear');
    }, [hasSnake]);

    // AUTO-TRANSITION when API is ready and we are on processing screen
    useEffect(() => {
        if (isReady && screen === 'processing') {
            handleProcessingComplete();
        }
    }, [isReady, screen, handleProcessingComplete]);

    const handleLogTamper = async () => {
        try {
            console.log('[LogTamper] 🔴 USER CLICKED LOG TAMPER BUTTON');
            console.log('[LogTamper] Location:', locationName);
            console.log('[LogTamper] Confidence:', confidence);
            console.log('[LogTamper] Reason:', spoofReason);
            
            const payload = {
                location: locationName || 'Unknown Location',
                spoof_confidence: confidence,
                reason: spoofReason || 'Phone screen or video detected'
            };
            console.log('[LogTamper] Sending payload:', JSON.stringify(payload));
            
            const response = await fetch(`${API_BASE_URL}/log-tamper`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('[LogTamper] Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('[LogTamper] ✅ SUCCESS - Incident logged:', data);
                alert('✅ Tamper incident logged! Security team notified.');
            } else {
                console.warn(`[LogTamper] ⚠️ Failed with status ${response.status}`);
                const errorData = await response.text();
                console.warn('[LogTamper] Error response:', errorData);
                alert(`⚠️ Failed to log incident (Status: ${response.status})`);
            }
        } catch (err) {
            console.error('[LogTamper] ❌ Error logging tamper incident:', err);
            alert('❌ Error: Could not log tamper incident. Check console.');
        }
    };

    const handleReset = () => {
        setFile(null);
        setLocation('');
        setSpoofReason('');
        setImagePath('');
        setConfidence(0);
        setSnakeStatus('VENOMOUS');
        setHasSnake(false);
        setIsReady(false);
        setScreen('upload');
    };

    // Generate current time for detection timestamp
    const now = new Date();
    const timestamp = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;

    return (
        <div className="w-full min-h-screen bg-surface font-mono text-slate-200 selection:bg-processing/30 overflow-hidden relative border-[8px] border-surface">
            {/* Ambient background grid lines */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

            {screen === 'upload' && (
                <UploadScreen
                    onAnalyze={handleAnalyze}
                    onLiveSnakeDetected={handleLiveSnakeDetected}
                    onLiveSpoofDetected={handleLiveSpoofDetected}
                    file={file}
                    setFile={setFile}
                    location={location}
                    setLocation={setLocation}
                />
            )}

            {screen === 'processing' && (
                <ProcessingScreen
                    isReady={isReady}
                    onComplete={handleProcessingComplete}
                    locationName={locationName}
                />
            )}

            {screen === 'snake-detected' && (
                <SnakeDetectedScreen
                    onReset={handleReset}
                    locationName={locationName}
                    confidence={confidence}
                    timestamp={apiTimestamp}
                    imagePath={imagePath}
                    status={snakeStatus}
                />
            )}
            {screen === 'all-clear' && (
                <AllClearScreen
                    onReset={handleReset}
                    analysisTime={analysisTime}
                />
            )}
            {screen === 'spoof-detected' && (
                <SpoofWarningScreen
                    onRetry={handleReset}
                    onLogTamper={handleLogTamper}
                    locationName={locationName}
                    snakeConfidence={confidence}
                    spoofReason={spoofReason}
                    timestamp={apiTimestamp}
                />
            )}
        </div>
    );
}
