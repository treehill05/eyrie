"use client";

import React, { useState } from "react";

interface ControlPanelProps {
  onStartCamera: () => void;
  onStopCamera: () => void;
  onUploadImage: (file: File) => void;
  isStreaming: boolean;
  isConnected: boolean;
  className?: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onStartCamera,
  onStopCamera,
  onUploadImage,
  isStreaming,
  isConnected,
  className = "",
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUploadImage(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Control Panel</h2>

      {/* Connection Status */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm font-medium">
            {isConnected ? "Connected to Backend" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Camera Controls */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-700">Camera Controls</h3>

        <div className="flex space-x-3">
          <button
            onClick={onStartCamera}
            disabled={isStreaming}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isStreaming
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Start Camera
          </button>

          <button
            onClick={onStopCamera}
            disabled={!isStreaming}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !isStreaming
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            Stop Camera
          </button>
        </div>

        {isStreaming && (
          <div className="flex items-center space-x-2 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Camera is streaming</span>
          </div>
        )}
      </div>

      {/* Image Upload */}
      <div className="mt-6 space-y-4">
        <h3 className="font-medium text-gray-700">Image Detection</h3>

        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {selectedFile && (
            <div className="text-sm text-gray-600">
              Selected: {selectedFile.name} (
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !selectedFile
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            Detect Persons in Image
          </button>
        </div>
      </div>

      {/* API Endpoints Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-2">API Endpoints</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• POST /start_camera - Start camera capture</div>
          <div>• POST /stop_camera - Stop camera capture</div>
          <div>• GET /video_feed - Video stream with detection</div>
          <div>• POST /detect_from_base64 - Detect from base64 image</div>
          <div>• WS /ws - Real-time detection data</div>
        </div>
      </div>
    </div>
  );
};
