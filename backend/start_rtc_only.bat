@echo off
REM Start RTC Server (Video File) - Windows

echo Starting RTC Server (Video File) on port 8001...
echo.

REM Kill existing process on port 8001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do taskkill /F /PID %%a 2>nul

REM Start server
python -m uvicorn rtc_server:app --host 0.0.0.0 --port 8001 --reload
