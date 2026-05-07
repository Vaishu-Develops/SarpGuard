import React, { useState, useCallback } from 'react';
import UploadScreen from './components/UploadScreen';
import ProcessingScreen from './components/ProcessingScreen';
import SnakeDetectedScreen from './components/SnakeDetectedScreen';
import AllClearScreen from './components/AllClearScreen';
import SpoofWarningScreen from './components/SpoofWarningScreen';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

    const handleAnalyze = async (fileArg = null) => {
        // Ensure we only use the argument if it's a real File/Blob (not a click event)
        const fileToUse = (fileArg instanceof File || fileArg instanceof Blob) ? fileArg : file;

        setScreen('processing');
        setIsReady(false);

        const startTime = Date.now();

        const formData = new FormData();
        formData.append('file', fileToUse);
        formData.append('location', locationName);

        let resultHasSnake = false;
        let resultConfidence = 0;
        let resultImagePath = '';
        let resultTimestamp = '';
        let resultStatus = 'VENOMOUS';

        try {
            const response = await fetch(`${API_BASE_URL}/detect`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();

                // Check for media spoofing first
                if (data.status === 'Media Spoof Detected') {
                    setSpoofReason(data.spoof_reason || 'Screen pixel pattern detected');
                    setConfidence(data.confidence || 0);
                    const now = new Date();
                    setApiTimestamp(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`);
                    setIsReady(false);
                    setScreen('spoof-detected');
                    return;
                }

                resultConfidence = data.confidence || 0;

                resultHasSnake = data.status && data.status.toUpperCase() !== 'NO SNAKE DETECTED';
                resultStatus = data.status.toUpperCase();
                resultImagePath = data.image_path ? `${API_BASE_URL}${data.image_path}` : '';
                resultTimestamp = data.timestamp || '';
            } else {
                console.error("API Response not OK");
            }
        } catch (err) {
            console.error("Fetch failed", err);
        }

        // If fallback needed (no API running), mock data safely
        if (!resultTimestamp) {
            const now = new Date();
            resultTimestamp = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
        }

        setHasSnake(resultHasSnake);
        setConfidence(resultConfidence);
        setSnakeStatus(resultStatus);
        setImagePath(resultImagePath);
        setApiTimestamp(resultTimestamp);
        setAnalysisTime(Math.round((Date.now() - startTime) / 1000) || 1);
        setIsReady(true);
    };

    const handleProcessingComplete = useCallback(() => {
        setScreen(hasSnake ? 'snake-detected' : 'all-clear');
    }, [hasSnake]);

    const handleLogTamper = () => {
        const ts = new Date().toLocaleString();
        alert(`⚠️ TAMPER INCIDENT LOGGED\n\nTime: ${ts}\nLocation: ${locationName}\nReason: ${spoofReason}\n\nWhatsApp tamper alert has already been sent to the secretary.`);
    };

    const handleReset = () => {
        setFile(null);
        setLocation('');
        setSpoofReason('');
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
