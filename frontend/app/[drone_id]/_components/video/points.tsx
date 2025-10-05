"use client";

import { useCallback, useMemo } from "react";
import { useRTC } from "../rtc";
import { useVideo } from "./provider";

export default function VideoPoints() {
  const { elementWidth, elementHeight, videoWidth, videoHeight } = useVideo();
  const { dataHistory } = useRTC();

  const dataPoints = useMemo(
    () =>
      dataHistory?.[dataHistory.length - 1]?.positions.map((point) => ({
        x: point.x_center,
        y: point.y_center,
      })) || [],
    [dataHistory],
  );

  const calculateXPosition = useCallback(
    (x: number) => {
      return (x / videoWidth) * elementWidth;
    },
    [elementWidth, videoWidth],
  );

  const calculateYPosition = useCallback(
    (y: number) => {
      return (y / videoHeight) * elementHeight;
    },
    [elementHeight, videoHeight],
  );

  return (
    <div
      className="absolute z-10 bg-black/40 backdrop-blur-[1px]"
      style={{ width: elementWidth, height: elementHeight }}
    >
      {dataPoints.map((point) => (
        <div
          key={`${point.x}-${point.y}`}
          className="absolute"
          style={{
            left: calculateXPosition(point.x) - 6,
            top: calculateYPosition(point.y) - 6,
          }}
        >
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 w-3 h-3 bg-primary/40 rounded-full animate-ping" />
            <div className="relative w-3 h-3 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg shadow-primary/50 border border-primary-foreground/20" />
          </div>
        </div>
      ))}
    </div>
  );
}
