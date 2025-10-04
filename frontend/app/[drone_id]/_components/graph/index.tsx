"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRTC } from "../rtc";
import type { DetectionData } from "../rtc/types";

const isUsingMockData = false;

// Calculate density using Gaussian kernel between positions
// Higher density = more clustered people
const calculateDensity = (
  positions: DetectionData["positions"],
  sigma = 0.15,
): number => {
  if (positions.length === 0) return 0;
  if (positions.length === 1) return 1;

  let densitySum = 0;
  const n = positions.length;

  // Calculate pairwise Gaussian kernel values
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pos1 = positions[i];
      const pos2 = positions[j];

      // Use normalized coordinates for consistent scale (0-1)
      const dx = pos1.normalized_x - pos2.normalized_x;
      const dy = pos1.normalized_y - pos2.normalized_y;
      const distSq = dx * dx + dy * dy;

      // Gaussian kernel: exp(-d^2 / (2*sigma^2))
      const kernelValue = Math.exp(-distSq / (2 * sigma * sigma));
      densitySum += kernelValue;
    }
  }

  // Normalize by number of pairs
  const numPairs = (n * (n - 1)) / 2;
  return densitySum / numPairs;
};

// Mock data generator for testing
const generateMockData = (): DetectionData[] => {
  const startTime = Date.now();
  const mockData: DetectionData[] = [];

  for (let i = 0; i < 50; i++) {
    // Create a more interesting pattern - simulate people entering/leaving
    const basePersons = 3;
    const wave = Math.sin(i / 5) * 3; // Sine wave for natural variation
    const noise = Math.random() * 2 - 1; // Random noise
    const totalPersons = Math.max(0, Math.floor(basePersons + wave + noise));

    // Confidence varies slightly but generally high
    const averageConfidence = 0.82 + Math.random() * 0.13; // 82-95%

    mockData.push({
      total_persons: totalPersons,
      average_confidence: averageConfidence,
      positions: Array.from({ length: totalPersons }, (_, idx) => ({
        id: idx,
        x_center: Math.random() * 1920,
        y_center: Math.random() * 1080,
        width: 100 + Math.random() * 100,
        height: 150 + Math.random() * 100,
        confidence: averageConfidence + (Math.random() * 0.1 - 0.05),
        normalized_x: Math.random(),
        normalized_y: Math.random(),
        normalized_width: 0.05 + Math.random() * 0.05,
        normalized_height: 0.1 + Math.random() * 0.05,
      })),
      timestamp: startTime + i * 1000, // 1 second intervals
      frame_available: true,
    });
  }

  return mockData;
};

export default function Graph() {
  const { dataHistory } = useRTC();
  const gradientId = useId();

  // Use mock data if no real data is available
  const displayData = !isUsingMockData ? dataHistory : generateMockData();

  // Transform data for recharts
  const chartData = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];

    // Get the first timestamp to calculate relative time
    const startTime = displayData[0].timestamp;

    return displayData.map((data, index) => {
      const density = calculateDensity(data.positions);
      return {
        index,
        time: ((data.timestamp - startTime) / 1000).toFixed(1), // Convert to seconds
        totalPersons: data.total_persons,
        density: Number((density * 100).toFixed(1)), // Scale to 0-100 for better visualization
        timestamp: data.timestamp,
      };
    });
  }, [displayData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!displayData || displayData.length === 0) {
      return {
        maxPersons: 0,
        avgPersons: 0,
        avgDensity: 0,
      };
    }

    const maxPersons = Math.max(...displayData.map((d) => d.total_persons));
    const avgPersons =
      displayData.reduce((acc, d) => acc + d.total_persons, 0) /
      displayData.length;

    // Calculate average density across all time points
    const densities = displayData.map((d) => calculateDensity(d.positions));
    const avgDensity =
      densities.reduce((acc, d) => acc + d, 0) / densities.length;

    return {
      maxPersons,
      avgPersons: avgPersons.toFixed(1),
      avgDensity: (avgDensity * 100).toFixed(1), // Scale to 0-100
    };
  }, [displayData]);

  // Show empty state if no data is available
  if (!isUsingMockData && (!dataHistory || dataHistory.length === 0)) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <span className="text-4xl">📊</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No Data Available</h3>
            <p className="text-sm text-muted-foreground">
              Connect to a drone and start detection to see analytics and graphs
              here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-4 gap-4">
      {/* Mock Data Badge */}
      {isUsingMockData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Mock Data Mode
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
              Connect to a drone to see real-time analytics
            </p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">
            Max Persons
          </p>
          <p className="text-2xl font-bold text-blue-500">{stats.maxPersons}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">
            Avg Persons
          </p>
          <p className="text-2xl font-bold text-purple-500">
            {stats.avgPersons}
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">
            Avg Density
          </p>
          <p className="text-2xl font-bold text-emerald-500">
            {stats.avgDensity}
          </p>
        </div>
      </div>

      {/* Person Detection Over Time */}
      <div className="flex-1 min-h-0">
        <h3 className="text-sm font-semibold mb-2">
          Person Detection Over Time
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelFormatter={(value) => `Time: ${value}s`}
            />
            <Area
              type="monotone"
              dataKey="totalPersons"
              stroke="#3b82f6"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              name="Total Persons"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Density Over Time */}
      <div className="flex-1 min-h-0">
        <h3 className="text-sm font-semibold mb-2">
          Spatial Density Over Time
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelFormatter={(value) => `Time: ${value}s`}
              formatter={(value: number) => [value.toFixed(1), "Density"]}
            />
            <Line
              type="monotone"
              dataKey="density"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 3 }}
              activeDot={{ r: 5 }}
              name="Spatial Density"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
