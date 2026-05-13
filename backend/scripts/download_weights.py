"""
Download ultralytics YOLOv8n weights into backend/model/yolov8n.pt
Usage (from repo root):
    python backend/scripts/download_weights.py
This script is safe to run multiple times and will skip download if file exists.
"""
import os
import sys
from urllib.request import urlretrieve

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'model')
MODEL_PATH = os.path.join(MODEL_DIR, 'yolov8n.pt')
REMOTE_URL = 'https://github.com/ultralytics/assets/releases/download/v8.4.0/yolov8n.pt'

os.makedirs(MODEL_DIR, exist_ok=True)

if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 0:
    print(f"Weights already present at: {MODEL_PATH}")
    sys.exit(0)

print(f"Downloading YOLOv8n weights to: {MODEL_PATH}")
try:
    urlretrieve(REMOTE_URL, MODEL_PATH)
    print("Download complete.")
except Exception as e:
    print(f"Failed to download weights: {e}")
    if os.path.exists(MODEL_PATH):
        try:
            os.remove(MODEL_PATH)
        except Exception:
            pass
    sys.exit(2)
