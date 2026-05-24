import os
import threading
import cv2
import numpy as np
import subprocess

from dotenv import load_dotenv

load_dotenv()

def convert_video_to_mp4(input_path: str) -> str:
    """
    Converts any video format to a standard H.264 MP4 that OpenCV can reliably read.
    Uses the ffmpeg binary bundled with imageio-ffmpeg (no system install needed).
    Returns the path to the converted file, or the original if conversion fails/is unnecessary.
    """
    ext = os.path.splitext(input_path)[1].lower()

    # MP4 files are usually already readable by OpenCV, so avoid an unnecessary
    # ffmpeg transcode step unless the file is actually unreadable.
    if ext == ".mp4":
        cap = cv2.VideoCapture(input_path)
        if cap.isOpened():
            cap.release()
            print(f"[VideoConvert] Skipping conversion for readable MP4: {input_path}")
            return input_path
        cap.release()

    output_path = input_path.rsplit(".", 1)[0] + "_converted.mp4"
    try:
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        result = subprocess.run(
            [ffmpeg_path, "-y", "-i", input_path,
             "-vf", "scale=-1:720",
             "-c:v", "libx264", "-preset", "ultrafast",
             "-movflags", "+faststart",  # Puts moov atom at the start
             "-an",  # No audio needed
             output_path],
            capture_output=True,
            timeout=120  # Increased for larger files
        )
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            print(f"[VideoConvert] Converted {input_path} → {output_path}")
            return output_path
        else:
            print(f"[VideoConvert] ffmpeg failed: {result.stderr[:300]}")
            return input_path
    except Exception as e:
        print(f"[VideoConvert] Conversion error: {e}")
        return input_path
API_KEY = os.getenv("ROBOFLOW_API_KEY")
DETECTION_MODEL_ID = "snake-detection/2"

_client = None
_client_lock = threading.Lock()

def get_roboflow_client():
    global _client
    if _client is None:
        with _client_lock:
            if _client is not None:
                return _client
            api_key = os.getenv("ROBOFLOW_API_KEY")
            if not api_key:
                print("[CRITICAL] ROBOFLOW_API_KEY is missing!")
            from inference_sdk import InferenceHTTPClient
            _client = InferenceHTTPClient(
                api_url="https://serverless.roboflow.com",
                api_key=api_key
            )
            print(f"[Info] Roboflow Client initialized (API Key present: {bool(api_key)})")
    return _client


def roboflow_infer(image_path: str):
    return get_roboflow_client().infer(image_path, model_id=DETECTION_MODEL_ID)

# Pre-loaded models with thread-safe initialization
import threading

_device_model = None
_snake_model = None
_byte_tracker = None
_model_lock = threading.Lock()
_models_prewarmed = False

def get_device_model():
    """Get YOLOv8 COCO model for device/phone/TV detection (class 62, 63, 67, 73)."""
    global _device_model
    if _device_model is None:
        with _model_lock:
            if _device_model is not None:
                return _device_model
            from ultralytics import YOLO
            _MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model", "yolov8n.pt")
            if not os.path.exists(_MODEL_PATH):
                _MODEL_PATH = "yolov8n.pt"
            print(f"[Models] Loading YOLOv8 COCO device detector: {_MODEL_PATH}")
            _device_model = YOLO(_MODEL_PATH)
            print(f"[Models] YOLOv8 COCO device detector ready")
    return _device_model

def get_snake_model():
    """Get YOLOv8 model for fast local snake detection on live feed."""
    global _snake_model
    if _snake_model is None:
        with _model_lock:
            if _snake_model is not None:
                return _snake_model
            from ultralytics import YOLO
            # Only load a custom snake model. The COCO YOLOv8n model does not have a snake class.
            _SNAKE_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model", "snake_yolov8.pt")
            if os.path.exists(_SNAKE_MODEL_PATH):
                print(f"[Models] Loading custom YOLOv8 snake model: {_SNAKE_MODEL_PATH}")
                _snake_model = YOLO(_SNAKE_MODEL_PATH)
            else:
                print(f"[Models] No custom snake model found; live snake detection will use Roboflow fallback")
                return None
            print(f"[Models] YOLOv8 snake detector ready (~200ms per frame)")
    return _snake_model

def prewarm_models():
    """Pre-load all models on server startup to avoid cold-start delays."""
    global _models_prewarmed
    # Allow disabling prewarm when memory is constrained (e.g., deployment with low RAM)
    prewarm_flag = os.environ.get("PREWARM_MODELS", "1").lower()
    if prewarm_flag in ("0", "false", "no"):
        print("[Models] PREWARM_MODELS=0 — skipping model pre-warm to save memory", flush=True)
        return

    if _models_prewarmed:
        return
    print("[Models] Pre-warming models on startup...", flush=True)
    try:
        single = os.environ.get("SINGLE_MODEL", "").lower()
        if single in ("device", "device_only"):
            print("[Models] SINGLE_MODEL=device — pre-warming device model only", flush=True)
            get_device_model()
        elif single in ("snake", "snake_only"):
            print("[Models] SINGLE_MODEL=snake — pre-warming snake model only", flush=True)
            get_snake_model()
        else:
            # Default: load both
            get_device_model()
            get_snake_model()

        _models_prewarmed = True
        print("[Models] ✓ Models pre-warmed successfully!", flush=True)
    except Exception as e:
        print(f"[Models] WARNING: Pre-warm failed: {e}", flush=True)


def are_models_prewarmed() -> bool:
    """Return True if models were successfully pre-warmed."""
    global _models_prewarmed
    return bool(_models_prewarmed)

def get_byte_tracker():
    """Lazy-load ByteTrack on first use."""
    global _byte_tracker
    if _byte_tracker is None:
        import supervision as sv
        _byte_tracker = sv.ByteTrack()
    return _byte_tracker

# Keep these as module-level references for backward compatibility with imports
@property
def device_model_property(self):
    return get_device_model()

# COCO classes for screen/fake-source detection:
# 62 = tv, 63 = laptop, 67 = cell phone, 73 = book (could hold printed snake photo)
DEVICE_CLASSES = [62, 63, 67, 73]
DEVICE_CLASS_NAMES = {62: "TV", 63: "Laptop", 67: "Phone", 73: "Book/Print"}

def check_bbox_overlap(boxA, boxB):
    """
    Check if boxA (snake) is significantly covered by or overlaps with boxB (device).
    Returns True if there is a significant intersection.
    boxes format: [x1, y1, x2, y2]
    """
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    if interArea == 0:
        return False

    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    # If the intersection covers at least 30% of the snake, consider it overlapping
    return (interArea / float(boxAArea)) > 0.3

def detect_snake_image(image_path: str, output_image_path: str, crop_image_path: str) -> tuple[bool, float, str, bool, str]:
    """
    Handles a single still image (JPEG/PNG/WebP) uploaded directly.
    Runs Roboflow snake detection + YOLO anti-spoof + screen artifact checks.
    Returns the same tuple as detect_snake().
    """
    print(f"[Detection] Processing as single image: {image_path}")
    frame = cv2.imread(image_path)
    if frame is None:
        print(f"[Detection] Could not read image: {image_path}")
        return False, 0.0, "", False, ""

    spoof_artifact_result = [False, 0.0, ""]
    spoof_device_boxes = []
    predictions = []

    def run_artifact_check():
        spoof_artifact_result[0], spoof_artifact_result[1], spoof_artifact_result[2] = detect_screen_artifact(frame)

    def run_device_check():
        # Reduced imgz to 320 for significant memory savings on Render
        results = get_device_model().predict(
            frame,
            classes=DEVICE_CLASSES,
            verbose=False,
            imgsz=256,
            conf=0.35,
            iou=0.45,
            max_det=5,
        )
        for box in results[0].boxes:
            xyxy = box.xyxy[0].cpu().numpy()
            cls = int(box.cls[0].cpu().item())
            conf = box.conf[0].cpu().item()
            if conf > 0.3:
                spoof_device_boxes.append({"box": xyxy, "cls": cls, "conf": conf})

    # Run checks sequentially on memory-constrained Render to prevent crashes
    run_artifact_check()
    run_device_check()

    try:
        result = roboflow_infer(image_path)
        predictions = result.get("predictions", [])
        print(f"[Detection] Image: {len(predictions)} predictions found")
    except Exception as e:
        print(f"[Detection] Roboflow ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False, 0.0, "", False, ""

    if not predictions:
        print("[Detection] No snake found in image. Checking for spoofing anyway...")
        # Check if it was a spoof even without a snake
        is_spoof = False
        spoof_reasons = []
        art_is_spoof, _, art_reason = spoof_artifact_result
        if art_is_spoof:
            is_spoof = True
            spoof_reasons.append(art_reason)
        for device in spoof_device_boxes:
            is_spoof = True
            cls_name = get_device_model().names[device["cls"]]
            spoof_reasons.append(f"Detected '{cls_name}' display")
            
        return False, 0.0, "", is_spoof, " | ".join(spoof_reasons)

    top = sorted(predictions, key=lambda x: x["confidence"], reverse=True)[0]
    conf = top["confidence"]
    print(f"[Detection] Image snake found: {conf*100:.1f}% confidence")

    # Handle both direct and nested 'bbox' formats from Roboflow
    bbox = top["bbox"] if "bbox" in top else top
    x, y = bbox["x"], bbox["y"]
    box_w, box_h = bbox["width"], bbox["height"]
    snake_xyxy = [x - box_w / 2, y - box_h / 2, x + box_w / 2, y + box_h / 2]

    # Anti-spoof evaluation
    is_spoof = False
    spoof_reasons = []
    art_is_spoof, _, art_reason = spoof_artifact_result
    if art_is_spoof:
        is_spoof = True
        spoof_reasons.append(art_reason)
    for device in spoof_device_boxes:
        if check_bbox_overlap(snake_xyxy, device["box"]):
            is_spoof = True
            cls_name = get_device_model().names[device["cls"]]
            spoof_reasons.append(f"Snake overlaps '{cls_name}' display")

    # Crop the snake region
    h, w = frame.shape[:2]
    pad_x = int(box_w * 0.1)
    pad_y = int(box_h * 0.1)
    cx1 = max(0, int(x - box_w // 2 - pad_x))
    cy1 = max(0, int(y - box_h // 2 - pad_y))
    cx2 = min(w, int(x + box_w // 2 + pad_x))
    cy2 = min(h, int(y + box_h // 2 + pad_y))
    crop = frame[cy1:cy2, cx1:cx2]
    final_crop_path = crop_image_path
    if crop.size > 0:
        cv2.imwrite(crop_image_path, crop)
    else:
        final_crop_path = output_image_path

    # Draw bounding box on output image
    cv2.rectangle(frame, (int(snake_xyxy[0]), int(snake_xyxy[1])), (int(snake_xyxy[2]), int(snake_xyxy[3])), (0, 0, 255), 2)
    cv2.putText(frame, f"Snake {conf*100:.1f}%", (int(snake_xyxy[0]), int(snake_xyxy[1]) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    cv2.imwrite(output_image_path, frame)

    return True, conf, final_crop_path, is_spoof, " | ".join(spoof_reasons)

def detect_snake(video_path: str, output_image_path: str, crop_image_path: str, max_samples: int = 10) -> tuple[bool, float, str, bool, str]:
    """
    Samples multiple frames from the video, runs Roboflow snake-detection/2 detection,
    uses ByteTrack to track snake movement across frames.
    In parallel, runs Anti-Spoof Layer 0 (device object detection + screen artifacts).
    
    Returns:
        detected (bool): If a snake is found
        confidence (float): Confidence of the snake detection
        crop_path (str): Path to the cropped snake image
        is_spoof (bool): True if a screen device or screen artifact was found overlapping/during the snake detection
        spoof_reason (str): Reason for the spoof classification
    """
    # Convert video to a standard MP4 format that OpenCV can reliably read
    # This fixes WebM, MOV, and other formats that fail on headless Linux servers
    converted_path = convert_video_to_mp4(video_path)
    
    cap = cv2.VideoCapture(converted_path)
    if not cap.isOpened():
        print(f"[Detection] Could not open video: {converted_path}")
        # Cleanup converted file if it's different from original
        if converted_path != video_path and os.path.exists(converted_path):
            os.remove(converted_path)
        return False, 0.0, "", False, ""

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    duration = total_frames / fps if fps > 0 else 0
    print(f"[Detection] Video info: {total_frames} frames, {fps:.1f} FPS, {duration:.1f}s duration")

    if total_frames <= 0:
        total_frames = 300

    # Adaptive sampling to keep detection responsive on low-memory / low-CPU deployments.
    # Long videos use fewer samples to reduce total Roboflow round-trips.
    if duration <= 5:
        step = max(1, int(fps * 0.5))  # every 0.5 seconds
        frame_indices = list(range(0, total_frames, step))
    else:
        if duration > 60:
            sample_budget = 4
        elif duration > 20:
            sample_budget = 6
        else:
            sample_budget = max_samples
        sample_count = min(sample_budget, total_frames)
        if sample_count <= 1:
            frame_indices = [0]
        else:
            frame_indices = [int(i * (total_frames - 1) / (sample_count - 1)) for i in range(sample_count)]

    temp_image_path = output_image_path.replace(".jpg", "_raw.jpg")
    best_confidence = 0.0
    best_prediction = None
    best_frame = None
    tracked_detections = None  # Store tracking data for the best frame
    
    # Anti-spoof tracking variables
    best_spoof_score = 0.0
    is_spoof_detected = False
    final_spoof_reasons = []

    print(f"[Detection] Sampling {len(frame_indices)} frames from video with ByteTrack + AntiSpoof")

    # Reset tracker for new video
    get_byte_tracker().reset()

    spoof_every = 4 if duration > 20 else 3

    for sample_pos, idx in enumerate(frame_indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue

        cv2.imwrite(temp_image_path, frame)
        h, w = frame.shape[:2]

        # Initialize parallel outputs
        spoof_artifact_result = [False, 0.0, ""]
        spoof_device_boxes = []

        # 1. Run Screen Artifact detection thread
        def run_artifact_check():
            spoof_artifact_result[0], spoof_artifact_result[1], spoof_artifact_result[2] = detect_screen_artifact(frame)

        # 2. Run Device Object Detection thread
        def run_device_check():
            results = get_device_model().predict(
                frame,
                classes=DEVICE_CLASSES,
                verbose=False,
                imgsz=256,
                conf=0.35,
                iou=0.45,
                max_det=5,
            )
            for box in results[0].boxes:
                # [x1, y1, x2, y2]
                xyxy = box.xyxy[0].cpu().numpy()
                cls = int(box.cls[0].cpu().item())
                conf = box.conf[0].cpu().item()
                if conf > 0.3: # Lowered from 0.4
                    spoof_device_boxes.append({"box": xyxy, "cls": cls, "conf": conf})

        # Start background threads for anti-spoof checks on a reduced cadence for long videos.
        do_spoof_check = (
            sample_pos == 0
            or sample_pos == len(frame_indices) - 1
            or (sample_pos % spoof_every == 0)
        )
        
        thread_artifacts = None
        thread_devices = None
        
        if do_spoof_check:
            thread_artifacts = threading.Thread(target=run_artifact_check)
            thread_devices = threading.Thread(target=run_device_check)
            thread_artifacts.start()
            thread_devices.start()

        # In parallel, main thread runs snake detection
        try:
            result = roboflow_infer(temp_image_path)
            predictions = result.get("predictions", [])
            print(f"[Detection] Frame {idx}: {len(predictions)} predictions found")

            # Wait for anti-spoof checks to finish before evaluating the frame's results
            if thread_artifacts: thread_artifacts.join()
            if thread_devices: thread_devices.join()

            has_snake = False
            top_snake_pred = None
            snake_xyxy = None

            if predictions:
                print(f"[Detection] Frame {idx}: Raw Predictions: {predictions}")
                # Convert Roboflow predictions to supervision Detections format
                import supervision as sv
                boxes = []
                confidences = []
                for pred in predictions:
                    # Handle both direct and nested 'bbox' formats from Roboflow
                    bbox = pred["bbox"] if "bbox" in pred else pred
                    x, y = bbox["x"], bbox["y"]
                    box_w, box_h = bbox["width"], bbox["height"]
                    x1 = x - box_w / 2
                    y1 = y - box_h / 2
                    x2 = x + box_w / 2
                    y2 = y + box_h / 2
                    boxes.append([x1, y1, x2, y2])
                    confidences.append(pred["confidence"])

                boxes = np.array(boxes)
                confidences = np.array(confidences)

                # Create supervision Detections object
                detections = sv.Detections(
                    xyxy=boxes,
                    confidence=confidences,
                    class_id=np.zeros(len(boxes), dtype=int)  # All class 0 (snake)
                )

                # Apply ByteTrack tracker
                detections = get_byte_tracker().update_with_detections(detections)

                # Store best detection
                if len(predictions) > 0:
                    top = sorted(predictions, key=lambda x: x["confidence"], reverse=True)[0]
                    conf = top["confidence"]
                    print(f"[Detection] Frame {idx}: snake found with {conf*100:.1f}% confidence")
                    
                    # Log if it was rejected by a threshold
                    if conf < 0.4:
                        print(f"[Detection] Frame {idx}: REJECTED (below 0.4 threshold)")

                    x, y = top["x"], top["y"]
                    box_w, box_h = top["width"], top["height"]
                    snake_xyxy = [x - box_w / 2, y - box_h / 2, x + box_w / 2, y + box_h / 2]

                    if conf > best_confidence:
                        best_confidence = conf
                        best_prediction = top
                        best_frame = frame.copy()
                        tracked_detections = detections  # Save tracking data for best frame
                        
                    has_snake = True
                    top_snake_pred = top

            else:
                if idx % 5 == 0: # Reduce log spam
                    print(f"[Detection] Frame {idx}: no snake detected")

            # --- Anti-Spoof Logic Evaluation for this frame ---
            # We only care about spoofing if a snake is potentially present
            if has_snake:
                frame_is_spoof = False
                frame_spoof_reasons = []

                # Check 1: Artifacts
                art_is_spoof, art_score, art_reason = spoof_artifact_result
                if art_is_spoof:
                    frame_is_spoof = True
                    frame_spoof_reasons.append(art_reason)

                # Check 2: Devices overlapping snake
                for device in spoof_device_boxes:
                    if check_bbox_overlap(snake_xyxy, device["box"]):
                        frame_is_spoof = True
                        cls_name = get_device_model().names[device["cls"]]
                        frame_spoof_reasons.append(f"Snake overlaps with detected '{cls_name}' display (conf: {device['conf']:.2f})")

                # Accumulate spoof reasoning across the video
                if frame_is_spoof:
                    is_spoof_detected = True
                    for r in frame_spoof_reasons:
                        if r not in final_spoof_reasons:
                            final_spoof_reasons.append(r)

        except Exception as e:
            print(f"[Detection] Frame {idx} error: {e}")
            continue

    cap.release()

    # Cleanup temp raw image
    if os.path.exists(temp_image_path):
        os.remove(temp_image_path)

    final_spoof_reason_str = " | ".join(final_spoof_reasons) if final_spoof_reasons else ""

    if best_prediction is not None and best_frame is not None:
        # ─── EXTRACT CROP BEFORE ANNOTATING ───
        # This isolates the object so the classification model isn't confused by background noise.
        x, y = int(best_prediction["x"]), int(best_prediction["y"])
        w, h = int(best_prediction["width"]), int(best_prediction["height"])
        
        # Add 10% padding to the bounding box crop
        pad_x = int(w * 0.1)
        pad_y = int(h * 0.1)
        
        frame_h, frame_w = best_frame.shape[:2]
        crop_x1 = max(0, x - w // 2 - pad_x)
        crop_y1 = max(0, y - h // 2 - pad_y)
        crop_x2 = min(frame_w, x + w // 2 + pad_x)
        crop_y2 = min(frame_h, y + h // 2 + pad_y)
        
        crop_img = best_frame[crop_y1:crop_y2, crop_x1:crop_x2]
        final_crop_path = ""
        if crop_img.size > 0:
            cv2.imwrite(crop_image_path, crop_img)
            final_crop_path = crop_image_path
        else:
            final_crop_path = output_image_path  # Fallback
            
        # Draw detections with annotations using supervision
        if tracked_detections is not None and len(tracked_detections) > 0:
            # Use supervision's box annotator for clean visualization
            box_annotator = sv.BoxAnnotator(thickness=2, color=sv.Color(r=0, g=0, b=255))
            
            # Draw bounding boxes
            best_frame = box_annotator.annotate(scene=best_frame, detections=tracked_detections)
            
            # Add confidence text manually on top
            for i, conf in enumerate(tracked_detections.confidence):
                if i < len(tracked_detections.xyxy):
                    x1, y1, x2, y2 = tracked_detections.xyxy[i]
                    label = f"Snake {conf*100:.1f}%"
                    cv2.putText(best_frame, label, (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        else:
            # Fallback: manual drawing
            x, y, w, h = int(best_prediction["x"]), int(best_prediction["y"]), int(best_prediction["width"]), int(best_prediction["height"])
            x1, y1 = x - w // 2, y - h // 2
            x2, y2 = x + w // 2, y + h // 2
            cv2.rectangle(best_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            label = f"Snake {best_confidence*100:.1f}%"
            cv2.putText(best_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        cv2.imwrite(output_image_path, best_frame)
        print(f"[Detection] Best detection: {best_confidence*100:.1f}% confidence | Spoof: {is_spoof_detected}")
        # Cleanup converted video file
        if converted_path != video_path and os.path.exists(converted_path):
            os.remove(converted_path)
        return True, best_confidence, final_crop_path, is_spoof_detected, final_spoof_reason_str
    else:
        # No snake detected in any frame — save the middle frame as fallback
        cap = cv2.VideoCapture(converted_path)
        cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
        ret, frame = cap.read()
        cap.release()
        if ret:
            cv2.imwrite(output_image_path, frame)
        print("[Detection] No snake found in any sampled frame. Checking for spoofing anyway...")
        # Return spoof info even if no snake found
        # Cleanup converted video file
        if converted_path != video_path and os.path.exists(converted_path):
            os.remove(converted_path)
        return False, 0.0, "", is_spoof_detected, final_spoof_reason_str

def detect_snake_frame(base64_data: str) -> tuple[bool, list, np.ndarray, float, list, bool, str]:
    """
    Processes a single live webcam frame encoded as base64.
    Runs snake detection (Roboflow) for low-latency live overlays.
    Device / spoof detection is handled separately by /detect-device so the snake box can appear faster.
    
    Returns:
        detected (bool): Snake found
        boxes (list): Snake bounding boxes for drawing
        frame (np.ndarray): The decoded frame
        max_conf (float): Highest snake confidence
        device_boxes (list): Device/spoof bounding boxes for drawing
        spoof_detected (bool): True if snake overlaps a device or artifact
        spoof_reason (str): Reason string
    """
    import base64
    
    # Strip base64 prefix if present
    if "base64," in base64_data:
        base64_data = base64_data.split("base64,")[1]
        
    try:
        print(f"[Live Detection] Received frame, base64 length: {len(base64_data)}")
        # Decode base64 to OpenCV image
        img_data = base64.b64decode(base64_data)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            print("[Live Detection] Failed to decode base64 frame.")
            return False, [], None, 0.0, [], False, ""

        # --- Snake detection path ---
        snake_result = [False, [], 0.0]  # [detected, boxes, max_conf]

        def run_snake_detection():
            """Use a custom local snake model if available; otherwise fall back to Roboflow."""
            try:
                model = get_snake_model()
                max_conf = 0.0
                boxes = []

                if model is not None:
                    results = model.predict(
                        frame,
                        verbose=False,
                        imgsz=384,
                        conf=0.40,
                        iou=0.50,
                        max_det=10,
                    )

                    for box in results[0].boxes:
                        conf = float(box.conf[0].cpu().item())
                        if conf > 0.40:
                            xyxy = box.xyxy[0].cpu().numpy()
                            x1, y1, x2, y2 = xyxy
                            x = (x1 + x2) / 2
                            y = (y1 + y2) / 2
                            width = x2 - x1
                            height = y2 - y1
                            if conf > max_conf:
                                max_conf = conf
                            boxes.append({
                                "x": x,
                                "y": y,
                                "width": width,
                                "height": height,
                                "class": "Snake",
                                "confidence": conf
                            })
                    source_name = "LOCAL"
                else:
                    import tempfile
                    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                        _, buffer = cv2.imencode('.jpg', frame)
                        tmp.write(buffer.tobytes())
                        tmp_path = tmp.name

                    try:
                        result = roboflow_infer(tmp_path)
                    finally:
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)

                    predictions = result.get("predictions", [])
                    for pred in predictions:
                        bbox = pred["bbox"] if "bbox" in pred else pred
                        conf = float(pred.get("confidence", 0.0))
                        if conf > max_conf:
                            max_conf = conf
                        boxes.append({
                            "x": bbox["x"],
                            "y": bbox["y"],
                            "width": bbox["width"],
                            "height": bbox["height"],
                            "class": pred.get("class", "Snake"),
                            "confidence": conf
                        })
                    source_name = "ROBOFLOW"
                
                snake_result[0] = len(boxes) > 0
                snake_result[1] = boxes
                snake_result[2] = max_conf
                if len(boxes) > 0:
                    print(f"[Live Detection] ✓ {source_name}: Snake Found! Count: {len(boxes)}, Max Conf: {max_conf:.2f}")
                else:
                    if max_conf > 0:
                        print(f"[Live Detection] {source_name}: Possible object detected but below threshold (conf={max_conf:.2f})")
                    else:
                        print(f"[Live Detection] {source_name}: No snake detected in frame.")
            except Exception as e:
                print(f"[Live Detection] Snake detection error: {e}")
                import traceback
                traceback.print_exc()

        # Priority 1: Detect Snakes
        run_snake_detection()

        detected, snake_boxes, max_conf = snake_result

        # Keep the live response lean. Device/spoof checks run on /detect-device.
        print(f"[Live Detection] snake={detected} conf={max_conf:.2f}")
        return detected, snake_boxes, frame, max_conf, [], False, ""
        
    except Exception as e:
        print(f"[Live Detection] Error processing frame: {e}")
        return False, [], None, 0.0, [], False, ""


def detect_screen_artifact(frame: np.ndarray) -> tuple[bool, float, str]:
    """
    Detects if an image was captured from a phone/monitor screen (anti-spoofing).
    Uses 4 JPEG-compression-resistant techniques:
      1. Dark Bezel Border Detection - phones have a dark frame around a bright screen
      2. Straight Edge Linearity - screens have perfectly straight unnatural edges (Hough lines)
      3. Screen Luminance Flatness - LCD screens emit flat, overexposed uniform light patches
      4. Color Saturation Overload - phone screens display hyper-saturated colors vs natural scenes
    
    Returns:
        is_screen (bool): True if screen spoofing is detected
        confidence (float): 0.0 to 1.0 confidence in screen detection
        reason (str): Human readable explanation
    """
    if frame is None:
        return False, 0.0, "No frame"

    scores = []
    reasons = []
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h_frame, w_frame = frame.shape[:2]
    frame_area = h_frame * w_frame

    # ─────────────────────────────────────────────
    # CHECK 1: Dark Bezel Border Detection
    # A phone screen held up to a camera creates a characteristic pattern:
    # dark outer border (phone body/hand) surrounding a rectangularly bright screen interior.
    # We measure the brightness contrast between a thin outer ring and the inner region.
    # ─────────────────────────────────────────────
    try:
        border_w = max(8, int(min(h_frame, w_frame) * 0.07))

        # Outer border region brightness
        outer_mask = np.zeros((h_frame, w_frame), np.uint8)
        outer_mask[:border_w, :] = 255
        outer_mask[-border_w:, :] = 255
        outer_mask[:, :border_w] = 255
        outer_mask[:, -border_w:] = 255

        # Inner region brightness
        inner_mask = np.zeros((h_frame, w_frame), np.uint8)
        inner_mask[border_w:-border_w, border_w:-border_w] = 255

        outer_mean = cv2.mean(gray, mask=outer_mask)[0]
        inner_mean = cv2.mean(gray, mask=inner_mask)[0]

        # The contrast differential: if inner is much brighter, it's likely a screen
        contrast_diff = inner_mean - outer_mean
        
        # Score: 0 → 1 over range 30px to 120px brightness difference
        bezel_score = min(1.0, max(0.0, (contrast_diff - 25) / 80.0))
        scores.append(bezel_score)

        if bezel_score > 0.35:
            reasons.append(f"Dark frame/bezel border detected (inner-outer brightness: +{contrast_diff:.0f})")

        print(f"[AntiSpoof] Bezel contrast: outer={outer_mean:.1f}, inner={inner_mean:.1f}, diff={contrast_diff:.1f}, score={bezel_score:.2f}")

    except Exception as e:
        print(f"[AntiSpoof] Bezel check failed: {e}")
        scores.append(0.0)

    # ─────────────────────────────────────────────
    # CHECK 2: Straight Edge Linearity (Hough Lines)
    # Real natural scenes (a snake in grass/leaves) have organic, curved edges.
    # A phone screen has PERFECTLY straight rectangular edges creating strong Hough lines.
    # We detect if dominant lines are close to horizontal/vertical (screen edges).
    # ─────────────────────────────────────────────
    try:
        edges = cv2.Canny(gray, 50, 150)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=int(min(h_frame, w_frame) * 0.5))

        edge_score = 0.0
        if lines is not None:
            # Count lines that are very close to 0°, 90°, 180° (screen edges)
            axis_aligned = 0
            for line in lines:
                theta = line[0][1]
                deg = np.degrees(theta) % 180
                if deg < 12 or deg > 168 or (78 < deg < 102):
                    axis_aligned += 1
            
            # Strong Hough lines that align to axes = rectangular screen edge
            edge_score = min(1.0, axis_aligned / 6.0)

            if edge_score > 0.5:
                reasons.append(f"Perfectly straight rectangular edges detected ({axis_aligned} axis-aligned Hough lines)")

        scores.append(edge_score)
        print(f"[AntiSpoof] Edge linearity score: {edge_score:.2f}")

    except Exception as e:
        print(f"[AntiSpoof] Edge linearity check failed: {e}")
        scores.append(0.0)

    # ─────────────────────────────────────────────
    # CHECK 3: Screen Luminance Flatness
    # LCD screens emit with very uniform brightness across large regions.
    # We split the image into a grid and check if inner patches are unexpectedly uniform
    # and bright — a signature of screen backlighting.
    # ─────────────────────────────────────────────
    try:
        grid = 6
        ph, pw = h_frame // grid, w_frame // grid
        bright_uniform_patches = 0
        total_inner_patches = 0

        for row in range(1, grid - 1):   # skip edge rows (might be bezel)
            for col in range(1, grid - 1):  # skip edge cols
                patch = gray[row*ph:(row+1)*ph, col*pw:(col+1)*pw]
                mean_val = float(np.mean(patch))
                std_val = float(np.std(patch))
                total_inner_patches += 1
                # A bright, uniform patch: mean > 100 AND std < 30
                if mean_val > 100 and std_val < 32:
                    bright_uniform_patches += 1

        if total_inner_patches > 0:
            uniformity_ratio = bright_uniform_patches / total_inner_patches
            # Real scenes: ratio < 0.2 ; screens: ratio 0.4 - 0.9
            lum_score = min(1.0, max(0.0, (uniformity_ratio - 0.20) / 0.45))
        else:
            lum_score = 0.0

        scores.append(lum_score)

        if lum_score > 0.4:
            reasons.append(f"Bright uniform luminance regions: {bright_uniform_patches}/{total_inner_patches} patches")

        print(f"[AntiSpoof] Luminance flatness: {bright_uniform_patches}/{total_inner_patches} patches bright+uniform, score={lum_score:.2f}")

    except Exception as e:
        print(f"[AntiSpoof] Luminance flatness check failed: {e}")
        scores.append(0.0)

    # ─────────────────────────────────────────────
    # CHECK 4: Color Saturation Overload
    # Phone screens display colors at higher saturation than real-world scenes.
    # We convert to HSV and measure the fraction of pixels with high saturation.
    # ─────────────────────────────────────────────
    try:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        s_channel = hsv[:, :, 1]  # saturation: 0-255
        v_channel = hsv[:, :, 2]  # value/brightness: 0-255

        # Count pixels that are highly saturated AND bright (excluding dark regions)
        bright_mask_hsv = v_channel > 80
        highly_saturated = np.sum((s_channel > 140) & bright_mask_hsv)
        bright_pixels = np.sum(bright_mask_hsv)

        if bright_pixels > 0:
            sat_ratio = highly_saturated / bright_pixels
        else:
            sat_ratio = 0.0

        # Real outdoor/indoor scenes: 10-30% ; phone screens: 40-85%
        sat_score = min(1.0, max(0.0, (sat_ratio - 0.28) / 0.35))
        scores.append(sat_score)

        if sat_score > 0.4:
            reasons.append(f"Hyper-saturated screen colors: {sat_ratio*100:.0f}% of bright pixels oversaturated")

        print(f"[AntiSpoof] Saturation: {sat_ratio*100:.1f}% oversaturated, score={sat_score:.2f}")

    except Exception as e:
        print(f"[AntiSpoof] Saturation check failed: {e}")
        scores.append(0.0)

    # ─────────────────────────────────────────────
    # COMBINE: Weighted scoring
    # sat: 0.40 (most reliable - no natural scene has 70%+ oversaturation)
    # edge: 0.30 (straight rectangle edges are screen-specific)
    # bezel: 0.20 (reliable only if phone not held flush to camera)
    # lum: 0.10 (supplementary)
    # ─────────────────────────────────────────────
    weights = [0.20, 0.30, 0.10, 0.40]
    final_score = sum(s * w for s, w in zip(scores[:4], weights))

    # FAST-PATH: if saturation alone is extremely high (>65%), it's almost certainly a screen.
    # No real-world natural scene achieves this level of color oversaturation.
    sat_override = len(scores) >= 4 and scores[3] >= 0.65
    if sat_override:
        reasons.append("OVERRIDE: Extreme color saturation (impossible in natural scenes)")

    # Threshold 0.28 — lower threshold since saturation is now primary signal
    is_screen = final_score >= 0.28 or sat_override

    reason_str = " | ".join(reasons) if reasons else "No screen artifacts detected"

    print(f"[AntiSpoof] Scores: bezel={scores[0]:.2f} edge={scores[1]:.2f} lum={scores[2]:.2f} sat={scores[3]:.2f}")
    print(f"[AntiSpoof] Final score: {final_score:.3f} sat_override={sat_override} → {'📱 SCREEN DETECTED' if is_screen else '✅ REAL SCENE'}")

    return is_screen, final_score, reason_str
