import os
from twilio.rest import Client
from dotenv import load_dotenv, dotenv_values

def send_whatsapp_alert(location: str, confidence: float, mock: bool = False):
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
        
        # Send plain text message for snake detection alerts
        message = client.messages.create(
            from_=f"whatsapp:{whatsapp_from}",
            body=f"🐍 SARPGUARD ALERT\n📍 Location: {location}\n⚠️ VENOMOUS snake detected\n📊 Confidence: {confidence*100:.0f}%",
            to=f"whatsapp:{whatsapp_to}"
        )
        
        print(f"[WhatsApp Alert] ✅ SUCCESS - Message SID: {message.sid}")
        print(f"[WhatsApp Alert] ✅ Sent to {whatsapp_to}")
        print(f"[WhatsApp Alert] ✅ Location: {location} | Confidence: {confidence*100:.0f}%")
        return True
        print(f"[WhatsApp Alert] ✅ Location: {location} | Confidence: {confidence*100:.0f}%")
        return True
        
    except Exception as e:
        print(f"[WhatsApp Alert] ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
