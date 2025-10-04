# test_realtimekit_backend.py
import asyncio
import aiohttp
import os
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack, RTCConfiguration, RTCIceServer
from av import VideoFrame
import numpy as np
import cv2

# Your Cloudflare credentials
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

class TestVideoTrack(VideoStreamTrack):
    """
    Generate test video to send to the meeting
    """
    def __init__(self):
        super().__init__()
        self.counter = 0
        
    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        # Create a test frame with counter
        self.counter += 1
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Draw text
        cv2.putText(frame, f"Backend Test Frame: {self.counter}", 
                   (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        
        return video_frame

async def create_meeting():
    """Create a RealtimeKit meeting via API"""
    async with aiohttp.ClientSession() as session:
        # Create meeting
        async with session.post(
            f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/realtime/meetings",
            headers={
                "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"name": "Backend Test Meeting"}
        ) as resp:
            meeting_data = await resp.json()
            meeting_id = meeting_data["result"]["id"]
            print(f"✅ Created meeting: {meeting_id}")
        
        # Add participant
        async with session.post(
            f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/realtime/meetings/{meeting_id}/participants",
            headers={
                "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
                "Content-Type": "application/json"
            },
            json={
                "name": "Python Backend Bot",
                "preset": "group_call_participant"
            }
        ) as resp:
            participant_data = await resp.json()
            auth_token = participant_data["result"]["authToken"]
            print(f"✅ Added participant with auth token")
            
    return meeting_id, auth_token

async def join_meeting(meeting_id, auth_token):
    """Join the meeting as a WebRTC peer from Python"""
    
    # Create WebRTC peer connection
    # RealtimeKit uses standard STUN servers
    config = RTCConfiguration(
        iceServers=[RTCIceServer(urls=["stun:stun.cloudflare.com:3478"])]
    )
    pc = RTCPeerConnection(configuration=config)
    
    # Add video track (Python sends video to meeting)
    video_track = TestVideoTrack()
    pc.addTrack(video_track)
    print("📤 Added video track")
    
    # Receive tracks from other participants
    @pc.on("track")
    async def on_track(track):
        print(f"📥 Receiving {track.kind} track from meeting")
        
        if track.kind == "video":
            frame_count = 0
            while True:
                try:
                    frame = await track.recv()
                    frame_count += 1
                    
                    if frame_count % 30 == 0:  # Log every 30 frames
                        print(f"📹 Received frame {frame_count}")
                        
                except Exception as e:
                    print(f"Track ended: {e}")
                    break
    
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"🔌 Connection state: {pc.connectionState}")
    
    # Connect to RealtimeKit signaling
    async with aiohttp.ClientSession() as session:
        # Get WebSocket URL from RealtimeKit
        ws_url = f"wss://realtime.cloudflare.com/v1/connect"
        
        async with session.ws_connect(
            ws_url,
            headers={"Authorization": f"Bearer {auth_token}"}
        ) as ws:
            print("🔗 Connected to RealtimeKit signaling")
            
            # Create and send offer
            offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            
            await ws.send_json({
                "type": "offer",
                "sdp": pc.localDescription.sdp
            })
            print("📨 Sent offer")
            
            # Handle signaling messages
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = msg.json()
                    
                    if data.get("type") == "answer":
                        answer = RTCSessionDescription(
                            sdp=data["sdp"],
                            type="answer"
                        )
                        await pc.setRemoteDescription(answer)
                        print("✅ Received answer, connection established")
                        
                    elif data.get("type") == "ice-candidate":
                        # Handle ICE candidates if needed
                        pass
            
            # Keep connection alive
            await asyncio.sleep(60)  # Stay in meeting for 60 seconds
    
    await pc.close()

async def main():
    print("🚀 Starting backend WebRTC test...")
    
    # Create meeting
    meeting_id, auth_token = await create_meeting()
    
    # Join as WebRTC peer
    await join_meeting(meeting_id, auth_token)
    
    print("✅ Test complete")

if __name__ == "__main__":
    asyncio.run(main())