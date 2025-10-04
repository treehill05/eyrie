#!/bin/bash
# Start Main Server (Camera) on port 8000

echo "Starting Main Server (Camera) on port 8000..."

# Kill existing process on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Start server
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
