<div align="center">

# 🐍 SarpGuard | Intelligent Snake Detection System

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge&logo=github" alt="Status" />
  <img src="https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python Version" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/YOLO-v8-FF9800?style=for-the-badge&logo=opencv&logoColor=white" alt="YOLOv8" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

### 🌌 Next-Gen Real-Time Vision for Safety

An AI-powered, dual-layer security system designed to detect, classify, and alert you about snakes in real-time. Whether via uploaded video footage or a live webcam feed, SarpGuard guarantees safety with futuristic accuracy.

[Features](#-core-features) • [Architecture](#%EF%B8%8F-system-architecture) • [Quick Start](#-quick-start) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Core Features

SarpGuard boasts bleeding-edge technology tailored for absolute reliability:

*   🎥 **Dual Analysis Modes**: Supports both pre-recorded video uploads (via chunk processing) and real-time webcam streams.
*   🧠 **Two-Stage AI Vision Pipeline**: 
    1.  **Detection (YOLOv8)**: Rapidly sweeps the frame to identify the exact Region of Interest (ROI) where a snake might be.
    2.  **Classification (Roboflow)**: A deep-learning pass strictly analyzes the ROI crop to classify the snake's species and verify confidence, heavily reducing false positives.
*   ⚡ **Lightning-Fast Live Feed**: Zero-database latency mapping for real-time bounding box drawing over your camera.
*   📱 **Smart Automated Alerts**: Instant WhatsApp notifications powered by Twilio, dispatching location, time, and AI confidence percent directly to your phone.
*   📊 **Historical Dashboard**: Retains detection history logic to transparently review historical breaches.
*   🎨 **Sleek UI/UX**: Built with React and Tailwind CSS for a dark-mode-first, futuristic "cyber-security" aesthetic with smooth micro-animations.

---

## 🛠️ System Architecture

Our tech stack leverages the best of modern toolchains for both raw speed and elegant interfaces:

### Backend (The Brains 🧠)
*   **Framework**: FastAPI (Python) - *Asynchronous, incredibly fast REST endpoints.*
*   **Computer Vision**: Ultralytics YOLOv8 & OpenCV.
*   **Classifier API**: Roboflow Inference API integration.
*   **Alert Generation**: Twilio Communications Client.
*   **Server**: Uvicorn.

### Frontend (The Visor 🕶️)
*   **Framework**: React 18, scaffolded with Vite for instantaneous HMR (Hot Module Replacement).
*   **Styling**: TailwindCSS 4 + Lucide Icons for rapid, responsive UI creation.
*   **Components**: Custom React components & `react-webcam` for fluid hardware integration.

---

## 🚀 Quick Start

Follow these instructions to spin up the SarpGuard environment locally.

### 1. Prerequisites
Ensure you have the following installed on your system:
*   Python 3.11+
*   Node.js & npm (pnpm recommended)
*   Git

### 2. Environment Variables
Create a `.env` file in the root backend directory:
```env
# Twilio Setup for WhatsApp Alerts
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
ALERT_TARGET_NUMBER=whatsapp:+your_personal_number_with_country_code

# Roboflow API (Classification Layer)
ROBOFLOW_API_KEY=your_roboflow_key_here
```

### 3. Backend Setup
Execute these commands in your terminal to bootstrap the AI API:

```bash
# Clone the repository
git clone https://github.com/yourusername/SarpGuard.git
cd SarpGuard

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
# source venv/bin/activate

# Install Python requirements
pip install -r requirements.txt

# Start the FastAPI server on port 8000
python backend/main.py
```

### 4. Frontend Setup
Open a new terminal window to serve the React application:

```bash
cd SarpGuard/frontend

# Install dependencies using pnpm (or npm / yarn)
pnpm install

# Build and Start the development server
pnpm run dev
```

The frontend will be accessible at `http://localhost:5173`. 

---

## 🤝 Contributing

We welcome contributions to making SarpGuard even better. 
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <sub>Built with passion for community safety.</sub>
</div>
