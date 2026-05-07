from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Annotated
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import os
import uvicorn
import sys
from pathlib import Path

# Force unbuffered output so all print() logs appear immediately in terminal
sys.stdout.reconfigure(line_buffering=True)  # type: ignore
sys.stderr.reconfigure(line_buffering=True)  # type: ignore

# Add parent directory to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.detection import detect_snake, detect_snake_image, detect_snake_frame, detect_screen_artifact
from backend.classification import classify_snake
from backend.alerts import send_whatsapp_alert, send_tamper_alert
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

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    # Convert errors to a serializable format (strings)
    error_details = []
    for error in exc.errors():
        error_details.append({
            "loc": error["loc"],
            "msg": error["msg"],
            "type": error["type"]
        })
    print(f"[DEBUG] 422 Validation Error: {error_details}", flush=True)
    return JSONResponse(
        status_code=422,
        content={"detail": error_details, "body": str(exc.body)},
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
    
class LiveFrame(BaseModel):
    frame: str
    
@app.get("/")
def read_root():
    return {"message": "SarpGuard Backend API is running"}

@app.post("/detect")
async def detect(
    background_tasks: BackgroundTasks, 
    file: Annotated[UploadFile, File(...)], 
    location: Annotated[str, Form()] = "Unknown"
):
    import uuid
    from datetime import datetime
    import shutil
    
    # Save uploaded video
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Store timestamp for history record
    readable_timestamp = datetime.now().strftime("%d-%b-%Y %H:%M")
    
    uid = uuid.uuid4().hex[:8]
    content_type = file.content_type or ""
    original_filename = file.filename or ""
    ext = os.path.splitext(original_filename)[1].lower()

    # Determine if this is an image or a video
    IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}
    IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif"}
    is_image = (ext in IMAGE_EXTS) or (content_type in IMAGE_CONTENT_TYPES)

    if not ext:
        ext = ".jpg" if is_image else ".mp4"

    input_filename = f"temp_{timestamp_str}_{uid}{ext}"
    image_filename = f"detected_images/detected_{timestamp_str}_{uid}.jpg"
    crop_filename = f"detected_images/crop_{timestamp_str}_{uid}.jpg"

    print(f"[Main] Received file: '{original_filename}' content_type='{content_type}' is_image={is_image}")

    with open(input_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Route to image or video detection pipeline
        if is_image:
            detected, yolo_conf, actual_crop_path, is_spoof, spoof_reason = detect_snake_image(input_filename, image_filename, crop_filename)
        else:
            detected, yolo_conf, actual_crop_path, is_spoof, spoof_reason = detect_snake(input_filename, image_filename, crop_filename)
        
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
            
            # 3. Alert or Spoof Block
            if is_spoof:
                print(f"[Main] 🛑 Spoof detected during snake detection. Reason: {spoof_reason}")
                send_tamper_alert(location, confidence, spoof_reason)
                status = "PHONE / SCREEN VIDEO DETECTED"
                alert_sent = False
            else:
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
        if os.path.exists(input_filename):
            os.remove(input_filename)
        if os.path.exists(crop_filename):
            os.remove(crop_filename)

@app.post("/detect-live")
async def detect_live(data: LiveFrame):
    """
    Real-time live webcam streaming endpoint.
    Accepts a base64 encoded frame.
    Returns snake boxes, device boxes, spoof state.
    NOTE: This includes Roboflow cloud call (~2-3s latency).
    For instant device boxes, use /detect-device instead.
    """
    detected, boxes, frame, max_conf, device_boxes, spoof_detected, spoof_reason = detect_snake_frame(data.frame)
    
    return {
        "detected": detected,
        "boxes": boxes,
        "device_boxes": device_boxes,
        "spoof_detected": spoof_detected,
        "spoof_reason": spoof_reason,
        "confidence": round(max_conf * 100, 1)
    }

@app.post("/detect-device")
async def detect_device(data: LiveFrame):
    """
    FAST device-only detection endpoint (~200ms).
    Runs ONLY YOLOv8 (phone/TV/laptop/book) + screen artifact checks.
    NO Roboflow call — designed for frequent polling to draw device boxes instantly.
    """
    import base64, threading
    import cv2, numpy as np
    from backend.detection import get_device_model, DEVICE_CLASSES, DEVICE_CLASS_NAMES, detect_screen_artifact

    frame_data = data.frame
    if "base64," in frame_data:
        frame_data = frame_data.split("base64,")[1]

    try:
        img_data = base64.b64decode(frame_data)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"device_boxes": [], "is_screen": False, "reason": ""}

        device_boxes = []
        artifact_result = [False, 0.0, ""]

        def run_device():
            results = get_device_model().predict(frame, classes=DEVICE_CLASSES, verbose=False)
            for box in results[0].boxes:
                xyxy = box.xyxy[0].cpu().numpy().tolist()
                cls = int(box.cls[0].cpu().item())
                conf = float(box.conf[0].cpu().item())
                if conf > 0.25:  # Lower threshold for faster detection
                    label = DEVICE_CLASS_NAMES.get(cls, f"Device({cls})")
                    device_boxes.append({
                        "x1": xyxy[0], "y1": xyxy[1],
                        "x2": xyxy[2], "y2": xyxy[3],
                        "confidence": conf,
                        "label": label
                    })

        def run_artifact():
            artifact_result[0], artifact_result[1], artifact_result[2] = detect_screen_artifact(frame)

        t1 = threading.Thread(target=run_device)
        t2 = threading.Thread(target=run_artifact)
        t1.start(); t2.start()
        t1.join(); t2.join()

        is_screen, score, reason = artifact_result
        print(f"[DeviceDetect] devices={len(device_boxes)} is_screen={is_screen} score={score:.2f}", flush=True)

        return {
            "device_boxes": device_boxes,
            "is_screen": is_screen or len(device_boxes) > 0,
            "reason": reason if is_screen else (f"Detected: {', '.join(b['label'] for b in device_boxes)}" if device_boxes else "")
        }

    except Exception as e:
        print(f"[DeviceDetect] Error: {e}", flush=True)
        return {"device_boxes": [], "is_screen": False, "reason": ""}

@app.get("/history", response_model=List[DetectionRecord])
def history():
    return get_history()

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
