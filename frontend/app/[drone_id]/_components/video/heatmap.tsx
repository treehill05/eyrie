"use client";

import { DATA_POINTS } from "@/lib/constants";
import { useVideo } from "./provider";
import { useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";

export default function VideoHeatmap() {
	const { elementWidth, elementHeight, videoWidth, videoHeight } = useVideo();
	const svgRef = useRef<SVGSVGElement>(null);

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
		const transformedPoints = DATA_POINTS.map((point) => ({
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
	}, [elementWidth, elementHeight, calculateXPosition, calculateYPosition]);

	return (
		<svg
			ref={svgRef}
			className="absolute z-10 pointer-events-none bg-black/50"
			style={{ width: elementWidth, height: elementHeight }}
		/>
	);
}
