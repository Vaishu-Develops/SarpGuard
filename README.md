# 🐍 SarpGuard - AI Snake Detection & Venom Classification

<div align="center">

**AI-powered snake detection, venom classification & real-time WhatsApp alerts for residential safety.**

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge&logo=github" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/YOLOv8-00D4FF?style=for-the-badge&logo=yolo&logoColor=white" />
  <img src="https://img.shields.io/badge/Roboflow-purple?style=for-the-badge&logo=roboflow&logoColor=white" />
  <img src="https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white" />
</p>

[Features](#-features) • [How It Works](#-how-it-works) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [API](#-api-endpoints) • [Tech Stack](#-tech-stack)

</div>

---

## 🔍 How It Works

### Three-Stage AI Pipeline

**Input:** Image or Video Stream
- Uploaded via web UI or webcam
- Video → Adaptively sampled (4-10 frames based on duration)
- Each frame independently processed through 4-stage pipeline

**Stage 1: Anti-Spoof Screening** (YOLOv8)
- Model: YOLOv8 Nano (COCO dataset, 640 mAP)
- Detects: Phone (67), Laptop (63), TV (62), Book (73), Screens
- Checks: Bezel contrast, edge linearity (Hough), luminance flatness
- Speed: <500ms per frame
- Result: `is_spoof=True` → YELLOW ALERT (phone/screen detected)
- For videos: fast_video_preflight() checks first frame only in <1s

**Stage 2: Snake Detection** (Roboflow)
- Model: `snake-detection/2` trained on 10,000 labeled images
- Detects: Bounding boxes around snakes in frame
- Tracks: ByteTrack algorithm (supervision) follows snake movement across frames
- Speed: ~1-2s per frame
- For videos: Samples adaptive frames to ensure no snake is missed
- Result: `detected=True` + bounding boxes → Proceeds to venom check

**Stage 3: Venom Classification** (Roboflow)
- Model: `snake-venom/1` trained on Indian snake species
- Classifies: VENOMOUS / NON VENOMOUS
- Returns: Confidence score (0-100%)
- Speed: ~500ms per frame
- Result: `confidence > threshold` → Sends alert

**Stage 4: Alert & History** (Twilio + Storage)
- Sends WhatsApp alert via Twilio with: Location, Timestamp, Confidence, Image
- Saves to JSON history with: Original image, Annotated image, Detections, Metadata
- Stores to: `detected_images/` folder + `detections.json`

### Processing Modes

| Mode | Speed | Endpoint | Frame Confirmation |
|------|-------|----------|-------------------|
| **Upload** | 10-20s | `/detect` | N/A (full video) |
| **Live** | Real-time | `/detect-live` | Local: 3 snake / 5 spoof frames |
| **Fast** | <500ms | `/detect-device` | YOLOv8 only, instant |

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🎥 **Multi-Frame Detection** | Adaptively samples 4-10 frames — never misses a snake |
| 🧠 **Four-Stage AI Pipeline** | Anti-Spoof (YOLOv8) → Detection (Roboflow) → Classification (Roboflow) → Alert |
| 🔷 **ByteTrack Tracking** | Supervision ByteTrack algorithm tracks snake movement across frames |
| 📱 **Live Webcam Detection** | Real-time snake detection via browser webcam with frame counter |
| 🛡️ **Anti-Spoof Screening** | YOLOv8 detects phone screens, laptops, TVs with bezel & luminance checks |
| 🔔 **Consecutive Frame Confirmation** | Local: 3 frames for snake, 5 frames for spoof \| Deployment: instant |
| 🚨 **WhatsApp Alerts** | Instant Twilio-powered alerts with location, confidence & annotated image |
| 🖼️ **Annotated Output** | Saves bounding-box-annotated image for every detection |
| 📊 **Detection History** | Full log of all past detections with images & metadata |
| 🌐 **REST API** | FastAPI backend with CORS, supporting both upload & live detection |
| ⚡ **Fast Live Endpoints** | /detect-live (full AI) & /detect-device (YOLOv8 only) for real-time

---

## 🏗️ Architecture

```
SarpGuard/
├── backend/
│   ├── main.py          # FastAPI server (port 8000)
│   ├── detection.py     # snake-detection/2 + ByteTrack + anti-spoof
│   ├── classification.py # snake-venom/1 classifier
│   ├── alerts.py        # Twilio WhatsApp integration
│   └── storage.py       # Detection history (JSON)
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (webcam, alerts, screens)
│   │   ├── lib/         # API base URL resolver
│   │   └── App.jsx      # Main app (port 5173/5174)
│   ├── vite.config.js   # Vite dev proxy configuration
│   └── package.json
├── detected_images/     # Annotated output images
├── .env                 # 🔒 All secrets (never committed)
├── requirements.txt
└── README.md
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Vite)                                             │
│ ├── Upload Screen → Select image/video                              │
│ ├── Webcam Screen → Live detection with frame counter               │
│ ├── Alert Screen → Display detection + confidence + image           │
│ └── Spoof Warning → Phone/screen detected (LOG TAMPER button)       │
└────────────────┬────────────────────────────────────────────────────┘
                 │ (HTTP POST requests)
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI on port 8000)                                      │
│ ├── /detect → Upload endpoint (orchestrates full pipeline)          │
│ │  └─ fast_video_preflight() → Anti-spoof check <1s                │
│ │  └─ detect_snake() → Detection → Classification → Alert           │
│ │                                                                    │
│ ├── /detect-live → Live frame processing (webcam)                   │
│ │  └─ detect_snake_frame() → Full 4-stage pipeline per frame       │
│ │                                                                    │
│ ├── /detect-device → Fast YOLOv8 only (no Roboflow)                │
│ │  └─ YOLOv8 + artifact checks → 500ms per frame                   │
│ │                                                                    │
│ └── /log-tamper → Log phone screen detection incident               │
│    └─ Sends WhatsApp alert via Twilio                              │
└────────────┬────────────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬──────────────┐
    ▼                 ▼              ▼              ▼
 ┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
 │ YOLOv8   │   │ Roboflow │  │ Roboflow │  │  Twilio  │
 │ (COCO)   │   │ Detection│  │ Classify │  │ WhatsApp │
 │ Anti-    │   │ (10K img)│  │ (Species)│  │  Alerts  │
 │ Spoof    │   │          │  │          │  │          │
 └──────────┘   └──────────┘  └──────────┘  └──────────┘
    500ms         1-2s           500ms        <2s
```

### Data Flow

1. **User Uploads File** → Frontend sends to `/detect` endpoint
2. **Backend Receives** → Extracts frames (adaptive sampling for videos)
3. **Stage 1: Anti-Spoof** → YOLOv8 checks if it's a phone/screen
   - ✅ Safe → Continue to Stage 2
   - ❌ Spoof → Return `spoof_detected=True` → Yellow alert
4. **Stage 2: Detection** → Roboflow snake-detection/2 finds snakes
   - ✅ Snake found → Continue to Stage 3
   - ❌ No snake → Return `detected=False`
5. **Stage 3: Classification** → Roboflow snake-venom/1 determines venom type
   - ✅ Venomous → Continue to Stage 4
   - ⚠️ Non-venomous → Still alert but lower priority
6. **Stage 4: Alert** → Twilio sends WhatsApp + saves to history
7. **Response** → Returns to frontend with image path + metadata

### Live Mode Frame Confirmation

- **Local (Development):**
  - Snake detection: Requires **3 consecutive frames** with snake detected
  - Phone/screen: Requires **5 consecutive frames** with spoof detected
  - Prevents false positives from single-frame glitches
  
- **Deployment (Production):**
  - Snake detection: **Instant** (1 frame = alert)
  - Phone/screen: **Instant** (1 frame = alert)
  - Optimized for rapid response in real threat scenarios

---

### AI Models

| Model | Source | Purpose | Speed | Classes/Output |
|-------|--------|---------|-------|---------------|
| **YOLOv8 Nano** | Ultralytics (COCO) | Device detection, screen rejection | <500ms | 80 classes (TV, Phone, Laptop, Book, etc.) |
| **snake-detection/2** | Roboflow custom | Locate snakes with bounding box | ~1-2s | Snake location + confidence |
| **snake-venom/1** | Roboflow custom | Classify venom type | ~500ms | VENOMOUS / NON VENOMOUS + confidence |

### Model Details

**YOLOv8 Nano (Anti-Spoof)**
- Pre-trained on COCO dataset (80 object classes)
- Used for: Fast screening of phones, laptops, TVs, books
- Classes tracked: 62=TV, 63=Laptop, 67=Phone, 73=Book
- Speed: ~300-500ms per inference
- Model size: ~6.3 MB (lightweight, runs fast on CPU)
- Advanced checks:
  - **Bezel detection**: Analyzes black border contrast ratio
  - **Edge linearity**: Hough transform checks for unnatural straight edges
  - **Luminance flatness**: Detects uniform brightness patterns (phone screen artifact)
  - **Color saturation**: Identifies oversaturated pixels (screen characteristic)
- Returns: `spoof_detected=True/False` + `reason` (e.g., "High bezel contrast")

**snake-detection/2 (Roboflow - Detection)**
- Custom trained on 10,000+ labeled snake images from Indian species
- Detects bounding boxes around snakes (any snake species)
- Returns: Bounding box coordinates + confidence score (0-100%)
- Uses ByteTrack algorithm to track snake movement across multiple frames
- Adaptive sampling: For videos >60s uses 4 frames, >20s uses 6 frames, shorter uses 10 frames
- Never samples the same frame twice (ensures diversity)
- Trained specifically for Indian subcontinent snakes (cobras, vipers, etc.)

**snake-venom/1 (Roboflow - Classification)**
- Custom trained on Indian snake species classification dataset
- Binary classifier: VENOMOUS or NON VENOMOUS
- Covers all major Indian snake species (King Cobra, Indian Cobra, Viper, Krait, etc.)
- Returns: Confidence score (0-100%)
- Used only after snake is detected to determine alert priority
- Higher confidence = greater threat urgency for alert escalation

---

## 🚀 Quick Start

### 1. Clone & Setup

```powershell
git clone https://github.com/yourusername/SarpGuard.git
cd SarpGuard

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1      # Windows
# source venv/bin/activate        # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Roboflow
ROBOFLOW_API_KEY=your_roboflow_api_key

# Twilio WhatsApp Alerts
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_TO_WHATSAPP=+91xxxxxxxxxx
TWILIO_CONTENT_SID=your_content_sid

# Optional
PREWARM_MODELS=1  # Pre-load models on startup
PORT=8000         # Backend port
```

### 3. Run Backend

```powershell
python backend/main.py
# API running at http://localhost:8000
```

### 4. Run Frontend

Open a **new terminal**:

```powershell
cd frontend
pnpm install      # or npm install
npm run dev       # or pnpm run dev
# Frontend running at http://localhost:5173 (or 5174 if port in use)
```

---

## � Local Development vs Deployment Mode

**Local Mode** (localhost):
- 🐍 Snake alert: **3 consecutive frames** required for confirmation
- 📱 Phone/screen alert: **5 consecutive frames** required to prevent false positives
- Longer processing time allows for validation
- Counter shows: `SNAKE 1/3`, `SNAKE 2/3`, `SNAKE 3/3`

**Deployment Mode** (production):
- 🐍 Snake alert: **Instant** (1 frame = alert)
- 📱 Phone/screen alert: **Instant** (1 frame = alert)
- Optimized for real-time rapid response

The frontend automatically detects which mode based on the hostname (`localhost` vs IP/domain) and adjusts sensitivity accordingly via `FRAMES_REQUIRED_FOR_ALERT` constant.

---

## �📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/detect` | Upload video/image for detection |
| `POST` | `/detect-live` | Live frame detection (webcam streaming) |
| `POST` | `/detect-device` | Fast device/phone detection (low latency) |
| `POST` | `/log-tamper` | Log tamper incident (phone screen detected) |
| `GET` | `/history` | Fetch all past detections |
| `GET` | `/images/{filename}` | Serve annotated images |

### Example `/detect` Request

```bash
curl -X POST http://localhost:8000/detect \
  -F "file=@snake_video.mp4" \
  -F "location=Playground Area"
```

### Example Response

```json
{
  "status": "VENOMOUS",
  "confidence": 0.97,
  "image_path": "detected_images/detected_20260223_143859.jpg",
  "alert_sent": true
}
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | FastAPI + Uvicorn (Python 3.11+) |
| **Computer Vision** | OpenCV + Supervision |
| **Object Tracking** | ByteTrack (via supervision) |
| **AI Models** | Roboflow Inference SDK + Ultralytics YOLOv8 |
| **Anti-Spoof** | Screen artifact detection + bezel analysis |
| **Alerts** | Twilio WhatsApp API |
| **Frontend** | React 18.3 + Vite 6.4 + Tailwind CSS |
| **Live Webcam** | react-webcam |
| **Env Management** | python-dotenv (backend) + Vite env (frontend) |

---

## 🔒 Security

- All credentials stored in `.env` only — never hardcoded
- `.env` listed in `.gitignore`
- API keys loaded via `os.getenv()` at runtime

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License.

<div align="center">
  <sub>Built with ❤️ for community safety — SarpGuard 🐍</sub>
</div>
