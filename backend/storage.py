import json
import os
from typing import List

HISTORY_FILE = "detections.json"

def get_history() -> List[dict]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_detection(record: dict):
    history = get_history()
    history.append(record)
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=4)
