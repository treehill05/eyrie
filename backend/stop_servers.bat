@echo off
REM Stop All Servers (Windows)

echo === Stopping All Servers ===
echo.

echo Stopping Main Server (port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /F /PID %%a 2>nul && echo   Main server stopped
)

echo Stopping RTC Server (port 8001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    taskkill /F /PID %%a 2>nul && echo   RTC server stopped
)

echo.
echo All servers stopped
echo.
pause
