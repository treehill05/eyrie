#!/usr/bin/env python3
"""
Cross-platform script to start both servers
Works on Windows, macOS, and Linux
"""

import subprocess
import sys
import time
import platform
import signal
import os

def kill_process_on_port(port):
    """Kill any process using the specified port"""
    system = platform.system()
    
    try:
        if system == "Windows":
            # Windows: use netstat and taskkill
            cmd = f'netstat -ano | findstr :{port}'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            for line in result.stdout.split('\n'):
                if f':{port}' in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                        print(f"  ✓ Killed process {pid} on port {port}")
        else:
            # Unix-like (macOS, Linux): use lsof
            cmd = f'lsof -ti:{port}'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    try:
                        os.kill(int(pid), signal.SIGKILL)
                        print(f"  ✓ Killed process {pid} on port {port}")
                    except:
                        pass
    except Exception as e:
        print(f"  ⚠️  Could not kill process on port {port}: {e}")

def start_server(name, module, port, log_file=None):
    """Start a uvicorn server"""
    cmd = [
        sys.executable, "-m", "uvicorn",
        f"{module}:app",
        "--host", "0.0.0.0",
        "--port", str(port),
        "--reload"
    ]
    
    if log_file:
        with open(log_file, 'w') as f:
            process = subprocess.Popen(
                cmd,
                stdout=f,
                stderr=subprocess.STDOUT,
                start_new_session=True
            )
    else:
        process = subprocess.Popen(
            cmd,
            start_new_session=True
        )
    
    print(f"  ✓ {name} started (PID: {process.pid})")
    return process

def main():
    print("=" * 60)
    print("🚀 Starting Both Servers")
    print("=" * 60)
    print()
    
    # Clean ports
    print("🧹 Cleaning ports...")
    kill_process_on_port(8000)
    kill_process_on_port(8001)
    print()
    
    time.sleep(2)
    
    # Start Main Server (Camera) on port 8000
    print("📷 Starting Main Server (Camera) on port 8000...")
    try:
        main_server = start_server(
            "Main Server",
            "main",
            8000,
            "main_server.log"
        )
    except Exception as e:
        print(f"  ✗ Failed to start Main Server: {e}")
        return 1
    
    time.sleep(3)
    
    # Start RTC Server (Video File) on port 8001
    print("🎥 Starting RTC Server (Video File) on port 8001...")
    try:
        rtc_server = start_server(
            "RTC Server",
            "rtc_server",
            8001,
            "rtc_server.log"
        )
    except Exception as e:
        print(f"  ✗ Failed to start RTC Server: {e}")
        return 1
    
    time.sleep(3)
    
    # Check servers
    print()
    print("=" * 60)
    print("✅ Servers Status")
    print("=" * 60)
    
    try:
        import requests
        
        # Check Main Server
        try:
            response = requests.get("http://localhost:8000/health", timeout=2)
            if response.ok:
                print("  ✓ Main Server (port 8000): RUNNING")
            else:
                print("  ✗ Main Server (port 8000): NOT RESPONDING")
        except:
            print("  ✗ Main Server (port 8000): FAILED")
            print("    Check main_server.log for errors")
        
        # Check RTC Server
        try:
            response = requests.get("http://localhost:8001/health", timeout=2)
            if response.ok:
                print("  ✓ RTC Server (port 8001): RUNNING")
            else:
                print("  ✗ RTC Server (port 8001): NOT RESPONDING")
        except:
            print("  ✗ RTC Server (port 8001): FAILED")
            print("    Check rtc_server.log for errors")
    except ImportError:
        print("  ⚠️  Install 'requests' to check server status")
        print("    Servers started, but status unknown")
    
    print()
    print("=" * 60)
    print("🌐 Access URLs")
    print("=" * 60)
    print("  📷 Camera API: http://localhost:8000")
    print("  🎥 RTC Video:  http://localhost:8001")
    print("  🌐 Frontend:   http://localhost:3000")
    print()
    print("  📚 API Docs:   http://localhost:8000/docs")
    print("               http://localhost:8001/docs")
    print()
    print("=" * 60)
    print()
    print("To stop servers:")
    if platform.system() == "Windows":
        print("  • Run: python stop_servers.py")
        print("  • Or:  stop_servers.bat")
    else:
        print("  • Run: python stop_servers.py")
        print("  • Or:  ./stop_servers.sh")
    print()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
