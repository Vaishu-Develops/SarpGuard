import os
from dotenv import load_dotenv, find_dotenv

# Use find_dotenv and override to ensure we pick up the latest edits
load_dotenv(find_dotenv(), override=True)

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")

def classify_snake(image_path: str, mock: bool = False) -> tuple[str, float]:
    """
    Calls the Roboflow Snake-Venom API using the official SDK.
    Returns (status, confidence).
    """
    # Re-evaluate env var in case of hot-reload
    api_key = os.getenv("ROBOFLOW_API_KEY", ROBOFLOW_API_KEY)
    
    if mock or not api_key:
        print(f"[MOCK] Using mock classification. Key present: {bool(api_key)}")
        return "VENOMOUS", 0.94
        
    try:
        from roboflow import Roboflow
        # User snippet:
        # rf = Roboflow(api_key="rf_your_key_here")
        # model = rf.workspace("kittipon-sytfh").project("snake-venom").version(1).model
        rf = Roboflow(api_key=api_key)
        project = rf.workspace("kittipon-sytfh").project("snake-venom")
        model = project.version(1).model
        
        # Predict on the image
        prediction = model.predict(image_path, confidence=40, overlap=30).json()
        
        predictions = prediction.get("predictions", [])
        if predictions:
            # Get the highest confidence prediction
            top_pred = sorted(predictions, key=lambda x: x["confidence"], reverse=True)[0]
            class_name = top_pred["class"].upper() # e.g. VENOMOUS or HARMLESS
            confidence = top_pred["confidence"]
            print(f"[Roboflow] Detected: {class_name} with {confidence*100:.1f}% confidence")
            return class_name, confidence
        else:
            print("[Roboflow] No prediction returned for crop.")
            return "NON VENOMOUS", 0.0 # Default if model doesn't find anything
            
    except Exception as e:
        print(f"Classification error: {e}")
        return "Error", 0.0
