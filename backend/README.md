# 🎥 RTC Server - Person Detection Video Streaming

WebRTC-based server for real-time video streaming with person detection using YOLOv8.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp config.env.example .env
# Edit .env with your settings
```

### 3. Start Server
```bash
python start_rtc_server.py
```

### 4. Open Test Client
Open `test_rtc_client.html` in your browser

## ⚙️ Centralized Configuration

All URLs and settings are managed through environment variables. **Change in one place, updates everywhere!**

### Configuration File (`.env`)

```env
# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000

# Video
DEFAULT_VIDEO_SOURCE=file
DEFAULT_VIDEO_FILE=your_video.mp4
UPLOAD_FOLDER=upload

# Model
MODEL_PATH=yolov8n.pt
DETECTION_CONFIDENCE=0.5
```

### How It Works

```
.env → config.py → All Files
```

1. Edit `.env`
2. Backend loads automatically
3. Frontend fetches from `/config` endpoint
4. Everything synchronized!

## 📡 API Endpoints

### **POST `/offer`**
Start WebRTC connection for video streaming

**Request:**
```json
{
  "sdp": "v=0...",
  "type": "offer",
  "client_id": "client-123",
  "source": "file",
  "video_path": "upload/video.mp4",
  "loop_video": true
}
```

**Response:**
```json
{
  "sdp": "v=0...",
  "type": "answer",
  "client_id": "client-123",
  "status": "success"
}
```

### **GET `/config`**
Get client configuration

**Response:**
```json
{
  "backend_url": "http://localhost:8000",
  "ws_url": "ws://localhost:8000",
  "default_video_source": "file",
  "default_loop_video": true
}
```

### **GET `/available-videos`**
List available video files

**Response:**
```json
{
  "videos": [
    {
      "filename": "video.mp4",
      "path": "upload/video.mp4",
      "size_mb": 25.5
    }
  ],
  "count": 1
}
```

### **WS `/ws/detection`**
WebSocket for real-time detection data

**Message:**
```json
{
  "type": "detection_update",
  "client_id": "client-123",
  "data": {
    "total_persons": 5,
    "average_confidence": 0.87,
    "positions": [[x1, y1, x2, y2, conf], ...],
    "frame_number": 123
  }
}
```

### **GET `/health`**
Server health check

### **GET `/active-streams`**
List active streams

### **POST `/stop-stream`**
Stop a specific stream

## 🎯 Features

✅ **WebRTC Video Streaming**  
✅ **Real-time Person Detection (YOLOv8)**  
✅ **File or Camera Source**  
✅ **Automatic Video Looping**  
✅ **Multiple Simultaneous Clients**  
✅ **Centralized Configuration**  
✅ **WebSocket Detection Data**  
✅ **Bounding Box Visualization**  

## 🔧 Configuration Examples

### Example 1: Change Port
```env
BACKEND_PORT=8080
```
Result: Everything updates to port 8080

### Example 2: Use Camera
```env
DEFAULT_VIDEO_SOURCE=camera
DEFAULT_CAMERA_ID=0
```
Result: Server uses webcam by default

### Example 3: New Default Video
```env
DEFAULT_VIDEO_FILE=marathon_4k.mp4
```
Result: New video used automatically

## 🏗️ Project Structure

```
backend/
├── config.py              # Centralized configuration
├── rtc_server.py         # Main WebRTC server
├── person_detector.py    # YOLO detection
├── start_rtc_server.py   # Startup script
├── test_rtc_client.html  # HTML test client
├── .env                  # Your configuration
├── config.env.example    # Configuration template
└── upload/               # Video files folder
```

## 🌐 How URLs Work

### Before (Hardcoded):
```python
# In multiple files
url = "http://localhost:8000"  # Hardcoded
```

### After (Centralized):
```python
# In all files
import config
url = config.BACKEND_URL  # From .env
```

**Result:** Change port in `.env`, everything updates!

## 🔄 Video Streaming Flow

```
1. Client connects → POST /offer
2. Backend starts → File/Camera capture
3. Each frame → YOLO processing
4. Annotated video → WebRTC stream
5. Detection data → WebSocket
6. Client receives → Video + Data
```

## 📊 Detection Data

Real-time data sent via WebSocket:

- **total_persons**: Number of people detected
- **average_confidence**: Detection confidence (0-1)
- **positions**: Bounding box coordinates
- **frame_number**: Current frame number
- **timestamp**: Detection timestamp

## 🎨 Frontend Integration

```javascript
// Fetch configuration
const response = await fetch('http://localhost:8000/config');
const config = await response.json();

// Use dynamic URLs
const BACKEND_URL = config.backend_url;
const WS_URL = config.ws_url;

// Connect WebRTC
const pc = new RTCPeerConnection();
const offer = await pc.createOffer();

await fetch(`${BACKEND_URL}/offer`, {
  method: 'POST',
  body: JSON.stringify({
    sdp: offer.sdp,
    type: offer.type,
    client_id: 'client-123',
    source: 'file',
    video_path: 'upload/video.mp4'
  })
});

// Connect WebSocket
const ws = new WebSocket(`${WS_URL}/ws/detection`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('People detected:', data.data.total_persons);
};
```

## 🔒 Security

### Development
```env
# CORS allows all origins
CORS_ORIGINS=*
```

### Production
```python
# In config.py, modify:
CORS_ORIGINS = [
    config.FRONTEND_URL,  # Only your domain
]
```

## 🐛 Troubleshooting

### "Address already in use"
```bash
# Kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or change port in .env
BACKEND_PORT=8001
```

### "No video files found"
```bash
# Add video to upload folder
cp your_video.mp4 upload/
```

### "Model not found"
Server will download yolov8n.pt automatically on first run.

### "WebRTC doesn't connect"
1. Check server is running: `curl http://localhost:8000/health`
2. Check browser console (F12)
3. Verify firewall settings

## 📚 Environment Variables Reference

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `BACKEND_HOST` | Server host | `0.0.0.0` | `localhost` |
| `BACKEND_PORT` | Server port | `8000` | `8080` |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` | `https://mysite.com` |
| `DEFAULT_VIDEO_SOURCE` | Default source | `file` | `camera` |
| `DEFAULT_CAMERA_ID` | Camera ID | `0` | `1` |
| `UPLOAD_FOLDER` | Video folder | `upload` | `videos` |
| `DEFAULT_VIDEO_FILE` | Default video | `video.mp4` | `marathon.mp4` |
| `DEFAULT_LOOP_VIDEO` | Auto loop | `true` | `false` |
| `MODEL_PATH` | YOLO model path | `yolov8n.pt` | `yolov8x.pt` |
| `DETECTION_CONFIDENCE` | Detection threshold | `0.5` | `0.7` |
| `STUN_URL` | STUN server | `stun:stun.cloudflare.com:3478` | Custom |
| `TURN_URLS` | TURN servers | Multiple | Custom |

## 🎓 Usage Examples

### Example 1: Local Development
```bash
# 1. Start server
python start_rtc_server.py

# 2. Open browser
# Open test_rtc_client.html

# 3. Click "Start Stream"
# Video with detection starts!
```

### Example 2: Custom Video
```bash
# 1. Add video
cp my_video.mp4 upload/

# 2. Update .env
DEFAULT_VIDEO_FILE=my_video.mp4

# 3. Restart server
python start_rtc_server.py
```

### Example 3: Use Camera
```bash
# 1. Update .env
DEFAULT_VIDEO_SOURCE=camera
DEFAULT_CAMERA_ID=0

# 2. Restart server
# 3. Open client - camera is selected automatically
```

## 📖 API Documentation

Once server is running, visit:
- Interactive docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - feel free to use in your projects

## 🔗 Related Links

- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [aiortc Documentation](https://aiortc.readthedocs.io/)

---

**Built with ❤️ using WebRTC, YOLOv8, and FastAPI**

**Change once, update everywhere! 🚀**
