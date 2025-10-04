"use client";

import { useRTC } from "../rtc";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	Area,
	AreaChart,
} from "recharts";
import { useMemo, useId } from "react";

export default function Graph() {
	const { dataHistory } = useRTC();
	const gradientId = useId();

	// Transform data for recharts
	const chartData = useMemo(() => {
		if (!dataHistory || dataHistory.length === 0) return [];

		// Get the first timestamp to calculate relative time
		const startTime = dataHistory[0].timestamp;

		return dataHistory.map((data, index) => ({
			index,
			time: ((data.timestamp - startTime) / 1000).toFixed(1), // Convert to seconds
			totalPersons: data.total_persons,
			avgConfidence: (data.average_confidence * 100).toFixed(1), // Convert to percentage
			timestamp: data.timestamp,
		}));
	}, [dataHistory]);

	// Calculate statistics
	const stats = useMemo(() => {
		if (!dataHistory || dataHistory.length === 0) {
			return {
				maxPersons: 0,
				avgPersons: 0,
				avgConfidence: 0,
			};
		}

		const maxPersons = Math.max(...dataHistory.map((d) => d.total_persons));
		const avgPersons =
			dataHistory.reduce((acc, d) => acc + d.total_persons, 0) /
			dataHistory.length;
		const avgConfidence =
			dataHistory.reduce((acc, d) => acc + d.average_confidence, 0) /
			dataHistory.length;

		return {
			maxPersons,
			avgPersons: avgPersons.toFixed(1),
			avgConfidence: (avgConfidence * 100).toFixed(1),
		};
	}, [dataHistory]);

	if (!dataHistory || dataHistory.length === 0) {
		return (
			<div className="h-full w-full flex items-center justify-center text-muted-foreground">
				<div className="text-center space-y-2">
					<p className="text-lg font-medium">No data yet</p>
					<p className="text-sm">
						Connect to a drone to start seeing detection analytics
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col p-4 gap-4">
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
						Avg Confidence
					</p>
					<p className="text-2xl font-bold text-emerald-500">
						{stats.avgConfidence}%
					</p>
				</div>
			</div>

			{/* Person Detection Over Time */}
			<div className="flex-1 min-h-0">
				<h3 className="text-sm font-semibold mb-2">
					Person Detection Over Time
				</h3>
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={chartData}>
						<defs>
							<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
								<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
						<XAxis
							dataKey="time"
							label={{
								value: "Time (s)",
								position: "insideBottom",
								offset: -5,
							}}
							tick={{ fontSize: 12 }}
							className="text-muted-foreground"
						/>
						<YAxis
							label={{ value: "Persons", angle: -90, position: "insideLeft" }}
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
						<Legend wrapperStyle={{ fontSize: "12px" }} />
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

			{/* Confidence Over Time */}
			<div className="flex-1 min-h-0">
				<h3 className="text-sm font-semibold mb-2">
					Detection Confidence Over Time
				</h3>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={chartData}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
						<XAxis
							dataKey="time"
							label={{
								value: "Time (s)",
								position: "insideBottom",
								offset: -5,
							}}
							tick={{ fontSize: 12 }}
							className="text-muted-foreground"
						/>
						<YAxis
							label={{
								value: "Confidence (%)",
								angle: -90,
								position: "insideLeft",
							}}
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
							formatter={(value: number) => [`${value}%`, "Confidence"]}
						/>
						<Legend wrapperStyle={{ fontSize: "12px" }} />
						<Line
							type="monotone"
							dataKey="avgConfidence"
							stroke="#10b981"
							strokeWidth={2}
							dot={{ fill: "#10b981", r: 3 }}
							activeDot={{ r: 5 }}
							name="Avg Confidence"
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
