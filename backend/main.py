from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
import uvicorn
import sys
from pathlib import Path

# Add parent directory to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.detection import detect_snake
from backend.classification import classify_snake
from backend.alerts import send_whatsapp_alert
from backend.storage import save_detection, get_history
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SarpGuard API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure images directory exists
os.makedirs("detected_images", exist_ok=True)
app.mount("/images", StaticFiles(directory="detected_images"), name="images")

class DetectionRecord(BaseModel):
    id: str
    timestamp: str
    location: str
    status: str
    confidence: float
    image_path: str
    
@app.get("/")
def read_root():
    return {"message": "SarpGuard Backend API is running"}

@app.post("/detect")
async def detect(background_tasks: BackgroundTasks, file: UploadFile = File(...), location: str = Form("Unknown")):
    import uuid
    from datetime import datetime
    import shutil
    
    # Save uploaded video
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Store timestamp for history record
    readable_timestamp = datetime.now().strftime("%d-%b-%Y %H:%M")
    
    uid = uuid.uuid4().hex[:8]
    ext = os.path.splitext(file.filename)[1] if file.filename else ".mp4"
    if not ext:
        ext = ".mp4"
        
    video_filename = f"temp_{timestamp_str}_{uid}{ext}"
    image_filename = f"detected_images/detected_{timestamp_str}_{uid}.jpg"
    crop_filename = f"detected_images/crop_{timestamp_str}_{uid}.jpg"
    
    with open(video_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # 1. Detection (Layer 1 YOLO object detection - finds region of interest)
        detected, yolo_conf, actual_crop_path = detect_snake(video_filename, image_filename, crop_filename)
        
        status = "Harmless"
        confidence = 0.0
        alert_sent = False
        
        if detected:
            # 2. Classification using real Roboflow API (Layer 3 - Applied strictly to the CROP)
            status, classification_conf = classify_snake(actual_crop_path, mock=False)
            confidence = classification_conf * 100
            
            # Confidence Threshold: Reject false positives from Object Detection (e.g. butterflies)
            # If the classifier is unsure (<60% confidence), it's likely not a snake at all.
            if confidence < 60.0:
                print(f"[Main] Rejected detection as false positive. Classifier confidence too low: {confidence:.1f}%")
                return {"status": "No Snake Detected", "confidence": 0.0, "image_path": "", "alert_sent": False, "timestamp": readable_timestamp}
            
            # 3. Alert
            alert_sent = send_whatsapp_alert(location, confidence, status)
                
            # 4. Save history
            record = {
                "id": uid,
                "timestamp": readable_timestamp,
                "location": location,
                "status": status,
                "confidence": confidence,
                "image_path": f"/images/detected_{timestamp_str}_{uid}.jpg"
            }
            save_detection(record)
            
            return {
                "status": status, 
                "confidence": confidence, 
                "image_path": f"/images/detected_{timestamp_str}_{uid}.jpg", 
                "alert_sent": alert_sent,
                "timestamp": readable_timestamp
                }
            
        return {"status": "No Snake Detected", "confidence": 0.0, "image_path": "", "alert_sent": False, "timestamp": readable_timestamp}
        
    finally:
        # Cleanup video, keep image for dashboard
        if os.path.exists(video_filename):
            os.remove(video_filename)
        if os.path.exists(crop_filename):
            os.remove(crop_filename)

@app.get("/history", response_model=List[DetectionRecord])
def history():
    return get_history()

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
