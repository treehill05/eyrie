#!/bin/bash
# Start RTC Server (Video File) on port 8001

echo "Starting RTC Server (Video File) on port 8001..."

# Kill existing process on port 8001
lsof -ti:8001 | xargs kill -9 2>/dev/null

# Start server
python3 -m uvicorn rtc_server:app --host 0.0.0.0 --port 8001 --reload
