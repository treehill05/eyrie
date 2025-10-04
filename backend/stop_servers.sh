#!/bin/bash

echo "=== Stopping All Servers ==="
echo ""

# Kill processes on port 8000
echo "Stopping Main Server (port 8000)..."
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "✓ Main server stopped" || echo "  No process on port 8000"

# Kill processes on port 8001
echo "Stopping RTC Server (port 8001)..."
lsof -ti:8001 | xargs kill -9 2>/dev/null && echo "✓ RTC server stopped" || echo "  No process on port 8001"

echo ""
echo "All servers stopped"
echo ""
