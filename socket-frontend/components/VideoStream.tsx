"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

interface VideoStreamProps {
  streamUrl: string;
  isStreaming: boolean;
  className?: string;
  isInitializing?: boolean;
}

export const VideoStream: React.FC<VideoStreamProps> = ({
  streamUrl,
  isStreaming,
  className = "",
  isInitializing = false,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageError, setImageError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (!isStreaming) {
      setImageError(false);
      return;
    }

    const updateImage = () => {
      if (imgRef.current) {
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        imgRef.current.src = `${streamUrl}?t=${timestamp}`;
        setLastUpdate(timestamp);
        setImageError(false);
      }
    };

    // Update image immediately when streaming starts
    updateImage();

    // Update image every 100ms for smooth streaming
    const interval = setInterval(updateImage, 100);

    return () => clearInterval(interval);
  }, [streamUrl, isStreaming]);

  const handleImageError = () => {
    setImageError(true);
    console.error(
      "Failed to load video stream image - camera may not be started",
    );
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  return (
    <div className={`relative ${className}`}>
      {isStreaming && !imageError && !isInitializing ? (
        <img
          ref={imgRef}
          className="w-full h-full object-cover rounded-lg"
          alt="Live video stream"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
          <div className="text-white text-center">
            {isInitializing ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Initializing camera...</p>
              </>
            ) : !isStreaming ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Starting video stream...</p>
              </>
            ) : (
              <>
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p>Failed to load video stream</p>
                <p className="text-sm mt-2">
                  Please click "Start Camera" in the control panel
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {isStreaming && !imageError && !isInitializing && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          Live
        </div>
      )}
    </div>
  );
};
