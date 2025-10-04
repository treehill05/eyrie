#!/usr/bin/env python3
"""
Test script for WebRTC Person Detection Backend
Tests camera, detector, and WebRTC functionality
"""

import asyncio
import sys
import os
import json
from typing import Optional

try:
    import cv2
    import numpy as np
    from person_detector import PersonDetector
    import aiohttp
    import websockets
except ImportError as e:
    print(f"Error: Missing required dependency: {e}")
    print("Please run: pip install -r requirements.txt")
    sys.exit(1)


class BackendTester:
    def __init__(self, backend_url: str = "http://localhost:8000"):
        self.backend_url = backend_url
        self.ws_url = backend_url.replace("http", "ws") + "/ws/detection"
        self.results = {}
        
    def print_test(self, name: str, status: str, message: str = ""):
        """Print test result"""
        symbols = {"PASS": "✓", "FAIL": "✗", "SKIP": "-"}
        colors = {"PASS": "\033[92m", "FAIL": "\033[91m", "SKIP": "\033[93m"}
        reset = "\033[0m"
        
        symbol = symbols.get(status, "?")
        color = colors.get(status, "")
        
        print(f"{color}[{symbol}] {name}{reset}")
        if message:
            print(f"    {message}")
        
        self.results[name] = status
    
    def test_imports(self):
        """Test 1: Check if all required modules can be imported"""
        print("\n" + "="*60)
        print("TEST 1: Checking Required Imports")
        print("="*60)
        
        required_modules = [
            ("cv2", "OpenCV"),
            ("numpy", "NumPy"),
            ("aiortc", "aiortc"),
            ("av", "PyAV"),
            ("fastapi", "FastAPI"),
            ("websockets", "websockets"),
            ("ultralytics", "Ultralytics YOLO")
        ]
        
        all_passed = True
        for module_name, display_name in required_modules:
            try:
                __import__(module_name)
                self.print_test(f"Import {display_name}", "PASS")
            except ImportError:
                self.print_test(f"Import {display_name}", "FAIL", 
                              f"Module not found: {module_name}")
                all_passed = False
        
        return all_passed
    
    def test_camera(self):
        """Test 2: Check camera availability"""
        print("\n" + "="*60)
        print("TEST 2: Checking Camera")
        print("="*60)
        
        try:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                self.print_test("Camera Access", "FAIL", "Could not open camera 0")
                return False
            
            ret, frame = cap.read()
            if not ret or frame is None:
                self.print_test("Camera Read", "FAIL", "Could not read frame")
                cap.release()
                return False
            
            height, width = frame.shape[:2]
            self.print_test("Camera Access", "PASS", 
                          f"Camera opened: {width}x{height}")
            
            # Test a few frames
            for i in range(5):
                ret, frame = cap.read()
                if not ret:
                    self.print_test("Camera Stability", "FAIL", 
                                  f"Failed at frame {i+1}")
                    cap.release()
                    return False
            
            self.print_test("Camera Stability", "PASS", "Read 5 frames successfully")
            cap.release()
            return True
            
        except Exception as e:
            self.print_test("Camera Test", "FAIL", str(e))
            return False
    
    def test_detector(self):
        """Test 3: Check person detector"""
        print("\n" + "="*60)
        print("TEST 3: Checking Person Detector")
        print("="*60)
        
        try:
            # Initialize detector
            detector = PersonDetector("yolov8n.pt", conf_threshold=0.5)
            self.print_test("Detector Initialization", "PASS")
            
            # Create test image
            test_image = np.zeros((480, 640, 3), dtype=np.uint8)
            
            # Run detection
            positions = detector.detect_persons(test_image)
            self.print_test("Detection Run", "PASS", 
                          f"Detected {len(positions)} persons in test image")
            
            # Test detection summary
            summary = detector.get_detection_summary(positions)
            self.print_test("Detection Summary", "PASS", 
                          f"Summary generated with {summary['total_persons']} persons")
            
            # Test video frame processing
            annotated_frame, detection_data = detector.process_video_frame(test_image)
            if annotated_frame is not None and detection_data is not None:
                self.print_test("Video Frame Processing", "PASS")
            else:
                self.print_test("Video Frame Processing", "FAIL")
                return False
            
            return True
            
        except Exception as e:
            self.print_test("Detector Test", "FAIL", str(e))
            return False
    
    async def test_backend_api(self):
        """Test 4: Check backend API endpoints"""
        print("\n" + "="*60)
        print("TEST 4: Checking Backend API")
        print("="*60)
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test root endpoint
                try:
                    async with session.get(f"{self.backend_url}/") as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            self.print_test("Root Endpoint", "PASS", 
                                          f"Status: {data.get('status')}")
                        else:
                            self.print_test("Root Endpoint", "FAIL", 
                                          f"Status code: {resp.status}")
                            return False
                except aiohttp.ClientError:
                    self.print_test("Root Endpoint", "FAIL", 
                                  "Backend server not running")
                    return False
                
                # Test health endpoint
                async with session.get(f"{self.backend_url}/health") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.print_test("Health Endpoint", "PASS", 
                                      f"Detector: {data.get('detector_loaded')}")
                    else:
                        self.print_test("Health Endpoint", "FAIL")
                        return False
                
                # Test active streams endpoint
                async with session.get(f"{self.backend_url}/active-streams") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.print_test("Active Streams Endpoint", "PASS", 
                                      f"Active: {data.get('count', 0)}")
                    else:
                        self.print_test("Active Streams Endpoint", "FAIL")
                        return False
                
                return True
                
        except Exception as e:
            self.print_test("Backend API Test", "FAIL", str(e))
            return False
    
    async def test_websocket(self):
        """Test 5: Check WebSocket connection"""
        print("\n" + "="*60)
        print("TEST 5: Checking WebSocket Connection")
        print("="*60)
        
        try:
            async with websockets.connect(self.ws_url) as websocket:
                # Test connection
                self.print_test("WebSocket Connect", "PASS")
                
                # Wait for connected message
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(message)
                    if data.get("type") == "connected":
                        self.print_test("WebSocket Connected Message", "PASS")
                    else:
                        self.print_test("WebSocket Connected Message", "FAIL", 
                                      f"Unexpected message: {data.get('type')}")
                except asyncio.TimeoutError:
                    self.print_test("WebSocket Connected Message", "FAIL", 
                                  "Timeout waiting for message")
                
                # Test ping-pong
                await websocket.send(json.dumps({"type": "ping"}))
                self.print_test("WebSocket Send", "PASS")
                
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)
                    if data.get("type") == "pong":
                        self.print_test("WebSocket Ping-Pong", "PASS")
                    else:
                        self.print_test("WebSocket Ping-Pong", "FAIL")
                except asyncio.TimeoutError:
                    self.print_test("WebSocket Ping-Pong", "FAIL", "Timeout")
                
                return True
                
        except Exception as e:
            self.print_test("WebSocket Test", "FAIL", str(e))
            return False
    
    async def test_webrtc_offer(self):
        """Test 6: Test WebRTC offer/answer exchange"""
        print("\n" + "="*60)
        print("TEST 6: Checking WebRTC Offer/Answer")
        print("="*60)
        
        try:
            # Create a dummy SDP offer
            dummy_sdp = """v=0
o=- 0 0 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test
a=ice-pwd:testpassword
a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00
a=setup:actpass
a=mid:0
a=sendrecv
a=rtcp-mux
a=rtpmap:96 VP8/90000
"""
            
            async with aiohttp.ClientSession() as session:
                offer_data = {
                    "sdp": dummy_sdp,
                    "type": "offer",
                    "client_id": "test-client-123"
                }
                
                async with session.post(
                    f"{self.backend_url}/offer",
                    json=offer_data
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("type") == "answer":
                            self.print_test("WebRTC Offer/Answer", "PASS", 
                                          f"Client ID: {data.get('client_id')}")
                            
                            # Clean up - stop the stream
                            async with session.post(
                                f"{self.backend_url}/stop-stream",
                                params={"client_id": "test-client-123"}
                            ) as stop_resp:
                                if stop_resp.status == 200:
                                    self.print_test("WebRTC Cleanup", "PASS")
                                else:
                                    self.print_test("WebRTC Cleanup", "SKIP")
                            
                            return True
                        else:
                            self.print_test("WebRTC Offer/Answer", "FAIL", 
                                          "Invalid response type")
                            return False
                    else:
                        error_text = await resp.text()
                        self.print_test("WebRTC Offer/Answer", "FAIL", 
                                      f"Status: {resp.status}, Error: {error_text[:100]}")
                        return False
                        
        except Exception as e:
            self.print_test("WebRTC Test", "FAIL", str(e))
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        total = len(self.results)
        passed = sum(1 for v in self.results.values() if v == "PASS")
        failed = sum(1 for v in self.results.values() if v == "FAIL")
        skipped = sum(1 for v in self.results.values() if v == "SKIP")
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: \033[92m{passed}\033[0m")
        print(f"Failed: \033[91m{failed}\033[0m")
        print(f"Skipped: \033[93m{skipped}\033[0m")
        
        if failed == 0:
            print("\n\033[92mAll tests passed\033[0m")
            print("\nYour backend is ready to use")
            print("\nNext steps:")
            print("  1. Start the backend server: python rtc_server.py")
            print("  2. Connect your frontend to the backend")
            print("  3. Monitor logs for any issues")
        else:
            print("\n\033[91mSome tests failed\033[0m")
            print("\nPlease fix the issues above before proceeding")
        
        print("="*60)
    
    async def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("WEBRTC PERSON DETECTION BACKEND TEST SUITE")
        print("="*60)
        
        # Run synchronous tests
        self.test_imports()
        self.test_camera()
        self.test_detector()
        
        # Run async tests
        await self.test_backend_api()
        await self.test_websocket()
        await self.test_webrtc_offer()
        
        # Print summary
        self.print_summary()


async def main():
    """Main test function"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Test WebRTC Person Detection Backend"
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Backend URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--skip-server",
        action="store_true",
        help="Skip tests that require running server"
    )
    
    args = parser.parse_args()
    
    tester = BackendTester(backend_url=args.url)
    
    if args.skip_server:
        print("\nSkipping server-dependent tests")
        tester.test_imports()
        tester.test_camera()
        tester.test_detector()
        tester.print_summary()
    else:
        await tester.run_all_tests()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        sys.exit(1)