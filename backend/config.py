"""
Configuration Module - Centralized configuration from environment variables
All URLs and settings are managed here
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Find and load .env file from project root
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent

env_loaded = False
for env_path in [current_dir / '.env', root_dir / '.env', Path('.env')]:
    if env_path.exists():
        load_dotenv(env_path)
        env_loaded = True
        print(f"✓ Loaded configuration from: {env_path}")
        break

if not env_loaded:
    print("⚠️  No .env file found. Using default values.")
    print("   Copy config.env.example to .env and customize as needed.")

# ============================================================================
# Server Configuration
# ============================================================================

BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
RTC_PORT = int(os.getenv("RTC_PORT", "8001"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Computed URLs
BACKEND_URL = f"http://{BACKEND_HOST if BACKEND_HOST != '0.0.0.0' else 'localhost'}:{BACKEND_PORT}"
BACKEND_WS_URL = f"ws://{BACKEND_HOST if BACKEND_HOST != '0.0.0.0' else 'localhost'}:{BACKEND_PORT}"
RTC_URL = f"http://{BACKEND_HOST if BACKEND_HOST != '0.0.0.0' else 'localhost'}:{RTC_PORT}"
RTC_WS_URL = f"ws://{BACKEND_HOST if BACKEND_HOST != '0.0.0.0' else 'localhost'}:{RTC_PORT}"

# ============================================================================
# STUN/TURN Configuration
# ============================================================================

STUN_URL = os.getenv("STUN_URL", "stun:stun.cloudflare.com:3478")
TURN_URLS_STR = os.getenv("TURN_URLS", "")
TURN_USERNAME = os.getenv("TURN_USERNAME", "")
TURN_CREDENTIAL = os.getenv("TURN_CREDENTIAL", "")

# Parse TURN URLs
if TURN_URLS_STR:
    TURN_URLS = [url.strip() for url in TURN_URLS_STR.split(",") if url.strip()]
else:
    TURN_URLS = [
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turn:turn.cloudflare.com:80?transport=tcp",
        "turns:turn.cloudflare.com:443?transport=tcp"
    ]

# ============================================================================
# YOLO Model Configuration
# ============================================================================

MODEL_PATH = os.getenv("MODEL_PATH", "yolov8n.pt")
DETECTION_CONFIDENCE = float(os.getenv("DETECTION_CONFIDENCE", "0.5"))

# ============================================================================
# Video Configuration
# ============================================================================

DEFAULT_VIDEO_SOURCE = os.getenv("DEFAULT_VIDEO_SOURCE", "file")
DEFAULT_CAMERA_ID = int(os.getenv("DEFAULT_CAMERA_ID", "0"))
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "upload")
DEFAULT_VIDEO_FILE = os.getenv(
    "DEFAULT_VIDEO_FILE", 
    "vecteezy_aerial-view-of-marathon-runners-on-the-streets-of-kyiv-ukraine_11539866.mp4"
)
DEFAULT_LOOP_VIDEO = os.getenv("DEFAULT_LOOP_VIDEO", "true").lower() == "true"

# Computed video path
DEFAULT_VIDEO_PATH = f"{UPLOAD_FOLDER}/{DEFAULT_VIDEO_FILE}"

# ============================================================================
# CORS Origins
# ============================================================================

CORS_ORIGINS = [
    FRONTEND_URL,
    f"http://localhost:{BACKEND_PORT}",
    "http://localhost:3000",
    "http://localhost:3001",
    "*"  # Allow all in development - remove in production
]

# ============================================================================
# Configuration Summary
# ============================================================================

def print_config():
    """Print current configuration"""
    print("\n" + "=" * 70)
    print("📋 SERVER CONFIGURATION")
    print("=" * 70)
    print(f"Backend URL:      {BACKEND_URL}")
    print(f"Backend WS URL:   {BACKEND_WS_URL}")
    print(f"RTC URL:          {RTC_URL}")
    print(f"RTC WS URL:       {RTC_WS_URL}")
    print(f"Frontend URL:     {FRONTEND_URL}")
    print(f"Host:             {BACKEND_HOST}")
    print(f"Backend Port:     {BACKEND_PORT}")
    print(f"RTC Port:         {RTC_PORT}")
    print("\n" + "=" * 70)
    print("🎥 VIDEO CONFIGURATION")
    print("=" * 70)
    print(f"Default Source:   {DEFAULT_VIDEO_SOURCE}")
    print(f"Upload Folder:    {UPLOAD_FOLDER}")
    print(f"Default Video:    {DEFAULT_VIDEO_FILE}")
    print(f"Default Path:     {DEFAULT_VIDEO_PATH}")
    print(f"Loop Video:       {DEFAULT_LOOP_VIDEO}")
    print(f"Camera ID:        {DEFAULT_CAMERA_ID}")
    print("\n" + "=" * 70)
    print("🤖 MODEL CONFIGURATION")
    print("=" * 70)
    print(f"Model Path:       {MODEL_PATH}")
    print(f"Confidence:       {DETECTION_CONFIDENCE}")
    print("\n" + "=" * 70)
    print("🌐 WEBRTC CONFIGURATION")
    print("=" * 70)
    print(f"STUN Server:      {STUN_URL}")
    print(f"TURN Servers:     {len(TURN_URLS)} configured")
    print(f"TURN Auth:        {'Yes' if TURN_USERNAME else 'No'}")
    print("=" * 70 + "\n")


# Export all configuration as a dict for easy access
CONFIG = {
    # Server
    "BACKEND_HOST": BACKEND_HOST,
    "BACKEND_PORT": BACKEND_PORT,
    "RTC_PORT": RTC_PORT,
    "BACKEND_URL": BACKEND_URL,
    "BACKEND_WS_URL": BACKEND_WS_URL,
    "RTC_URL": RTC_URL,
    "RTC_WS_URL": RTC_WS_URL,
    "FRONTEND_URL": FRONTEND_URL,
    
    # STUN/TURN
    "STUN_URL": STUN_URL,
    "TURN_URLS": TURN_URLS,
    "TURN_USERNAME": TURN_USERNAME,
    "TURN_CREDENTIAL": TURN_CREDENTIAL,
    
    # Model
    "MODEL_PATH": MODEL_PATH,
    "DETECTION_CONFIDENCE": DETECTION_CONFIDENCE,
    
    # Video
    "DEFAULT_VIDEO_SOURCE": DEFAULT_VIDEO_SOURCE,
    "DEFAULT_CAMERA_ID": DEFAULT_CAMERA_ID,
    "UPLOAD_FOLDER": UPLOAD_FOLDER,
    "DEFAULT_VIDEO_FILE": DEFAULT_VIDEO_FILE,
    "DEFAULT_VIDEO_PATH": DEFAULT_VIDEO_PATH,
    "DEFAULT_LOOP_VIDEO": DEFAULT_LOOP_VIDEO,
    
    # CORS
    "CORS_ORIGINS": CORS_ORIGINS,
}


if __name__ == "__main__":
    # Print configuration when run directly
    print_config()