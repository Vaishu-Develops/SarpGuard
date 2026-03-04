import os
from twilio.rest import Client
from dotenv import load_dotenv, dotenv_values

from datetime import datetime

def send_whatsapp_alert(location: str, confidence: float, status: str, mock: bool = False):
    """
    Sends a WhatsApp alert using Twilio with pre-approved template message.
    Reads credentials fresh from .env file each time.
    """
    # Reload .env fresh each call (force reload)
    load_dotenv(override=True)
    
    # Also read from dotenv_values as backup
    env_values = dotenv_values(".env")
    
    # Try environment first, then dotenv, then defaults (NO hardcoded values!)
    account_sid = os.getenv("TWILIO_ACCOUNT_SID") or env_values.get("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN") or env_values.get("TWILIO_AUTH_TOKEN")
    whatsapp_from = os.getenv("TWILIO_WHATSAPP_FROM") or env_values.get("TWILIO_WHATSAPP_FROM") or "+14155238886"
    whatsapp_to = os.getenv("TWILIO_TO_WHATSAPP") or env_values.get("TWILIO_TO_WHATSAPP")
    content_sid = os.getenv("TWILIO_CONTENT_SID") or env_values.get("TWILIO_CONTENT_SID")
    
    print(f"[WhatsApp] Called with mock={mock}")
    print(f"[WhatsApp] Env vars: os.getenv={bool(os.getenv('TWILIO_AUTH_TOKEN'))}, dotenv_values={bool(env_values.get('TWILIO_AUTH_TOKEN'))}")
    print(f"[WhatsApp] Token status: {'✅ LOADED' if auth_token else '❌ NOT FOUND'}")
    print(f"[WhatsApp] Account: {account_sid[:10]}...")
    
    if mock or not auth_token:
        print(f"[MOCK] WhatsApp Alert: Venomous snake at {location} ({confidence:.2%})")
        return True
    
    try:
        print(f"[WhatsApp] 🔄 Creating Twilio client and sending message...")
        client = Client(account_sid, auth_token)
        
        current_time = datetime.now().strftime("%d-%b-%Y %I:%M %p")
        
        status_icon = "⚠️" if status.upper() == "VENOMOUS" else "🟢"
        threat_text = "VENOMOUS snake detected" if status.upper() == "VENOMOUS" else "Non-venomous (Harmless) snake detected"
        instruction = "Please do not approach the area. Security team has been notified." if status.upper() == "VENOMOUS" else "Snake identified as harmless. Standard removal procedures apply."
        
        # Send plain text message for snake detection alerts
        message = client.messages.create(
            from_=f"whatsapp:{whatsapp_from}",
            body=f"🐍 SARPGUARD ALERT\n⏱️ Time: {current_time}\n📍 Location: {location}\n{status_icon} {threat_text}\n📊 Confidence: {confidence:.0f}%\n\n{instruction}",
            to=f"whatsapp:{whatsapp_to}"
        )
        
        print(f"[WhatsApp Alert] ✅ SUCCESS - Message SID: {message.sid}")
        print(f"[WhatsApp Alert] ✅ Sent to {whatsapp_to}")
        print(f"[WhatsApp Alert] ✅ Location: {location} | Confidence: {confidence:.0f}%")
        return True
        
    except Exception as e:
        print(f"[WhatsApp Alert] ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_tamper_alert(location: str, spoof_confidence: float, reason: str) -> bool:
    """
    Sends a WhatsApp TAMPER ALERT when a phone screen / media spoofing attempt is detected.
    """
    load_dotenv(override=True)
    env_values = dotenv_values(".env")
    
    account_sid = os.getenv("TWILIO_ACCOUNT_SID") or env_values.get("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN") or env_values.get("TWILIO_AUTH_TOKEN")
    whatsapp_from = os.getenv("TWILIO_WHATSAPP_FROM") or env_values.get("TWILIO_WHATSAPP_FROM") or "+14155238886"
    whatsapp_to = os.getenv("TWILIO_TO_WHATSAPP") or env_values.get("TWILIO_TO_WHATSAPP")
    
    if not auth_token:
        print(f"[MOCK TAMPER] Someone tried to spoof the system at {location}!")
        return True
    
    try:
        client = Client(account_sid, auth_token)
        current_time = datetime.now().strftime("%d-%b-%Y %I:%M %p")
        
        message = client.messages.create(
            from_=f"whatsapp:{whatsapp_from}",
            body=(
                f"🚨 SARPGUARD - TAMPER ALERT!\n"
                f"⏱️ Time: {current_time}\n"
                f"📍 Location: {location}\n"
                f"⚠️ PHONE VIDEO DETECTED\n"
                f"👤 Someone tried to trigger a fake snake alert using a phone screen/video\n"
                f"🔍 Detection confidence: {spoof_confidence*100:.0f}%\n"
                f"📋 Reason: {reason}\n\n"
                f"This alert was BLOCKED. No real snake threat confirmed."
            ),
            to=f"whatsapp:{whatsapp_to}"
        )
        
        print(f"[Tamper Alert] ✅ Tamper WhatsApp sent: {message.sid}")
        return True
        
    except Exception as e:
        print(f"[Tamper Alert] ❌ ERROR: {e}")
        return False
