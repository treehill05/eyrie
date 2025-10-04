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
      className="absolute z-10 bg-black/50"
      style={{ width: elementWidth, height: elementHeight }}
    >
      {dataPoints.map((point, index) => (
        <div
          key={index}
          className="absolute w-3 h-3 bg-white rounded-full"
          style={{
            left: calculateXPosition(point.x) - 4,
            top: calculateYPosition(point.y) - 4,
          }}
        />
      ))}
    </div>
  );
}
