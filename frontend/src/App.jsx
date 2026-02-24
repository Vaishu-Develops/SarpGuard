import React, { useState, useCallback } from 'react';
import UploadScreen from './components/UploadScreen';
import ProcessingScreen from './components/ProcessingScreen';
import SnakeDetectedScreen from './components/SnakeDetectedScreen';
import AllClearScreen from './components/AllClearScreen';

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

    const locationName = location ? LOCATIONS[location]?.name || location : '';

    const handleAnalyze = async () => {
        setScreen('processing');
        setIsReady(false);

        const startTime = Date.now();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('location', locationName);

        let resultHasSnake = false;
        let resultConfidence = 0;
        let resultImagePath = '';
        let resultTimestamp = '';
        let resultStatus = 'VENOMOUS';

        try {
            const response = await fetch('http://localhost:8000/detect', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                resultConfidence = data.confidence || 0;

                resultHasSnake = data.status && data.status.toUpperCase() !== 'NO SNAKE DETECTED';
                resultStatus = data.status.toUpperCase();
                resultImagePath = data.image_path ? `http://localhost:8000${data.image_path}` : '';
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

    const handleReset = () => {
        setFile(null);
        setLocation('');
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
        </div>
    );
}
