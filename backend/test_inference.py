import os
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

load_dotenv()
API_KEY = os.getenv("ROBOFLOW_API_KEY")

CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=API_KEY
)

print(CLIENT.get_model_info("snake-detection/2"))
