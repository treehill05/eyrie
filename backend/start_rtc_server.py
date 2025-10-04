#!/usr/bin/env python3
"""
Script to start RTC server for video streaming with person detection
"""

import os
import sys
import webbrowser
import time
from pathlib import Path
import config  # Load centralized configuration

def check_video_file():
    """Check if video files exist in upload folder"""
    upload_dir = Path(config.UPLOAD_FOLDER)
    
    if not upload_dir.exists():
        print("⚠️  Upload folder not found. Creating...")
        upload_dir.mkdir(exist_ok=True)
        print("✓ Upload folder created")
        return False
    
    video_files = list(upload_dir.glob("*.mp4")) + list(upload_dir.glob("*.avi")) + \
                  list(upload_dir.glob("*.mov")) + list(upload_dir.glob("*.mkv"))
    
    if not video_files:
        print("⚠️  No video files found in upload folder")
        print("   Please add a video file to the 'upload/' folder")
        return False
    
    print(f"✓ Found {len(video_files)} video file(s):")
    for video in video_files:
        size_mb = video.stat().st_size / (1024 * 1024)
        print(f"  - {video.name} ({size_mb:.2f} MB)")
    
    return True

def check_model_file():
    """Check if YOLO model is available"""
    model_files = [
        Path("yolov8n.pt"),
        Path("Model/best_person_detection.pt")
    ]
    
    for model_file in model_files:
        if model_file.exists():
            print(f"✓ Model found: {model_file}")
            return True
    
    print("⚠️  YOLO model not found")
    print("   Server will download yolov8n.pt automatically")
    return True

def main():
    """Main function"""
    print("=" * 60)
    print("🎥 RTC Server - Person Detection in Video")
    print("=" * 60)
    print()
    
    # Checks
    print("📋 Checking required files...")
    print()
    
    has_video = check_video_file()
    check_model_file()
    
    print()
    print("=" * 60)
    
    if not has_video:
        print()
        print("❌ Please add a video file to the 'upload/' folder")
        print("   before starting the server")
        sys.exit(1)
    
    print()
    print("✅ Everything ready to start!")
    print()
    print("🌐 Server available at:")
    print(f"   - API: {config.BACKEND_URL}")
    print(f"   - Docs: {config.BACKEND_URL}/docs")
    print(f"   - Health: {config.BACKEND_URL}/health")
    print(f"   - Config: {config.BACKEND_URL}/config")
    print()
    print("🧪 Test client available at:")
    print("   - file://{}".format(Path("test_rtc_client.html").absolute()))
    print()
    print("📊 Main endpoints:")
    print("   - POST /offer - Start RTC streaming")
    print("   - GET /available-videos - List available videos")
    print(f"   - WS {config.BACKEND_WS_URL}/ws/detection - Real-time data")
    print()
    print("⚙️  Configuration:")
    print(f"   - Port: {config.BACKEND_PORT}")
    print(f"   - Default source: {config.DEFAULT_VIDEO_SOURCE}")
    print(f"   - Default video: {config.DEFAULT_VIDEO_FILE}")
    print()
    print("💡 Tip: Edit the .env file to change settings")
    print("   All URLs will be updated automatically!")
    print()
    print("=" * 60)
    print()
    
    # Ask if user wants to open test client
    try:
        response = input("Open test client in browser? (y/n): ").lower()
        if response == 'y':
            test_client_path = Path("test_rtc_client.html").absolute()
            webbrowser.open(f"file://{test_client_path}")
            print("✓ Test client opened in browser")
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n\nCancelled by user")
        sys.exit(0)
    
    print()
    print("🚀 Starting server...")
    print("   Press Ctrl+C to stop")
    print()
    
    # Start server
    try:
        import uvicorn
        uvicorn.run(
            "rtc_server:app",
            host=config.BACKEND_HOST,
            port=config.BACKEND_PORT,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
    except ImportError:
        print("\n❌ Error: uvicorn is not installed")
        print("   Run: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()