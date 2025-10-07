Eyrie - Preventing Crowd Crush Before It Happens
Best Design at PennApps XXVI🏆
Show Image
Show Image
Show Image
Show Image
Show Image
Show Image
Show Image
Show Image
Show Image
Show Image
Show Image
A project built to monitor high-density gatherings in real-time, detect dangerous crowd formations, and predict deadly crowd crush events before they occur using AI-powered drones.
Overview
Eyrie automatically streams live video from drones, detects people using YOLOv8, calculates spatial density, and generates predictive alerts.
It helps authorities prevent crowd crush tragedies by providing critical minutes to respond before disaster strikes.
Show Image
Features

Multi-Source Streaming – WebRTC video from drones or cameras with real-time person detection overlays
YOLOv8 Detection – Uses pre-trained or custom models to detect and track individuals with bounding boxes
Spatial Analytics – Computes crowd density using Gaussian kernel algorithms with normalized coordinates
Predictive Alerts – Machine learning algorithms identify high-risk formations before crush events occur
Live Visualization – Interactive overlays with tracking points, risk heatmaps, and time-series analytics graphs
Scalable Architecture – Supports multiple simultaneous drone feeds with shared video processing

Show Image
Tech Stack

TypeScript + React + Next.js 15 with d3.js for heatmap visualization
Python FastAPI for APIs & aiortc for WebRTC streaming
YOLOv8 (Ultralytics) for real-time person detection
OpenCV for video processing & PyTorch for ML inference

Usage
cd frontend
pnpm install
pnpm dev
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp config.env.example .env
python start_servers.py
API Endpoints
Main API (Port 8000)

POST /start_camera
POST /stop_camera
GET /video_feed
POST /detect_from_base64
GET /health
WebSocket /ws

RTC Server (Port 8001)

GET /
GET /health
POST /offer
GET /active-streams
GET /detection-data/:client_id
GET /available-videos
POST /stop-stream
WebSocket /ws/detection

Acknowledgements
A special thanks to PennApps 2025.
License
Copyright (c) 2025 Eyrie TeamRetryClaude can make mistakes. Please double-check responses.
