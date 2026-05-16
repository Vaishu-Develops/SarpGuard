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

import threading
from backend.detection import detect_snake, detect_snake_image, detect_snake_frame, detect_screen_artifact, prewarm_models, are_models_prewarmed
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

# Pre-warm models on startup to avoid cold-start delays
@app.on_event("startup")
async def startup_event():
    print("[Startup] SarpGuard Backend initializing...", flush=True)
    # Pre-warm models in a background thread so the app can bind to the port immediately.
    # If PREWARM_MODELS is disabled, skip the thread entirely to keep logs accurate.
    prewarm_flag = os.environ.get("PREWARM_MODELS", "1").lower()
    if prewarm_flag in ("0", "false", "no"):
        print("[Startup] Model pre-warm disabled by PREWARM_MODELS=0", flush=True)
    else:
        try:
            t = threading.Thread(target=prewarm_models, daemon=True)
            t.start()
            print("[Startup] Model pre-warm started in background thread", flush=True)
        except Exception as e:
            print(f"[Startup] Failed to start model pre-warm thread: {e}", flush=True)
    print("[Startup] ✓ Backend ready for requests (models may still be loading)", flush=True)

# Readiness / health endpoint for platform probes
@app.get('/health')
def health():
    return {"status": "ok", "models_prewarmed": are_models_prewarmed()}

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
    api_key = os.getenv("ROBOFLOW_API_KEY")
    if not api_key:
        print("[CRITICAL] ROBOFLOW_API_KEY is missing from environment variables!", flush=True)
    else:
        print(f"[INFO] ROBOFLOW_API_KEY is configured (Length: {len(api_key)})", flush=True)
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
        
        # 3. Spoof Logic (Priority 1: Check even if no snake found)
        if is_spoof:
            print(f"[Main] 🛑 Spoof detected. Reason: {spoof_reason}")
            status = "Media Spoof Detected"
            
            # Send alert only if confidence is high or a snake was also found
            if detected or yolo_conf > 0.5:
                send_tamper_alert(location, yolo_conf * 100, spoof_reason)
            
            return {
                "status": status,
                "confidence": yolo_conf * 100,
                "image_path": f"/images/detected_{timestamp_str}_{uid}.jpg" if os.path.exists(image_filename) else "",
                "alert_sent": False,
                "timestamp": readable_timestamp,
                "spoof_reason": spoof_reason
            }

        if detected:
            # 2. Classification using real Roboflow API (Layer 3 - Applied strictly to the CROP)
            status, classification_conf = classify_snake(actual_crop_path, mock=False)
            confidence = classification_conf * 100
            
            # Confidence Threshold: Reject false positives from Object Detection
            # Lowered to 40% to be more sensitive during testing
            if confidence < 40.0:
                print(f"[Main] Rejected detection as false positive. Classifier confidence too low: {confidence:.1f}%")
                return {"status": "No Snake Detected", "confidence": 0.0, "image_path": "", "alert_sent": False, "timestamp": readable_timestamp}
            
            # 3. Alert Logic (Wrapped in try/except to prevent server crash)
            try:
                alert_sent = send_whatsapp_alert(location, confidence, status)
            except Exception as e:
                print(f"[Alert Error] {e}")
                alert_sent = False
            
            # 4. Save history
            try:
                record = {
                    "id": uid,
                    "timestamp": readable_timestamp,
                    "location": location,
                    "status": status,
                    "confidence": confidence,
                    "image_path": f"/images/detected_{timestamp_str}_{uid}.jpg"
                }
                save_detection(record)
            except Exception as e:
                print(f"[History Error] {e}")
            
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
    status = "SNAKE DETECTED" if detected else "NO SNAKE DETECTED"
    
    return {
        "detected": detected,
        "snake_boxes": boxes,
        "boxes": boxes,
        "device_boxes": device_boxes,
        "spoof_detected": spoof_detected,
        "spoof_reason": spoof_reason,
        "confidence": round(max_conf * 100, 1),
        "status": status,
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
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
