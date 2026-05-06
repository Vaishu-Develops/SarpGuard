<img src="https://capsule-render.vercel.app/api?type=waving&color=FF4500&height=220&section=header&text=SarpGuard%20%F0%9F%90%8D&fontSize=56&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=AI%20Snake%20Detection%20%26%20Venom%20Classification&descAlignY=58&descSize=22&descColor=ffffff" width="100%" />

<div align="center">

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge&logo=github" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white" />
  <img src="https://img.shields.io/badge/Roboflow-purple?style=for-the-badge&logo=roboflow&logoColor=white" />
  <img src="https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white" />
</p>

<p align="center">
  <b>AI-powered snake detection, venom classification & real-time WhatsApp alerts for residential safety.</b>
</p>

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [API](#-api-endpoints) • [Tech Stack](#-tech-stack)

</div>

---

## 🔍 How It Works

```
📹 Upload Video
      │
      ▼
┌─────────────────────────────────────────────┐
│  STAGE 1: DETECTION                         │
│  Model: snake-detection/2 (10K images)      │
│  Samples 20 frames across the video         │
│  ByteTrack algorithm tracks snake movement  │
│  Picks highest-confidence frame             │
└──────────────────┬──────────────────────────┘
                   │ Snake found? ✅
                   ▼
┌─────────────────────────────────────────────┐
│  STAGE 2: CLASSIFICATION                    │
│  Model: snake-venom/1                       │
│  Classifies: VENOMOUS / NON VENOMOUS        │
│  Returns confidence score (0–100%)          │
└──────────────────┬──────────────────────────┘
                   │ VENOMOUS? 🚨
                   ▼
┌─────────────────────────────────────────────┐
│  STAGE 3: ALERT                             │
│  Sends WhatsApp message via Twilio          │
│  📱 Location + Confidence → Your Phone     │
└─────────────────────────────────────────────┘
                   │
                   ▼
          📊 Saved to History
```

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🎥 **Multi-Frame Detection** | Samples 20 frames evenly across the video — never misses a snake |
| 🧠 **Two-Stage AI Pipeline** | Detection → Classification, reducing false positives |
| 🔷 **ByteTrack Tracking** | Supervision ByteTrack algorithm tracks snake movement across frames |
| 📱 **Live WhatsApp Alerts** | Instant Twilio-powered alerts with location & confidence |
| 🖼️ **Annotated Output** | Saves bounding-box-annotated image for every detection |
| 📊 **Detection History** | Full log of all past detections with images |
| 🌐 **REST API** | FastAPI backend with CORS support for easy integration |
| 🎛️ **Streamlit Dashboard** | Clean web UI for uploads, results and history |

---

## 🏗️ Architecture

```
SarpGuard/
├── backend/
│   ├── main.py          # FastAPI server (port 8000)
│   ├── detection.py     # snake-detection/2 + ByteTrack
│   ├── classification.py # snake-venom/1 classifier
│   ├── alerts.py        # Twilio WhatsApp integration
│   └── storage.py       # Detection history (JSON)
├── frontend/
│   └── app.py           # Streamlit dashboard (port 8502)
├── detected_images/     # Annotated output images
├── .env                 # 🔒 All secrets (never committed)
├── requirements.txt
└── README.md
```

### AI Models (Roboflow Serverless)

| Model | ID | Purpose | Training |
|-------|----|---------|----------|
| Snake Detector | `snake-detection/2` | Locate snake in frame | ~10,000 images |
| Venom Classifier | `snake-venom/1` | VENOMOUS / NON VENOMOUS | Species dataset |

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
```

### 3. Run Backend

```powershell
python backend/main.py
# API running at http://localhost:8000
```

### 4. Run Frontend

Open a **new terminal**:

```powershell
.\venv\Scripts\Activate.ps1
streamlit run frontend/app.py
# Dashboard at http://localhost:8502
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/detect` | Upload video for detection |
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
| **Backend API** | FastAPI + Uvicorn |
| **Computer Vision** | OpenCV + Supervision |
| **Object Tracking** | ByteTrack (via supervision) |
| **AI Models** | Roboflow Inference SDK |
| **Alerts** | Twilio WhatsApp API |
| **Frontend** | Streamlit |
| **Env Management** | python-dotenv |

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
