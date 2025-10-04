#!/usr/bin/env python3
"""
Cross-platform script to stop all servers
Works on Windows, macOS, and Linux
"""

import subprocess
import platform
import signal
import os
import sys

def kill_process_on_port(port):
    """Kill any process using the specified port"""
    system = platform.system()
    killed = False
    
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
                        result = subprocess.run(
                            f'taskkill /F /PID {pid}',
                            shell=True,
                            capture_output=True
                        )
                        if result.returncode == 0:
                            killed = True
        else:
            # Unix-like (macOS, Linux): use lsof
            cmd = f'lsof -ti:{port}'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    try:
                        os.kill(int(pid), signal.SIGKILL)
                        killed = True
                    except:
                        pass
    except Exception as e:
        print(f"  ⚠️  Error on port {port}: {e}")
        return False
    
    return killed

def main():
    print("=" * 60)
    print("🛑 Stopping All Servers")
    print("=" * 60)
    print()
    
    # Stop Main Server (port 8000)
    print("Stopping Main Server (port 8000)...")
    if kill_process_on_port(8000):
        print("  ✓ Main server stopped")
    else:
        print("  • No process on port 8000")
    
    # Stop RTC Server (port 8001)
    print("Stopping RTC Server (port 8001)...")
    if kill_process_on_port(8001):
        print("  ✓ RTC server stopped")
    else:
        print("  • No process on port 8001")
    
    print()
    print("All servers stopped")
    print()

if __name__ == "__main__":
    main()
