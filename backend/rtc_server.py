"""
WebRTC Backend Server for Person Detection
Receives video from file -> Processes with YOLO -> Streams to frontend
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

# Find and load .env file from project root
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent

env_loaded = False
for env_path in [current_dir / '.env', root_dir / '.env', Path('.env')]:
    if env_path.exists():
        load_dotenv(env_path)
        env_loaded = True
        print(f"Loaded .env from: {env_path}")
        break

if not env_loaded:
    print("Warning: No .env file found. Using default values.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

# Default TURN/STUN configuration from environment (can be overridden by frontend)
STUN_URL = os.getenv("STUN_URL", "stun:stun.cloudflare.com:3478")
TURN_URLS_STR = os.getenv("TURN_URLS", "")
TURN_USERNAME = os.getenv("TURN_USERNAME", "")
TURN_CREDENTIAL = os.getenv("TURN_CREDENTIAL", "")

if TURN_URLS_STR:
    TURN_URLS = [url.strip() for url in TURN_URLS_STR.split(",") if url.strip()]
else:
    TURN_URLS = [
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turn:turn.cloudflare.com:80?transport=tcp",
        "turns:turn.cloudflare.com:443?transport=tcp"
    ]

# Initialize default RTCConfiguration
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

logger.info("Backend initialized with default ICE configuration")
logger.info(f"Default STUN: {STUN_URL}")
logger.info(f"Default TURN endpoints: {len(TURN_URLS)}")

# ============================================================================
# Data Models
# ============================================================================

class OfferRequest(BaseModel):
    sdp: str
    type: str
    client_id: str

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
    
    def __init__(self, video_path: str = "ForBiggerEscapes.mp4"):
        super().__init__()
        self.video_path = video_path
        
        # Try to find the video file
        if not os.path.exists(video_path):
            # Try in current directory
            alt_path = os.path.join(os.path.dirname(__file__), video_path)
            if os.path.exists(alt_path):
                self.video_path = alt_path
            else:
                raise FileNotFoundError(f"Video file not found: {video_path}")
        
        self.cap = cv2.VideoCapture(self.video_path)
        self.frame_count = 0
        
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open video file: {self.video_path}")
        
        # Get video properties
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        logger.info(f"Video file initialized: {self.video_path}")
        logger.info(f"Video properties: {self.width}x{self.height} @ {self.fps}fps, {self.total_frames} frames")
        
    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        ret, frame = self.cap.read()
        
        # Loop the video when it ends
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
            
            # Create new video frame with annotations
            new_frame = VideoFrame.from_ndarray(annotated_img, format="bgr24")
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base
            
            return new_frame
            
        except Exception as e:
            logger.error(f"Error processing frame for {self.client_id}: {e}")
            return frame
    
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
connection_manager = None


# ============================================================================
# Background Tasks
# ============================================================================

async def detection_broadcast_loop():
    """Periodically broadcast detection data to all connected WebSockets"""
    while True:
        try:
            await asyncio.sleep(0.1)
            
            if not connection_manager:
                continue
            
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
# Lifespan Event Handler
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector, connection_manager
    
    logger.info("Starting up WebRTC backend...")
    try:
        model_path = os.getenv("MODEL_PATH", "yolov8n.pt")
        detector = PersonDetector(model_path, conf_threshold=0.5)
        logger.info("Person detector initialized successfully")
        
        connection_manager = ConnectionManager()
        
        broadcast_task = asyncio.create_task(detection_broadcast_loop())
        logger.info("Detection broadcast loop started")
        
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        detector = None
    
    yield
    
    logger.info("Shutting down WebRTC backend...")
    
    if 'broadcast_task' in locals():
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


app = FastAPI(title="WebRTC Person Detection Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
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
        "video_source": "ForBiggerEscapes.mp4"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "detector_loaded": detector is not None,
        "active_clients": len(connection_manager.clients) if connection_manager else 0,
        "active_websockets": len(connection_manager.websockets) if connection_manager else 0,
        "timestamp": time.time()
    }


@app.post("/ice-servers")
async def receive_ice_servers(ice_config: dict):
    """
    Receive ICE server configuration from frontend
    """
    try:
        global rtc_configuration
        
        ice_servers = []
        for server in ice_config.get("iceServers", []):
            urls = server.get("urls", [])
            if isinstance(urls, str):
                urls = [urls]
            
            username = server.get("username")
            credential = server.get("credential")
            
            ice_server = RTCIceServer(
                urls=urls,
                username=username,
                credential=credential
            )
            ice_servers.append(ice_server)
        
        rtc_configuration = RTCConfiguration(iceServers=ice_servers)
        
        logger.info(f"Received ICE servers configuration from frontend")
        logger.info(f"ICE servers count: {len(ice_servers)}")
        
        return {
            "status": "success",
            "message": "ICE servers configuration received and applied",
            "servers_count": len(ice_servers)
        }
        
    except Exception as e:
        logger.error(f"Error processing ICE servers: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/offer")
async def handle_offer(offer_request: OfferRequest):
    """Handle WebRTC offer from client"""
    try:
        client_id = offer_request.client_id
        logger.info(f"Received offer from client: {client_id}")
        
        if detector is None:
            raise HTTPException(status_code=503, detail="Detector not initialized")
        
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
        
        # Initialize video file track
        try:
            video_track = VideoFileTrack("ForBiggerEscapes.mp4")
            client.video_track = video_track
        except Exception as e:
            logger.error(f"Failed to initialize video file: {e}")
            raise HTTPException(status_code=500, detail=f"Video file initialization failed: {e}")
        
        # Create relay and processed track
        relayed_track = connection_manager.media_relay.subscribe(video_track)
        processed_track = ProcessedVideoTrack(relayed_track, detector, client_id)
        client.processed_track = processed_track
        
        pc.addTrack(processed_track)
        logger.info(f"[{client_id}] Added processed video track")
        
        # Handle the offer
        await pc.setRemoteDescription(
            RTCSessionDescription(sdp=offer_request.sdp, type=offer_request.type)
        )
        
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        logger.info(f"[{client_id}] Created answer")
        
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
            "latest_detection": detection_data
        })
    
    return {
        "active_streams": streams,
        "count": len(streams),
        "timestamp": time.time()
    }


@app.get("/detection-data/{client_id}")
async def get_detection_data(client_id: str):
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