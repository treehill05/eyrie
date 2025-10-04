"use client";

import React from "react";

export interface PersonPosition {
  id: number;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
  confidence: number;
  normalized_x: number;
  normalized_y: number;
  normalized_width: number;
  normalized_height: number;
}

export interface DetectionData {
  total_persons: number;
  average_confidence: number;
  positions: PersonPosition[];
  timestamp: number;
}

interface PersonPositionDisplayProps {
  detectionData: DetectionData | null;
  className?: string;
}

export const PersonPositionDisplay: React.FC<PersonPositionDisplayProps> = ({
  detectionData,
  className = "",
}) => {
  if (!detectionData) {
    return (
      <div className={`bg-gray-100 p-4 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold mb-2">Person Detection</h3>
        <p className="text-gray-500">No detection data available</p>
      </div>
    );
  }

  const { total_persons, average_confidence, positions, timestamp } =
    detectionData;

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Person Detection</h3>
        <span className="text-sm text-gray-500">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {total_persons}
          </div>
          <div className="text-sm text-blue-800">Total Persons</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {(average_confidence * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-green-800">Avg Confidence</div>
        </div>
      </div>

      {/* Individual Person Positions */}
      {positions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Individual Positions</h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {positions.map((person, index) => (
              <div
                key={person.id}
                className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-800">
                      Person {person.id + 1}
                    </div>
                    <div className="text-sm text-gray-600">
                      Position: ({person.x_center.toFixed(1)},{" "}
                      {person.y_center.toFixed(1)})
                    </div>
                    <div className="text-sm text-gray-600">
                      Size: {person.width.toFixed(1)} ×{" "}
                      {person.height.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-800">
                      {(person.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">confidence</div>
                  </div>
                </div>

                {/* Normalized coordinates */}
                <div className="mt-2 text-xs text-gray-500">
                  Normalized: ({person.normalized_x.toFixed(3)},{" "}
                  {person.normalized_y.toFixed(3)})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No persons detected */}
      {positions.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <div className="text-4xl mb-2">👥</div>
          <p>No persons detected in current frame</p>
        </div>
      )}
    </div>
  );
};
