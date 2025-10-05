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
import { calculateDensity } from "@/lib/analytics";

const isUsingMockData = false;

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
			<div className="h-full w-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-background via-background to-muted/10 relative overflow-hidden">
				<div className="absolute top-10 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
				<div className="absolute bottom-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
				<div className="max-w-md text-center space-y-5 relative z-10">
					<div className="relative mx-auto w-24 h-24">
						<div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-xl">
							<span className="text-5xl">📊</span>
						</div>
						<div className="absolute inset-0 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
							No Data Available
						</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Connect to a drone and start detection to see analytics and graphs
							here.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col p-4 gap-4 bg-gradient-to-br from-background via-background to-muted/10 relative overflow-hidden">
			{/* Decorative gradient orbs */}
			<div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

			{/* Mock Data Badge */}
			{isUsingMockData && (
				<div className="relative bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300">
					<span className="text-lg">📊</span>
					<div className="flex-1">
						<p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
							Mock Data Mode
						</p>
						<p className="text-xs text-amber-600/80 dark:text-amber-400/80">
							Connect to a drone to see real-time analytics
						</p>
					</div>
				</div>
			)}

			{/* Statistics Cards */}
			<div className="grid grid-cols-3 gap-3 relative z-10">
				<div className="group relative bg-gradient-to-br from-blue-500/15 to-cyan-500/10 border border-blue-500/30 rounded-xl p-3.5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
					<div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
					<p className="text-xs text-muted-foreground font-semibold mb-1 relative z-10">
						Max Persons
					</p>
					<p className="text-2xl font-bold text-blue-500 relative z-10">
						{stats.maxPersons}
					</p>
				</div>
				<div className="group relative bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-500/30 rounded-xl p-3.5 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
					<div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
					<p className="text-xs text-muted-foreground font-semibold mb-1 relative z-10">
						Avg Persons
					</p>
					<p className="text-2xl font-bold text-purple-500 relative z-10">
						{stats.avgPersons}
					</p>
				</div>
				<div className="group relative bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 rounded-xl p-3.5 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1">
					<div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
					<p className="text-xs text-muted-foreground font-semibold mb-1 relative z-10">
						Avg Density
					</p>
					<p className="text-2xl font-bold text-emerald-500 relative z-10">
						{stats.avgDensity}
					</p>
				</div>
			</div>

			{/* Graphs Container - Horizontal Layout */}
			<div className="flex-1 min-h-0 flex flex-row gap-4 relative z-10">
				{/* Person Detection Over Time */}
				<div className="flex-1 min-w-0 flex flex-col">
					<h3 className="text-sm font-bold mb-2.5 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
						Person Detection Over Time
					</h3>
					<div className="flex-1 min-h-0 bg-gradient-to-br from-card/50 to-card/30 border border-border/50 rounded-xl p-3 backdrop-blur-sm shadow-lg">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={chartData}
								margin={{ top: 5, right: 10, left: -30, bottom: -10 }}
							>
								<defs>
									<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
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
										borderRadius: "12px",
										fontSize: "12px",
										boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
									}}
									labelFormatter={(value) => `Time: ${value}s`}
								/>
								<Area
									type="monotone"
									dataKey="totalPersons"
									stroke="#3b82f6"
									strokeWidth={2.5}
									fill={`url(#${gradientId})`}
									name="Total Persons"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Density Over Time */}
				<div className="flex-1 min-w-0 flex flex-col">
					<h3 className="text-sm font-bold mb-2.5 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
						Spatial Density Over Time
					</h3>
					<div className="flex-1 min-h-0 bg-gradient-to-br from-card/50 to-card/30 border border-border/50 rounded-xl p-3 backdrop-blur-sm shadow-lg">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={chartData}
								margin={{ top: 5, right: 10, left: -30, bottom: -10 }}
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
										borderRadius: "12px",
										fontSize: "12px",
										boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
									}}
									labelFormatter={(value) => `Time: ${value}s`}
									formatter={(value: number) => [value.toFixed(1), "Density"]}
								/>
								<Line
									type="monotone"
									dataKey="density"
									stroke="#10b981"
									strokeWidth={2.5}
									dot={{ fill: "#10b981", r: 3 }}
									activeDot={{ r: 5 }}
									name="Spatial Density"
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	);
}
