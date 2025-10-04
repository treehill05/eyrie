from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import cv2
import numpy as np
import json
import asyncio
import logging
from typing import Dict, List
import uvicorn
from pathlib import Path
import base64
from io import BytesIO
from PIL import Image

from person_detector import PersonDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Person Detection API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
detector = None
connected_clients: List[WebSocket] = []
video_capture = None
is_streaming = False

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    """Initialize the person detector and camera on startup"""
    global detector, video_capture, is_streaming
    
    try:
        # Try to load custom trained model, fallback to pre-trained
        model_path = Path("Model/best_person_detection.pt")
        if not model_path.exists():
            logger.warning(f"Custom model not found at {model_path}, using pre-trained YOLOv8n")
            detector = PersonDetector("yolov8n.pt")
        else:
            detector = PersonDetector(str(model_path))
        
        logger.info("Person detection system initialized successfully")
        
        # Try to initialize camera automatically
        try:
            video_capture = cv2.VideoCapture(0)
            if video_capture.isOpened():
                # Test if we can read a frame
                ret, frame = video_capture.read()
                if ret and frame is not None:
                    is_streaming = True
                    logger.info("Camera initialized automatically on startup")
                else:
                    video_capture.release()
                    video_capture = None
                    logger.warning("Camera opened but failed to read frame")
            else:
                logger.warning("Failed to open camera automatically")
        except Exception as e:
            logger.warning(f"Failed to initialize camera automatically: {e}")
            
    except Exception as e:
        logger.error(f"Failed to initialize detector: {e}")
        # Fallback to basic detector
        try:
            detector = PersonDetector("yolov8n.pt")
            logger.info("Fallback detector initialized")
        except Exception as e2:
            logger.error(f"Failed to initialize fallback detector: {e2}")
            detector = None

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global video_capture
    if video_capture:
        video_capture.release()
    logger.info("Person detection system shutdown")

@app.get("/")
async def root():
    return {"message": "Person Detection API", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "detector_loaded": detector is not None,
        "camera_available": video_capture is not None and video_capture.isOpened(),
        "is_streaming": is_streaming,
        "active_connections": len(manager.active_connections)
    }

@app.post("/start_camera")
async def start_camera(camera_id: int = 0):
    """Start camera capture"""
    global video_capture, is_streaming
    
    try:
        if video_capture is not None:
            video_capture.release()
        
        video_capture = cv2.VideoCapture(camera_id)
        
        if not video_capture.isOpened():
            logger.error(f"Failed to open camera {camera_id}")
            raise HTTPException(status_code=400, detail=f"Failed to open camera {camera_id}")
        
        # Test if we can read a frame
        ret, frame = video_capture.read()
        if not ret or frame is None:
            logger.error(f"Failed to read frame from camera {camera_id}")
            video_capture.release()
            raise HTTPException(status_code=400, detail=f"Failed to read frame from camera {camera_id}")
        
        is_streaming = True
        logger.info(f"Camera {camera_id} started successfully")
        
        return {"message": f"Camera {camera_id} started successfully", "camera_id": camera_id}
        
    except Exception as e:
        logger.error(f"Error starting camera: {e}")
        if video_capture is not None:
            video_capture.release()
            video_capture = None
        raise HTTPException(status_code=500, detail=f"Error starting camera: {str(e)}")

@app.post("/stop_camera")
async def stop_camera():
    """Stop camera capture"""
    global video_capture, is_streaming
    
    try:
        if video_capture:
            video_capture.release()
            video_capture = None
        
        is_streaming = False
        logger.info("Camera stopped successfully")
        
        return {"message": "Camera stopped successfully"}
        
    except Exception as e:
        logger.error(f"Error stopping camera: {e}")
        is_streaming = False
        return {"message": "Camera stopped with errors", "error": str(e)}

@app.get("/detect_from_file")
async def detect_from_file(file_path: str):
    """Detect persons from an image file"""
    if detector is None:
        raise HTTPException(status_code=500, detail="Detector not initialized")
    
    try:
        # Load image
        image = cv2.imread(file_path)
        if image is None:
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Detect persons
        person_positions = detector.detect_persons(image)
        detection_summary = detector.get_detection_summary(person_positions)
        
        return detection_summary
        
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect_from_base64")
async def detect_from_base64(data: dict):
    """Detect persons from base64 encoded image"""
    if detector is None:
        raise HTTPException(status_code=500, detail="Detector not initialized")
    
    try:
        # Decode base64 image
        image_data = data["image"].split(",")[1]  # Remove data:image/jpeg;base64, prefix
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        image = Image.open(BytesIO(image_bytes))
        image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Detect persons
        person_positions = detector.detect_persons(image)
        detection_summary = detector.get_detection_summary(person_positions)
        
        return detection_summary
        
    except Exception as e:
        logger.error(f"Error processing base64 image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time detection data"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Wait for client messages (heartbeat, commands, etc.)
            data = await websocket.receive_text()
            
            # Handle different message types
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await manager.send_personal_message(json.dumps({"type": "pong"}), websocket)
            except json.JSONDecodeError:
                # Handle non-JSON messages
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

async def process_video_stream():
    """Process video stream and broadcast detection data"""
    global video_capture, detector, is_streaming
    
    if not is_streaming or video_capture is None or detector is None:
        return
    
    try:
        ret, frame = video_capture.read()
        if not ret:
            logger.warning("Failed to read frame from camera")
            return
        
        # Process frame for person detection
        annotated_frame, detection_summary = detector.process_video_frame(frame)
        
        # Add frame data to detection summary
        detection_summary["frame_available"] = True
        
        # Broadcast detection data to all connected clients
        if manager.active_connections:
            await manager.broadcast(json.dumps(detection_summary))
        
    except Exception as e:
        logger.error(f"Error processing video stream: {e}")

@app.get("/video_feed")
async def video_feed():
    """Stream video with person detection overlays"""
    global video_capture, detector
    
    if video_capture is None:
        logger.error("Camera not started - please call /start_camera first")
        raise HTTPException(status_code=400, detail="Camera not started - please call /start_camera first")
    
    if detector is None:
        logger.error("Detector not initialized")
        raise HTTPException(status_code=400, detail="Detector not initialized")
    
    if not video_capture.isOpened():
        logger.error("Camera is not opened - please call /start_camera first")
        raise HTTPException(status_code=400, detail="Camera is not opened - please call /start_camera first")
    
    async def generate_frames():
        frame_count = 0
        logger.info("Starting video stream generation")
        
        while True:
            try:
                ret, frame = video_capture.read()
                if not ret:
                    logger.warning("Failed to read frame from camera")
                    await asyncio.sleep(0.1)
                    continue
                
                if frame is None or frame.size == 0:
                    logger.warning("Received empty frame")
                    await asyncio.sleep(0.1)
                    continue
                
                # Process frame for person detection
                annotated_frame, detection_summary = detector.process_video_frame(frame)
                
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if not ret:
                    logger.warning("Failed to encode frame")
                    continue
                
                frame_bytes = buffer.tobytes()
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                frame_count += 1
                if frame_count % 100 == 0:
                    logger.info(f"Streamed {frame_count} frames")
                
                # Small delay to control frame rate
                await asyncio.sleep(0.033)  # ~30 FPS
                
            except Exception as e:
                logger.error(f"Error in video stream generation: {e}")
                await asyncio.sleep(0.1)
                continue
    
    return StreamingResponse(
        generate_frames(), 
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

async def video_processing_loop():
    """Main video processing loop"""
    logger.info("Starting video processing loop")
    while True:
        try:
            if is_streaming:
                await process_video_stream()
            await asyncio.sleep(0.033)  # ~30 FPS
        except Exception as e:
            logger.error(f"Error in video processing loop: {e}")
            await asyncio.sleep(1.0)  # Wait longer on error

@app.on_event("startup")
async def start_video_processing():
    """Start the video processing loop"""
    logger.info("Starting video processing task")
    asyncio.create_task(video_processing_loop())

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
