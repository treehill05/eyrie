"use client";

import React, { useEffect, useRef, useState } from "react";
import { DetectionData } from "./PersonPositionDisplay";

interface WebSocketConnectionProps {
  url: string;
  onDetectionData: (data: DetectionData) => void;
  onConnectionStatus: (connected: boolean) => void;
}

export const WebSocketConnection: React.FC<WebSocketConnectionProps> = ({
  url,
  onDetectionData,
  onConnectionStatus,
}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = () => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setReconnectAttempts(0);
        onConnectionStatus(true);

        // Send ping to establish connection
        ws.send(JSON.stringify({ type: "ping" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong response
          if (data.type === "pong") {
            console.log("Received pong from server");
            return;
          }

          // Handle detection data
          if (data.total_persons !== undefined) {
            onDetectionData(data as DetectionData);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        onConnectionStatus(false);

        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            console.log(
              `Attempting to reconnect... (${
                reconnectAttempts + 1
              }/${maxReconnectAttempts})`
            );
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, reconnectDelay);
        } else {
          console.error("Max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        onConnectionStatus(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setIsConnected(false);
      onConnectionStatus(false);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // Expose methods via ref if needed
  React.useImperativeHandle(React.createRef(), () => ({
    sendMessage,
    disconnect,
    connect,
  }));

  return null; // This component doesn't render anything
};
