"""
WebRTC Backend Server for Person Detection
Receives video from camera/source -> Processes with YOLO -> Streams to frontend
"""

import asyncio
import json
import logging
import os
import time
from typing import Dict, Set, Optional
from dataclasses import dataclass
from datetime import datetime
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    VideoStreamTrack,
    RTCConfiguration,
    RTCIceServer,
    MediaStreamTrack
)
from aiortc.contrib.media import MediaRelay
from av import VideoFrame
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import config
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

from person_detector import PersonDetector
import config  # Centralized configuration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Print configuration on startup
config.print_config()

# ============================================================================
# Configuration
# ============================================================================

# Use simplified CORS for development
CORS_ORIGINS = ["*"]

# Initialize default RTCConfiguration from centralized config
rtc_configuration = RTCConfiguration(
    iceServers=[
        RTCIceServer(urls=[config.STUN_URL]),
    ]
)

# Only add TURN servers if credentials are provided
if config.TURN_USERNAME and config.TURN_CREDENTIAL:
    rtc_configuration.iceServers.append(
        RTCIceServer(
            urls=config.TURN_URLS,
            username=config.TURN_USERNAME,
            credential=config.TURN_CREDENTIAL
        )
    )

logger.info("Backend initialized with ICE configuration")
logger.info(f"STUN Server: {config.STUN_URL}")
if config.TURN_URLS:
    logger.info(f"TURN endpoints: {len(config.TURN_URLS)}")

# ============================================================================
# Data Models
# ============================================================================

class OfferRequest(BaseModel):
    sdp: str
    type: str
    client_id: str
    source: str = "file"  # "camera" or "file"
    video_path: Optional[str] = None  # Path to video file if source is "file"
    camera_id: int = 0  # Camera ID if source is "camera"
    loop_video: bool = True  # Whether to loop video file

class StreamStartRequest(BaseModel):
    client_id: str
    video_path: str = "ForBiggerEscapes.mp4"

class DetectionData(BaseModel):
    client_id: str
    timestamp: float
    total_persons: int
    average_confidence: float
    positions: list
    frame_number: int

# ============================================================================
# Video Processing Track
# ============================================================================

class VideoFileTrack(VideoStreamTrack):
    """Video track that reads from a video file"""
    
    def __init__(self, video_path: str = None, loop: bool = True):
        super().__init__()
        
        # Use default video if none specified
        if video_path is None:
            video_path = config.DEFAULT_VIDEO_PATH
        
        self.video_path = video_path
        self.loop = loop
        self.frame_count = 0
        
        # Try to find the video file
        if not os.path.exists(self.video_path):
            # Try in upload folder
            alt_path = os.path.join(config.UPLOAD_FOLDER, os.path.basename(self.video_path))
            if os.path.exists(alt_path):
                self.video_path = alt_path
            else:
                # Try default video
                default_path = config.DEFAULT_VIDEO_PATH
                if os.path.exists(default_path):
                    logger.warning(f"Video file not found: {video_path}, using default: {default_path}")
                    self.video_path = default_path
                else:
                    raise FileNotFoundError(f"Video file not found: {video_path}")
        
        self.cap = cv2.VideoCapture(self.video_path)
        
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open video file: {self.video_path}")
        
        # Get video properties
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        logger.info(f"Video file initialized: {self.video_path}")
        logger.info(f"Video properties: {self.width}x{self.height} @ {self.fps}fps, {self.total_frames} frames")
        
    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        ret, frame = self.cap.read()
        
        # Loop the video when it ends
        if not ret and self.loop:
            logger.info("Video ended, restarting from beginning")
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
            self.frame_count = 0
        
        if not ret:
            logger.info("Video ended, restarting from beginning")
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
            self.frame_count = 0
        
        if not ret:
            # If still can't read, create a black frame
            frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)        
        self.frame_count += 1
        
        # Convert frame to VideoFrame
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        
        return video_frame
    
    def stop(self):
        if self.cap:
            self.cap.release()
            logger.info(f"Video file {self.video_path} released")


class ProcessedVideoTrack(VideoStreamTrack):
    """Video track that processes incoming video with person detection"""
    
    def __init__(self, track: MediaStreamTrack, detector: PersonDetector, client_id: str):
        super().__init__()
        self.track = track
        self.detector = detector
        self.client_id = client_id
        self.frame_count = 0
        self.last_detection_data = None
        
    async def recv(self):
        try:
            frame = await self.track.recv()
            img = frame.to_ndarray(format="bgr24")
            
            # Only process detection if detector is available
            if self.detector and self.detector.model:
                # Process frame with person detection
                annotated_img, detection_summary = self.detector.process_video_frame(img)
                
                self.frame_count += 1
                detection_summary['frame_number'] = self.frame_count
                detection_summary['client_id'] = self.client_id
                self.last_detection_data = detection_summary
                
                if self.frame_count % 30 == 0:
                    logger.info(
                        f"[{self.client_id}] Frame {self.frame_count}: "
                        f"{detection_summary['total_persons']} persons detected"
                    )
            else:
                # If no detector, just pass through the frame
                annotated_img = img
                logger.warning(f"Detector not available for client {self.client_id}")
            
            # Create new video frame
            new_frame = VideoFrame.from_ndarray(annotated_img, format="bgr24")
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base
            
            return new_frame
            
        except Exception as e:
            logger.error(f"Error processing frame for {self.client_id}: {e}")
            # Return the original frame on error
            return await self.track.recv()
    
    def get_detection_data(self) -> Optional[dict]:
        return self.last_detection_data


# ============================================================================
# Connection Management
# ============================================================================

@dataclass
class ClientConnection:
    client_id: str
    peer_connection: RTCPeerConnection
    video_track: Optional[VideoFileTrack] = None
    processed_track: Optional[ProcessedVideoTrack] = None
    websocket: Optional[WebSocket] = None
    created_at: float = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()


class ConnectionManager:
    def __init__(self):
        self.clients: Dict[str, ClientConnection] = {}
        self.websockets: Set[WebSocket] = set()
        self.media_relay = MediaRelay()
        
    def add_client(self, client_id: str, pc: RTCPeerConnection) -> ClientConnection:
        client = ClientConnection(client_id=client_id, peer_connection=pc)
        self.clients[client_id] = client
        logger.info(f"Client added: {client_id}")
        return client
    
    def get_client(self, client_id: str) -> Optional[ClientConnection]:
        return self.clients.get(client_id)
    
    async def remove_client(self, client_id: str):
        client = self.clients.pop(client_id, None)
        if client:
            if client.video_track:
                client.video_track.stop()
            await client.peer_connection.close()
            logger.info(f"Client removed: {client_id}")
    
    async def add_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.websockets.add(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.websockets)}")
    
    def remove_websocket(self, websocket: WebSocket):
        self.websockets.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.websockets)}")
    
    async def broadcast_detection_data(self, client_id: str, data: dict):
        """Broadcast detection data to all connected WebSockets"""
        if not data:
            return
            
        message = {
            "type": "detection_update",
            "client_id": client_id,
            "data": data,
            "timestamp": time.time()
        }
        
        disconnected = set()
        for ws in self.websockets:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                disconnected.add(ws)
        
        for ws in disconnected:
            self.remove_websocket(ws)


# ============================================================================
# Global State
# ============================================================================

detector: Optional[PersonDetector] = None
connection_manager: Optional[ConnectionManager] = None
broadcast_task: Optional[asyncio.Task] = None


# ============================================================================
# Background Tasks
# ============================================================================

async def detection_broadcast_loop():
    """Periodically broadcast detection data to all connected WebSockets"""
    while True:
        try:
            await asyncio.sleep(0.1)  # Broadcast every 100ms
            
            if not connection_manager:
                continue
            
            # Broadcast detection data for each client
            for client_id, client in connection_manager.clients.items():
                if client.processed_track:
                    detection_data = client.processed_track.get_detection_data()
                    if detection_data:
                        await connection_manager.broadcast_detection_data(
                            client_id, 
                            detection_data
                        )
                        
        except asyncio.CancelledError:
            logger.info("Detection broadcast loop cancelled")
            break
        except Exception as e:
            logger.error(f"Error in detection broadcast loop: {e}")
            await asyncio.sleep(1.0)


# ============================================================================
# Lifespan Event Handler
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector, connection_manager, broadcast_task
    
    logger.info("Starting up WebRTC backend...")
    
    try:
        # Initialize person detector
        detector = PersonDetector(config.MODEL_PATH, conf_threshold=config.DETECTION_CONFIDENCE)
        logger.info(f"Person detector initialized successfully with model: {config.MODEL_PATH}")
        
        # Initialize connection manager
        connection_manager = ConnectionManager()
        logger.info("Connection manager initialized")
        
        # Start broadcast task
        broadcast_task = asyncio.create_task(detection_broadcast_loop())
        logger.info("Detection broadcast loop started")
        
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        detector = None
        connection_manager = None
    
    yield
    
    # Shutdown
    logger.info("Shutting down WebRTC backend...")
    
    if broadcast_task:
        broadcast_task.cancel()
        try:
            await broadcast_task
        except asyncio.CancelledError:
            pass
    
    if connection_manager:
        client_ids = list(connection_manager.clients.keys())
        for client_id in client_ids:
            await connection_manager.remove_client(client_id)
    
    logger.info("Shutdown complete")


# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="WebRTC Person Detection Backend", 
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - Allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ============================================================================
# HTTP Endpoints
# ============================================================================

@app.get("/")
async def root():
    return {
        "message": "WebRTC Person Detection Backend",
        "status": "running",
        "version": "1.0.0",
        "default_video": config.DEFAULT_VIDEO_FILE,
        "detector_loaded": detector is not None and detector.model is not None
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "detector_loaded": detector is not None and detector.model is not None,
        "active_clients": len(connection_manager.clients) if connection_manager else 0,
        "active_websockets": len(connection_manager.websockets) if connection_manager else 0,
        "timestamp": time.time()
    }


@app.get("/config")
async def get_config():
    """Get client configuration"""
    return {
        "backend_url": config.BACKEND_URL,
        "ws_url": config.BACKEND_WS_URL,
        "rtc_url": config.RTC_URL,
        "rtc_ws_url": config.RTC_WS_URL,
        "default_video_source": config.DEFAULT_VIDEO_SOURCE,
        "default_loop_video": config.DEFAULT_LOOP_VIDEO
    }


@app.post("/offer")
async def handle_offer(offer_request: OfferRequest):
    """Handle WebRTC offer from client"""
    try:
        if not connection_manager:
            raise HTTPException(status_code=503, detail="Connection manager not initialized")
            
        if not detector:
            logger.warning("Detector not initialized, video will stream without detection")
        
        client_id = offer_request.client_id
        logger.info(f"Received offer from client: {client_id}")
        
        # Create peer connection
        pc = RTCPeerConnection(configuration=rtc_configuration)
        client = connection_manager.add_client(client_id, pc)
        
        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logger.info(f"[{client_id}] Connection state: {pc.connectionState}")
            if pc.connectionState in ["failed", "closed"]:
                await connection_manager.remove_client(client_id)
        
        @pc.on("iceconnectionstatechange")
        async def on_iceconnectionstatechange():
            logger.info(f"[{client_id}] ICE state: {pc.iceConnectionState}")
        
        # Initialize video track based on source
        try:
            if offer_request.source == "file":
                video_path = offer_request.video_path or config.DEFAULT_VIDEO_PATH
                video_track = VideoFileTrack(video_path, loop=offer_request.loop_video)
            else:
                # Camera source not implemented in this version
                raise HTTPException(status_code=501, detail="Camera source not implemented")
            
            client.video_track = video_track
            logger.info(f"[{client_id}] Video track initialized")
            
        except FileNotFoundError as e:
            logger.error(f"Video file not found: {e}")
            await connection_manager.remove_client(client_id)
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            logger.error(f"Failed to initialize video track: {e}")
            await connection_manager.remove_client(client_id)
            raise HTTPException(status_code=500, detail=f"Video initialization failed: {e}")
        
        # Create relay and processed track
        relayed_track = connection_manager.media_relay.subscribe(video_track)
        
        # Only add processing if detector is available
        if detector and detector.model:
            processed_track = ProcessedVideoTrack(relayed_track, detector, client_id)
            client.processed_track = processed_track
            pc.addTrack(processed_track)
            logger.info(f"[{client_id}] Added processed video track with detection")
        else:
            # Add raw video track without processing
            pc.addTrack(relayed_track)
            logger.warning(f"[{client_id}] Added video track without detection (detector not available)")
        
        # Handle the offer
        await pc.setRemoteDescription(
            RTCSessionDescription(sdp=offer_request.sdp, type=offer_request.type)
        )
        
        # Create and set answer
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        logger.info(f"[{client_id}] Created answer, WebRTC connection established")
        
        return {
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type,
            "client_id": client_id,
            "status": "success",
            "detection_enabled": detector is not None and detector.model is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling offer: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/stop-stream")
async def stop_stream(client_id: str):
    """Stop a specific stream"""
    if not connection_manager:
        raise HTTPException(status_code=503, detail="Connection manager not initialized")
        
    client = connection_manager.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    await connection_manager.remove_client(client_id)
    
    return {
        "status": "stopped",
        "client_id": client_id,
        "message": "Stream stopped successfully"
    }


@app.get("/active-streams")
async def get_active_streams():
    """List all active streams"""
    if not connection_manager:
        return {"active_streams": [], "count": 0, "timestamp": time.time()}
        
    streams = []
    for client_id, client in connection_manager.clients.items():
        detection_data = None
        if client.processed_track:
            detection_data = client.processed_track.get_detection_data()
        
        streams.append({
            "client_id": client_id,
            "connected_at": client.created_at,
            "connection_state": client.peer_connection.connectionState,
            "has_video": client.video_track is not None,
            "has_detection": client.processed_track is not None,
            "latest_detection": detection_data
        })
    
    return {
        "active_streams": streams,
        "count": len(streams),
        "timestamp": time.time()
    }


@app.get("/detection-data/{client_id}")
async def get_detection_data(client_id: str):
    """Get detection data for a specific client"""
    if not connection_manager:
        raise HTTPException(status_code=503, detail="Connection manager not initialized")
        
    client = connection_manager.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if not client.processed_track:
        return {"client_id": client_id, "data": None, "message": "No detection available"}
    
    detection_data = client.processed_track.get_detection_data()
    return {
        "client_id": client_id,
        "data": detection_data,
        "timestamp": time.time()
    }


@app.get("/available-videos")
async def get_available_videos():
    """List available video files in the upload folder"""
    upload_folder = Path(config.UPLOAD_FOLDER)
    
    if not upload_folder.exists():
        return {"videos": [], "message": "Upload folder not found"}
    
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv']
    videos = []
    
    for video_file in upload_folder.iterdir():
        if video_file.is_file() and video_file.suffix.lower() in video_extensions:
            videos.append({
                "filename": video_file.name,
                "path": str(video_file),
                "size_mb": round(video_file.stat().st_size / (1024 * 1024), 2)
            })
    
    return {
        "videos": videos,
        "count": len(videos),
        "upload_folder": str(upload_folder.absolute()),
        "default_video": config.DEFAULT_VIDEO_FILE
    }


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@app.websocket("/ws/detection")
async def websocket_detection_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time detection data"""
    if not connection_manager:
        await websocket.close(code=1003, reason="Service unavailable")
        return
        
    await connection_manager.add_websocket(websocket)
    
    try:
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected successfully",
            "timestamp": time.time()
        })
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": time.time()
                })
            
            elif message_type == "subscribe":
                client_id = data.get("client_id")
                await websocket.send_json({
                    "type": "subscribed",
                    "client_id": client_id,
                    "timestamp": time.time()
                })
            
            elif message_type == "get_status":
                await websocket.send_json({
                    "type": "status",
                    "active_clients": len(connection_manager.clients),
                    "detector_loaded": detector is not None and detector.model is not None,
                    "timestamp": time.time()
                })
                
    except WebSocketDisconnect:
        connection_manager.remove_websocket(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connection_manager.remove_websocket(websocket)


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "rtc_server:app",
        host=config.BACKEND_HOST,
        port=config.RTC_PORT,
        reload=True,
        log_level="info"
    )