#!/bin/bash

echo "=== Starting Both Servers ==="
echo ""

# Kill any existing processes on these ports
echo "Cleaning ports..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null
sleep 2

# Start main.py server (Camera) on port 8000
echo "Starting Main Server (Camera) on port 8000..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > main_server.log 2>&1 &
MAIN_PID=$!
echo "✓ Main server started (PID: $MAIN_PID)"

sleep 3

# Start rtc_server.py (Video File) on port 8001  
echo "Starting RTC Server (Video File) on port 8001..."
python3 -m uvicorn rtc_server:app --host 0.0.0.0 --port 8001 > rtc_server.log 2>&1 &
RTC_PID=$!
echo "✓ RTC server started (PID: $RTC_PID)"

sleep 3

echo ""
echo "=== Server Status ==="
echo ""

# Check main server
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ Main Server (port 8000): RUNNING"
else
    echo "✗ Main Server (port 8000): FAILED"
    echo "  Check main_server.log for errors"
fi

# Check RTC server
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✓ RTC Server (port 8001): RUNNING"
else
    echo "✗ RTC Server (port 8001): FAILED"
    echo "  Check rtc_server.log for errors"
fi

echo ""
echo "=== Access URLs ==="
echo "📷 Camera API: http://localhost:8000"
echo "🎥 RTC Video:  http://localhost:8001"
echo "🌐 Frontend:   http://localhost:3000"
echo ""
echo "To stop servers: ./stop_servers.sh"
echo ""
