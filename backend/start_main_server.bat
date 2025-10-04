@echo off
REM Start Main Server (Camera) - Windows

echo Starting Main Server (Camera) on port 8000...
echo.

REM Kill existing process on port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a 2>nul

REM Start server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
