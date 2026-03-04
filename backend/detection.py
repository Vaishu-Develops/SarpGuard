import cv2
import os
import numpy as np
from inference_sdk import InferenceHTTPClient
from dotenv import load_dotenv
import supervision as sv

load_dotenv()

API_KEY = os.getenv("ROBOFLOW_API_KEY")
DETECTION_MODEL_ID = "snake-detection/2"

CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=API_KEY
)

# Initialize ByteTrack for snake tracking across frames
byte_tracker = sv.ByteTrack()

def detect_snake(video_path: str, output_image_path: str, crop_image_path: str, max_samples: int = 20) -> tuple[bool, float, str]:
    """
    Samples multiple frames from the video, runs Roboflow snake-detection/2 detection,
    uses ByteTrack to track snake movement across frames,
    saves annotated frame with tracking info, and returns (detected, confidence, crop_path).
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("[Detection] Could not open video.")
        return False, 0.0, ""

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    duration = total_frames / fps if fps > 0 else 0
    print(f"[Detection] Video info: {total_frames} frames, {fps:.1f} FPS, {duration:.1f}s duration")

    if total_frames <= 0:
        total_frames = 300

    # For short videos (< 5s), sample every ~0.5 second; otherwise spread across video
    if duration <= 5:
        step = max(1, int(fps * 0.5))  # every 0.5 seconds
        frame_indices = list(range(0, total_frames, step))
    else:
        sample_count = min(max_samples, total_frames)
        if sample_count <= 1:
            frame_indices = [0]
        else:
            frame_indices = [int(i * (total_frames - 1) / (sample_count - 1)) for i in range(sample_count)]

    temp_image_path = output_image_path.replace(".jpg", "_raw.jpg")
    best_confidence = 0.0
    best_prediction = None
    best_frame = None
    tracked_detections = None  # Store tracking data for the best frame

    print(f"[Detection] Sampling {len(frame_indices)} frames from video with ByteTrack")

    # Reset tracker for new video
    byte_tracker.reset()

    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue

        cv2.imwrite(temp_image_path, frame)
        h, w = frame.shape[:2]

        try:
            result = CLIENT.infer(temp_image_path, model_id=DETECTION_MODEL_ID)
            predictions = result.get("predictions", [])
            print(f"[Detection] Frame {idx}: {len(predictions)} predictions found")

            if predictions:
                # Convert Roboflow predictions to supervision Detections format
                boxes = []
                confidences = []
                for pred in predictions:
                    x, y = pred["x"], pred["y"]
                    box_w, box_h = pred["width"], pred["height"]
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
                detections = byte_tracker.update_with_detections(detections)

                # Store best detection
                if len(predictions) > 0:
                    top = sorted(predictions, key=lambda x: x["confidence"], reverse=True)[0]
                    conf = top["confidence"]
                    print(f"[Detection] Frame {idx}: snake found with {conf*100:.1f}% confidence")

                    if conf > best_confidence:
                        best_confidence = conf
                        best_prediction = top
                        best_frame = frame.copy()
                        tracked_detections = detections  # Save tracking data for best frame

            else:
                print(f"[Detection] Frame {idx}: no snake detected")
        except Exception as e:
            print(f"[Detection] Frame {idx} error: {e}")
            continue

    cap.release()

    # Cleanup temp raw image
    if os.path.exists(temp_image_path):
        os.remove(temp_image_path)

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
        print(f"[Detection] Best detection: {best_confidence*100:.1f}% confidence | Annotated with supervision")
        return True, best_confidence, final_crop_path
    else:
        # No snake detected in any frame — save the middle frame as fallback
        cap = cv2.VideoCapture(video_path)
        cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
        ret, frame = cap.read()
        cap.release()
        if ret:
            cv2.imwrite(output_image_path, frame)
        print("[Detection] No snake found in any sampled frame.")
        return False, 0.0, ""

def detect_snake_frame(base64_data: str) -> tuple[bool, list, np.ndarray, float]:
    """
    Processes a single live webcam frame encoded as base64.
    Returns:
        detected (bool): If a snake is found.
        boxes (list): List of dicts with x, y, width, height, confidence for the frontend to draw.
        frame (np.ndarray): The decoded OpenCV image array (for cropping/saving later if needed).
        max_conf (float): The highest confidence score found.
    """
    import base64
    
    # Strip base64 prefix if present
    if "base64," in base64_data:
        base64_data = base64_data.split("base64,")[1]
        
    try:
        # Decode base64 to OpenCV image
        img_data = base64.b64decode(base64_data)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            print("[Live Detection] Failed to decode base64 frame.")
            return False, [], None, 0.0
            
        # Run Roboflow Inference on the raw Numpy Array directly (inference-sdk supports this)
        result = CLIENT.infer(frame, model_id=DETECTION_MODEL_ID)
        predictions = result.get("predictions", [])
        
        if not predictions:
            return False, [], frame, 0.0
            
        boxes = []
        max_conf = 0.0
        
        for pred in predictions:
            conf = pred["confidence"]
            if conf > max_conf:
                max_conf = conf
                
            boxes.append({
                "x": pred["x"],
                "y": pred["y"],
                "width": pred["width"],
                "height": pred["height"],
                "confidence": conf
            })
            
        return len(boxes) > 0, boxes, frame, max_conf
        
    except Exception as e:
        print(f"[Live Detection] Error processing frame: {e}")
        return False, [], None, 0.0


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
