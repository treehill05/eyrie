"use client";

import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRTC } from "../rtc";
import { useVideo } from "./provider";

export default function VideoHeatmap() {
	const { elementWidth, elementHeight, videoWidth, videoHeight } = useVideo();
	const svgRef = useRef<SVGSVGElement>(null);
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

	useEffect(() => {
		if (!svgRef.current || !elementWidth || !elementHeight) return;

		// Clear previous content
		d3.select(svgRef.current).selectAll("*").remove();

		// Transform data points to element coordinates
		const transformedPoints = dataPoints.map((point) => ({
			x: calculateXPosition(point.x),
			y: calculateYPosition(point.y),
		}));

		// Create SVG
		const svg = d3.select(svgRef.current);

		// Set up contour density
		const densityData = d3
			.contourDensity<{ x: number; y: number }>()
			.x((d) => d.x)
			.y((d) => d.y)
			.size([elementWidth, elementHeight])
			.bandwidth(30) // Controls the smoothness of the density estimation
			.thresholds(20)(
			// Number of contour levels
			transformedPoints,
		);

		// Color scale - from transparent to red
		const colorScale = d3
			.scaleSequential(d3.interpolateYlOrRd)
			.domain([0, d3.max(densityData, (d) => d.value) || 0]);

		// Draw contours
		svg
			.selectAll("path")
			.data(densityData)
			.join("path")
			.attr("d", d3.geoPath())
			.attr("fill", (d) => colorScale(d.value))
			.attr("opacity", 0.6)
			.attr("stroke", "none");
	}, [
		elementWidth,
		elementHeight,
		calculateXPosition,
		calculateYPosition,
		dataPoints,
	]);

	return (
		<svg
			ref={svgRef}
			className="absolute z-10 pointer-events-none bg-black/40 backdrop-blur-[1px]"
			style={{ width: elementWidth, height: elementHeight }}
		/>
	);
}
