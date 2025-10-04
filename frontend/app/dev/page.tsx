"use client";

import React, { useState, useCallback, useEffect } from "react";
import { VideoStream } from "./components/VideoStream";
import {
  PersonPositionDisplay,
  DetectionData,
} from "./components/PersonPositionDisplay";
import { WebSocketConnection } from "./components/WebSocketConnection";
import { ControlPanel } from "./components/ControlPanel";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function DevPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [detectionData, setDetectionData] = useState<DetectionData | null>(
    null
  );
  const [streamUrl, setStreamUrl] = useState(`${BACKEND_URL}/video_feed`);
  const [isInitializing, setIsInitializing] = useState(true);

  const handleStartCamera = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/start_camera`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ camera_id: 0 }),
      });

      if (response.ok) {
        setIsStreaming(true);
        console.log("Camera started successfully");
      } else {
        console.error("Failed to start camera");
      }
    } catch (error) {
      console.error("Error starting camera:", error);
    }
  }, []);

  const handleStopCamera = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/stop_camera`, {
        method: "POST",
      });

      if (response.ok) {
        setIsStreaming(false);
        console.log("Camera stopped successfully");
      } else {
        console.error("Failed to stop camera");
      }
    } catch (error) {
      console.error("Error stopping camera:", error);
    }
  }, []);

  const handleUploadImage = useCallback(async (file: File) => {
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;

        const response = await fetch(`${BACKEND_URL}/detect_from_base64`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64String }),
        });

        if (response.ok) {
          const data = await response.json();
          setDetectionData(data);
          console.log("Detection completed:", data);
        } else {
          console.error("Failed to process image");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
    }
  }, []);

  const handleDetectionData = useCallback((data: DetectionData) => {
    setDetectionData(data);
  }, []);

  const handleConnectionStatus = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  // Check camera status on component mount
  useEffect(() => {
    const checkCameraStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/health`);
        if (response.ok) {
          const data = await response.json();
          if (data.camera_available && data.is_streaming) {
            setIsStreaming(true);
          }
        }
      } catch (error) {
        console.error("Error checking camera status:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkCameraStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Person Detection System - Dev Mode
          </h1>
          <p className="text-gray-600">
            Real-time person detection and position tracking using YOLO
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Stream */}
          <div className="lg:col-span-2">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Live Video Stream</h2>
              <VideoStream
                streamUrl={streamUrl}
                isStreaming={isStreaming}
                className="aspect-video"
                isInitializing={isInitializing}
              />
            </div>
          </div>

          {/* Control Panel */}
          <div>
            <ControlPanel
              onStartCamera={handleStartCamera}
              onStopCamera={handleStopCamera}
              onUploadImage={handleUploadImage}
              isStreaming={isStreaming}
              isConnected={isConnected}
            />
          </div>
        </div>

        {/* Detection Results */}
        <div className="mt-6">
          <PersonPositionDisplay
            detectionData={detectionData}
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* WebSocket Connection */}
        <WebSocketConnection
          url={`ws://localhost:8000/ws`}
          onDetectionData={handleDetectionData}
          onConnectionStatus={handleConnectionStatus}
        />
      </div>
    </div>
  );
}
