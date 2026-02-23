import streamlit as st
import requests
import json
import time

API_URL = "http://localhost:8000"

st.set_page_config(page_title="SarpGuard Dashboard", page_icon="🐍", layout="wide")

st.title("🐍 SarpGuard Prototype Dashboard")
st.markdown("AI-powered snake detection alerting system for residential compounds.")

# Sidebar status
with st.sidebar:
    st.header("System Status")
    st.success("Camera 1 (Playground): Online")
    st.success("Camera 2 (Main Gate): Online")
    st.success("WhatsApp Gateway: Connected")
    
# Main Upload Area
st.subheader("Simulate Detection (Upload Video)")
video_file = st.file_uploader("Upload a video clip from security camera", type=["mp4", "avi", "mov"])

test_mode = st.button("Run Automated Test (Bypass File Picker)")

if video_file is not None or test_mode:
    if st.button("Process Video") or test_mode:
        with st.spinner("Analyzing video..."):
            # Send to backend
            if test_mode:
                file_name = "test_video.mp4"
                try:
                    with open("e:/SarpGuard/test_video.mp4", "rb") as f:
                        file_bytes = f.read()
                except Exception as e:
                    st.error(f"Test video not found: {e}")
                    st.stop()
            else:
                file_name = video_file.name
                file_bytes = video_file.getvalue()
                
            files = {"file": (file_name, file_bytes, "video/mp4")}
            data = {"location": "Playground Area"}
            try:
                response = requests.post(f"{API_URL}/detect", files=files, data=data)
                if response.status_code == 200:
                    result = response.json()
                    st.success("Video processed successfully!")
                    
                    if result.get("image_path"):
                        col1, col2 = st.columns(2)
                        with col1:
                            st.image(result["image_path"], caption="Detection Result")
                        with col2:
                            st.subheader("Analysis")
                            st.write(f"**Status:** {result['status']}")
                            st.write(f"**Confidence:** {result['confidence']*100:.1f}%")
                            if result["alert_sent"]:
                                st.info("📱 WhatsApp Alert triggered and sent to society group.")
                    else:
                        st.warning("No snake detected in the uploaded video.")
                else:
                    st.error("Error processing video.")
            except Exception as e:
                st.error(f"Backend connection error: {e}. Is FastAPI running?")

st.markdown("---")
st.subheader("Recent Detections")
if st.button("Refresh History"):
    try:
        resp = requests.get(f"{API_URL}/history")
        if resp.status_code == 200:
            history = resp.json()
            if not history:
                st.write("No detections yet.")
            for record in reversed(history):
                with st.expander(f"{record['timestamp']} - {record['location']} - {record['status']}"):
                    st.write(f"**Confidence:** {record['confidence']*100:.1f}%")
                    st.image(record["image_path"], width=400)
    except:
        st.error("Could not fetch history.")
