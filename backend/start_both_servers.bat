@echo off
REM Start Both Servers (Windows)

echo === Starting Both Servers ===
echo.

REM Kill any existing processes on these ports
echo Cleaning ports...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul

REM Start Main Server (Camera) on port 8000
echo Starting Main Server (Camera) on port 8000...
start "Main Server" cmd /k "python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

REM Start RTC Server (Video File) on port 8001
echo Starting RTC Server (Video File) on port 8001...
start "RTC Server" cmd /k "python -m uvicorn rtc_server:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 3 /nobreak >nul

echo.
echo === Servers Started ===
echo.
echo Camera API: http://localhost:8000
echo RTC Video:  http://localhost:8001
echo Frontend:   http://localhost:3000
echo.
echo To stop servers: close the terminal windows or run stop_servers.bat
echo.
pause
