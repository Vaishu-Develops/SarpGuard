from fastapi import FastAPI, UploadFile, File, BackgroundTasks
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

app = FastAPI(title="SarpGuard API", version="1.0")

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
async def detect(background_tasks: BackgroundTasks, file: UploadFile = File(...), location: str = "Unknown"):
    import uuid
    from datetime import datetime
    import shutil
    
    # Save uploaded video
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    uid = uuid.uuid4().hex[:8]
    video_filename = f"temp_{timestamp}_{uid}.mp4"
    image_filename = f"detected_{timestamp}_{uid}.jpg"
    
    with open(video_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # 1. Detection
        detected, yolo_conf = detect_snake(video_filename, image_filename)
        
        status = "Harmless"
        confidence = 0.0
        alert_sent = False
        
        if detected:
            # 2. Classification using real Roboflow API
            status, confidence = classify_snake(image_filename, mock=False)
            
            # 3. Alert
            if status == "VENOMOUS":
                # In real app, we'd fire background task, for demo we just call it
                # background_tasks.add_task(send_whatsapp_alert, location, confidence)
                alert_sent = send_whatsapp_alert(location, confidence)
                
            # 4. Save history
            record = {
                "id": uid,
                "timestamp": datetime.now().strftime("%d-%b-%Y %H:%M"),
                "location": location,
                "status": status,
                "confidence": confidence,
                "image_path": image_filename
            }
            save_detection(record)
            
            return {"status": status, "confidence": confidence, "image_path": image_filename, "alert_sent": alert_sent}
            
        return {"status": "No Snake Detected", "confidence": 0.0, "image_path": "", "alert_sent": False}
        
    finally:
        # Cleanup video, keep image for dashboard
        if os.path.exists(video_filename):
            os.remove(video_filename)

@app.get("/history", response_model=List[DetectionRecord])
def history():
    return get_history()

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
