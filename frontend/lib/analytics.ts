import type { DetectionData } from "@/app/[drone_id]/_components/rtc/types";

// Calculate density using Gaussian kernel between positions
// Higher density = more clustered people
export const calculateDensity = (
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
