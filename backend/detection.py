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
