#!/usr/bin/env python3
"""
Startup script for the Person Detection API server
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'ultralytics',
        'opencv-python',
        'numpy',
        'torch',
        'torchvision'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            # Handle special cases for package import names
            import_name = package.replace('-', '_')
            if package == 'opencv-python':
                import_name = 'cv2'
            elif package == 'ultralytics':
                import_name = 'ultralytics'
            
            __import__(import_name)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("Missing required packages:")
        for package in missing_packages:
            print(f"  - {package}")
        print("\nInstall missing packages with:")
        print("pip install -r requirements.txt")
        return False
    
    return True

def check_model_file():
    """Check if model file exists, download if needed"""
    model_path = Path("Model/best_person_detection.pt")
    
    if not model_path.exists():
        print("Custom trained model not found.")
        print("I'm developing the model right now, so I'm using the pre-trained YOLOv8n model.")
        return False
    
    print(f"Custom model found: {model_path}")
    return True

def create_directories():
    """Create necessary directories"""
    directories = [
        "Model",
        "logs",
        "uploads"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"Created directory: {directory}")

def main():
    """Main startup function"""
    print("=== Person Detection API Server ===")
    print()
    
    # Check dependencies
    print("Checking dependencies...")
    if not check_dependencies():
        sys.exit(1)
    print("✓ All dependencies are installed")
    
    # Create directories
    print("\nCreating directories...")
    create_directories()
    
    # Check model file
    print("\nChecking model file...")
    check_model_file()
    
    # Start server
    print("\nStarting server...")
    print("Server will be available at: http://localhost:8000")
    print("API documentation: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")
    print()
    
    try:
        # Start uvicorn server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()