"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { requestRTC } from "./action";
import type { DetectionData, IceServer } from "./types";

interface IRTCContext {
  iceServers?: IceServer[];
  connect: (droneId: string) => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  videoStream: MediaStream | null;
  error: string | null;

  // Data received from the backend
  dataHistory: DetectionData[] | null;
  addData: (data: DetectionData) => void;
}

const RTCContext = createContext<IRTCContext>({} as IRTCContext);

export function useRTC() {
  const context = useContext(RTCContext);
  if (!context) {
    throw new Error("useRTC must be used within a RTCProvider");
  }
  return context;
}

export default function RTCProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [iceServers, setIceServers] = useState<IceServer[]>();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [dataHistory, setDataHistory] = useState<DetectionData[]>([]);

  const addData = useCallback((data: DetectionData) => {
    setDataHistory((prev) => [...prev, data]);
  }, []);

  useEffect(() => {
    requestRTC().then((res) => {
      setIceServers(res.iceServers);
    });
  }, []);

  const waitForIceGatheringComplete = useCallback(
    async (pc: RTCPeerConnection, timeoutMs = 2000) => {
      if (pc.iceGatheringState === "complete") return;
      console.log(
        "Waiting for ICE gathering to complete. Current state:",
        pc.iceGatheringState,
      );
      return new Promise<void>((resolve) => {
        let timeoutId: NodeJS.Timeout;
        const checkState = () => {
          console.log("icegatheringstatechange:", pc.iceGatheringState);
          if (pc.iceGatheringState === "complete") {
            cleanup();
            resolve();
          }
        };
        const onTimeout = () => {
          console.warn(`ICE gathering timed out after ${timeoutMs} ms.`);
          cleanup();
          resolve();
        };
        const cleanup = () => {
          pc.removeEventListener("icegatheringstatechange", checkState);
          clearTimeout(timeoutId);
        };
        pc.addEventListener("icegatheringstatechange", checkState);
        timeoutId = setTimeout(onTimeout, timeoutMs);
        // Checking the state again to avoid any eventual race condition
        checkState();
      });
    },
    [],
  );

  const connect = useCallback(
    async (droneId: string) => {
      if (!iceServers || iceServers.length === 0) {
        return;
      }

      setIsConnecting(true);
      setError(null);

      try {
        // Create peer connection with ICE servers
        const config: RTCConfiguration = {
          iceServers: iceServers.map((server) => ({
            urls: typeof server.urls === "string" ? [server.urls] : server.urls,
            username: server.username,
            credential: server.credential,
          })),
        };

        const pc = new RTCPeerConnection(config);
        peerConnectionRef.current = pc;

        // Add peer connection event listeners
        pc.oniceconnectionstatechange = () => {
          console.log("oniceconnectionstatechange", pc.iceConnectionState);
        };

        pc.onconnectionstatechange = () => {
          console.log("onconnectionstatechange", pc.connectionState);
          const connectionState = pc.connectionState;
          if (connectionState === "connected") {
            setIsConnected(true);
            setIsConnecting(false);
          } else if (
            connectionState === "disconnected" ||
            connectionState === "failed"
          ) {
            setIsConnected(false);
            setIsConnecting(false);
            setError("Connection lost");
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("New ICE candidate:", event.candidate);
          } else {
            console.log("All ICE candidates have been sent.");
          }
        };

        // Handle incoming video track
        pc.ontrack = (event) => {
          console.log("Received track:", event.track.kind);
          if (event.streams?.[0]) {
            console.log("Setting video stream");
            setVideoStream(event.streams[0]);
          }
        };

        // Add transceivers for video (receive only, we don't send video)
        pc.addTransceiver("video", { direction: "recvonly" });

        // Create offer
        await pc.setLocalDescription(await pc.createOffer());
        await waitForIceGatheringComplete(pc);

        const offer = pc.localDescription;
        if (!offer) {
          throw new Error("Failed to create offer");
        }

        // Send offer to backend
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/offer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sdp: offer.sdp,
            type: offer.type,
            client_id: droneId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`);
        }

        const answer = await response.json();
        await pc.setRemoteDescription(
          new RTCSessionDescription({
            sdp: answer.sdp,
            type: answer.type,
          }),
        );

        console.log("WebRTC connection established");
      } catch (err) {
        console.error("Error connecting:", err);
        setError(err instanceof Error ? err.message : "Connection failed");
        setIsConnecting(false);
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
      }
    },
    [iceServers, waitForIceGatheringComplete],
  );

  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setVideoStream(null);
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <RTCContext.Provider
      value={{
        iceServers,
        connect,
        disconnect,
        isConnected,
        isConnecting,
        videoStream,
        error,
        dataHistory,
        addData,
      }}
    >
      {children}
    </RTCContext.Provider>
  );
}
