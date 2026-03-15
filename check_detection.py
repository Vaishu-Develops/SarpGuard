from backend.detection import detect_snake_frame, DEVICE_CLASSES, device_model, DEVICE_CLASS_NAMES
print("Classes:", DEVICE_CLASSES)
print("Class names:", DEVICE_CLASS_NAMES)
print("Model path:", device_model.ckpt_path)
print("All imports OK!")
