"use client";

import { DATA_POINTS } from "@/lib/constants";
import { useVideo } from "./provider";
import { useCallback } from "react";

export default function VideoPoints() {
	const { elementWidth, elementHeight, videoWidth, videoHeight } = useVideo();

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
			{DATA_POINTS.map((point, index) => (
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
