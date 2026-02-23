import os
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

load_dotenv()

API_KEY = os.getenv("ROBOFLOW_API_KEY")
CLASSIFICATION_MODEL_ID = "snake-venom/1"

CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=API_KEY
)

def classify_snake(image_path: str, mock: bool = False) -> tuple[str, float]:
    """
    Calls the Roboflow snake-venom/1 classification model via inference-sdk.
    Returns (status, confidence) where status is 'VENOMOUS' or 'NON VENOMOUS'.
    """
    if mock:
        print("[MOCK] Using mock classification.")
        return "VENOMOUS", 0.94

    try:
        result = CLIENT.infer(image_path, model_id=CLASSIFICATION_MODEL_ID)

        # Handle classification response (top-level "top" key from classification models)
        # Roboflow classification models return: { "top": "venomous", "confidence": 0.95, "predictions": [...] }
        predictions = result.get("predictions", [])

        if predictions:
            # Sort by confidence descending
            top_pred = sorted(predictions, key=lambda x: x["confidence"], reverse=True)[0]
            class_name = top_pred["class"].upper()  # e.g. "VENOMOUS" or "NON VENOMOUS"
            confidence = top_pred["confidence"]
        elif result.get("top"):
            # Fallback for classification model direct response
            class_name = result["top"].upper()
            confidence = result.get("confidence", 0.0)
        else:
            print("[Classification] No predictions returned.")
            return "NON VENOMOUS", 0.0

        print(f"[Classification] Result: {class_name} at {confidence*100:.1f}%")
        return class_name, confidence

    except Exception as e:
        print(f"[Classification Error] {e}")
        return "Error", 0.0
