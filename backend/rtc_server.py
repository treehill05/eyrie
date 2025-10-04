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
from aiortc.contrib.media import MediaPlayer, MediaRelay
from av import VideoFrame
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

from person_detector import PersonDetector

# Find and load .env file from project root
# Look for .env in current directory, parent directory, or root
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent

# Try to load .env from multiple locations
env_loaded = False
for env_path in [current_dir / '.env', root_dir / '.env', Path('.env')]:
    if env_path.exists():
        load_dotenv(env_path)
        env_loaded = True
        print(f"Loaded .env from: {env_path}")
        break

if not env_loaded:
    print("Warning: No .env file found. Using default values.")
    print(f"Searched in: {current_dir}, {root_dir}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

# Get TURN/STUN configuration from environment variables
STUN_URL = os.getenv("STUN_URL", "stun:stun.cloudflare.com:3478")
TURN_URLS_STR = os.getenv("TURN_URLS", "")
TURN_USERNAME = os.getenv("TURN_USERNAME", "")
TURN_CREDENTIAL = os.getenv("TURN_CREDENTIAL", "")

# Parse TURN URLs (comma-separated)
if TURN_URLS_STR:
    TURN_URLS = [url.strip() for url in TURN_URLS_STR.split(",") if url.strip()]
else:
    TURN_URLS = [
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turn:turn.cloudflare.com:80?transport=tcp",
        "turns:turn.cloudflare.com:443?transport=tcp"
    ]
    logger.warning("TURN_URLS not in .env, using default Cloudflare TURN servers")

# Validate TURN credentials
if not TURN_USERNAME or not TURN_CREDENTIAL:
    logger.warning("TURN credentials not found in environment variables.")
    logger.warning("WebRTC may not work behind NAT.")
    logger.warning(f"Please create .env file in {root_dir} with TURN_USERNAME and TURN_CREDENTIAL")
else:
    logger.info(f"TURN server configured successfully")
    logger.info(f"Username: {TURN_USERNAME[:20]}...")

# RTCConfiguration with Cloudflare TURN servers from env
rtc_configuration = RTCConfiguration(
    iceServers=[
        RTCIceServer(urls=[STUN_URL]),
        RTCIceServer(
            urls=TURN_URLS,
            username=TURN_USERNAME,
            credential=TURN_CREDENTIAL
        )
    ]
)

logger.info(f"WebRTC configured with STUN: {STUN_URL}")
logger.info(f"WebRTC configured with {len(TURN_URLS)} TURN endpoints")

# ============================================================================
# Global State
# ============================================================================

detector: Optional[PersonDetector] = None
connection_manager = None


# ============================================================================
# Lifespan Event Handler
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    global detector, connection_manager
    
    # Startup
    logger.info("Starting up WebRTC backend...")
    try:
        # Initialize person detector
        model_path = os.getenv("MODEL_PATH", "yolov8n.pt")
        detector = PersonDetector(model_path, conf_threshold=0.5)
        logger.info("Person detector initialized successfully")
        
        # Initialize connection manager
        connection_manager = ConnectionManager()
        
        # Start detection data broadcast task
        broadcast_task = asyncio.create_task(detection_broadcast_loop())
        logger.info("Detection broadcast loop started")
        
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        detector = None
    
    yield
    
    # Shutdown
    logger.info("Shutting down WebRTC backend...")
    
    # Cancel broadcast task
    if 'broadcast_task' in locals():
        broadcast_task.cancel()
        try:
            await broadcast_task
        except asyncio.CancelledError:
            pass
    
    # Close all client connections
    if connection_manager:
        client_ids = list(connection_manager.clients.keys())
        for client_id in client_ids:
            await connection_manager.remove_client(client_id)
    
    logger.info("Shutdown complete")


# Create FastAPI app with lifespan
app = FastAPI(
    title="WebRTC Person Detection Backend",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Data Models
# ============================================================================

class OfferRequest(BaseModel):
    sdp: str
    type: str
    client_id: str

class StreamStartRequest(BaseModel):
    client_id: str
    camera_id: int = 0

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

class CameraVideoTrack(VideoStreamTrack):
    """
    Video track that captures from camera and processes with person detection
    """
    def __init__(self, camera_id: int = 0):
        super().__init__()
        self.camera_id = camera_id
        self.cap = cv2.VideoCapture(camera_id)
        self.frame_count = 0
        
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open camera {camera_id}")
        
        # Set camera properties
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        logger.info(f"Camera {camera_id} initialized: {self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)}x{self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)}")
        
    async def recv(self):
        """Read frame from camera"""
        pts, time_base = await self.next_timestamp()
        
        ret, frame = self.cap.read()
        if not ret:
            logger.error("Failed to read frame from camera")
            # Return black frame on error
            frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        
        self.frame_count += 1
        
        # Convert to VideoFrame
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        
        return video_frame
    
    def stop(self):
        """Release camera"""
        if self.cap:
            self.cap.release()
            logger.info(f"Camera {self.camera_id} released")


class ProcessedVideoTrack(VideoStreamTrack):
    """
    Video track that processes incoming video with person detection
    """
    def __init__(self, track: MediaStreamTrack, detector: PersonDetector, client_id: str):
        super().__init__()
        self.track = track
        self.detector = detector
        self.client_id = client_id
        self.frame_count = 0
        self.last_detection_data = None
        
        logger.info(f"ProcessedVideoTrack created for client {client_id}")
        
    async def recv(self):
        """Process incoming frame and return annotated version"""
        try:
            # Receive frame
            frame = await self.track.recv()
            
            # Convert to numpy array
            img = frame.to_ndarray(format="bgr24")
            
            # Process with person detector
            annotated_img, detection_summary = self.detector.process_video_frame(img)
            
            # Store detection data
            self.frame_count += 1
            detection_summary['frame_number'] = self.frame_count
            detection_summary['client_id'] = self.client_id
            self.last_detection_data = detection_summary
            
            # Log periodically
            if self.frame_count % 30 == 0:
                logger.info(
                    f"[{self.client_id}] Frame {self.frame_count}: "
                    f"{detection_summary['total_persons']} persons detected, "
                    f"avg confidence: {detection_summary['average_confidence']:.2f}"
                )
            
            # Convert back to VideoFrame
            new_frame = VideoFrame.from_ndarray(annotated_img, format="bgr24")
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base
            
            return new_frame
            
        except Exception as e:
            logger.error(f"Error processing frame for {self.client_id}: {e}")
            # Return original frame on error
            return frame
    
    def get_detection_data(self) -> Optional[dict]:
        """Get latest detection data"""
        return self.last_detection_data


# ============================================================================
# Connection Management
# ============================================================================

@dataclass
class ClientConnection:
    """Stores client connection information"""
    client_id: str
    peer_connection: RTCPeerConnection
    camera_track: Optional[CameraVideoTrack] = None
    processed_track: Optional[ProcessedVideoTrack] = None
    websocket: Optional[WebSocket] = None
    created_at: float = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()


class ConnectionManager:
    """Manages all client connections and WebSockets"""
    
    def __init__(self):
        self.clients: Dict[str, ClientConnection] = {}
        self.websockets: Set[WebSocket] = set()
        self.media_relay = MediaRelay()
        
    def add_client(self, client_id: str, pc: RTCPeerConnection) -> ClientConnection:
        """Add new client connection"""
        client = ClientConnection(client_id=client_id, peer_connection=pc)
        self.clients[client_id] = client
        logger.info(f"Client added: {client_id}")
        return client
    
    def get_client(self, client_id: str) -> Optional[ClientConnection]:
        """Get client by ID"""
        return self.clients.get(client_id)
    
    async def remove_client(self, client_id: str):
        """Remove client and cleanup resources"""
        client = self.clients.pop(client_id, None)
        if client:
            # Stop camera track
            if client.camera_track:
                client.camera_track.stop()
            
            # Close peer connection
            await client.peer_connection.close()
            
            logger.info(f"Client removed: {client_id}")
    
    async def add_websocket(self, websocket: WebSocket):
        """Add WebSocket connection"""
        await websocket.accept()
        self.websockets.add(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.websockets)}")
    
    def remove_websocket(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.websockets.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.websockets)}")
    
    async def broadcast_detection_data(self, client_id: str, data: dict):
        """Broadcast detection data to all WebSocket clients"""
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
                logger.error(f"Error broadcasting to WebSocket: {e}")
                disconnected.add(ws)
        
        # Cleanup disconnected websockets
        for ws in disconnected:
            self.remove_websocket(ws)


# ============================================================================
# Global State
# ============================================================================

detector: Optional[PersonDetector] = None
connection_manager = None


# ============================================================================
# Background Tasks
# ============================================================================

async def detection_broadcast_loop():
    """Periodically broadcast detection data to all connected WebSockets"""
    while True:
        try:
            await asyncio.sleep(0.1)  # 10 times per second
            
            if not connection_manager:
                continue
            
            # Get detection data from all active clients
            for client_id, client in connection_manager.clients.items():
                if client.processed_track:
                    detection_data = client.processed_track.get_detection_data()
                    if detection_data:
                        await connection_manager.broadcast_detection_data(
                            client_id, 
                            detection_data
                        )
                        
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in detection broadcast loop: {e}")
            await asyncio.sleep(1.0)


# ============================================================================
# HTTP Endpoints
# ============================================================================

@app.get("/")
async def root():
    return {
        "message": "WebRTC Person Detection Backend",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "detector_loaded": detector is not None,
        "active_clients": len(connection_manager.clients),
        "active_websockets": len(connection_manager.websockets),
        "timestamp": time.time()
    }


@app.post("/offer")
async def handle_offer(offer_request: OfferRequest):
    """
    Handle WebRTC offer from client
    This starts the video pipeline: Camera -> Detection -> Frontend
    """
    try:
        client_id = offer_request.client_id
        logger.info(f"Received offer from client: {client_id}")
        
        if detector is None:
            raise HTTPException(status_code=503, detail="Detector not initialized")
        
        # Create peer connection
        pc = RTCPeerConnection(configuration=rtc_configuration)
        client = connection_manager.add_client(client_id, pc)
        
        # Setup peer connection event handlers
        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logger.info(f"[{client_id}] Connection state: {pc.connectionState}")
            if pc.connectionState in ["failed", "closed"]:
                await connection_manager.remove_client(client_id)
        
        @pc.on("iceconnectionstatechange")
        async def on_iceconnectionstatechange():
            logger.info(f"[{client_id}] ICE state: {pc.iceConnectionState}")
        
        # Create camera track
        try:
            camera_track = CameraVideoTrack(camera_id=0)
            client.camera_track = camera_track
        except Exception as e:
            logger.error(f"Failed to initialize camera: {e}")
            raise HTTPException(status_code=500, detail=f"Camera initialization failed: {e}")
        
        # Create processed track with detection
        relayed_track = connection_manager.media_relay.subscribe(camera_track)
        processed_track = ProcessedVideoTrack(relayed_track, detector, client_id)
        client.processed_track = processed_track
        
        # Add processed track to peer connection (send to frontend)
        pc.addTrack(processed_track)
        logger.info(f"[{client_id}] Added processed video track to peer connection")
        
        # Set remote description from offer
        await pc.setRemoteDescription(
            RTCSessionDescription(sdp=offer_request.sdp, type=offer_request.type)
        )
        
        # Create answer
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        logger.info(f"[{client_id}] Created answer and set local description")
        
        return {
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type,
            "client_id": client_id,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error handling offer: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/stop-stream")
async def stop_stream(client_id: str):
    """Stop streaming for a client"""
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
    """Get list of active streaming clients"""
    streams = []
    for client_id, client in connection_manager.clients.items():
        detection_data = None
        if client.processed_track:
            detection_data = client.processed_track.get_detection_data()
        
        streams.append({
            "client_id": client_id,
            "connected_at": client.created_at,
            "connection_state": client.peer_connection.connectionState,
            "has_camera": client.camera_track is not None,
            "latest_detection": detection_data
        })
    
    return {
        "active_streams": streams,
        "count": len(streams),
        "timestamp": time.time()
    }


@app.get("/detection-data/{client_id}")
async def get_detection_data(client_id: str):
    """Get latest detection data for a specific client"""
    client = connection_manager.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if not client.processed_track:
        return {"client_id": client_id, "data": None}
    
    detection_data = client.processed_track.get_detection_data()
    return {
        "client_id": client_id,
        "data": detection_data,
        "timestamp": time.time()
    }


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@app.websocket("/ws/detection")
async def websocket_detection_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time detection data streaming
    Clients connect here to receive continuous detection updates
    """
    await connection_manager.add_websocket(websocket)
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected successfully",
            "timestamp": time.time()
        })
        
        # Keep connection alive and handle client messages
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
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )