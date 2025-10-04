"use client";

import { useEffect, useRef } from "react";
import { useVideo } from "./provider";
import VideoPoints from "./points";
import VideoHeatmap from "./heatmap";
import DisplaySwitch from "./display-switch";

export default function Video() {
	const {
		setVideoWidth,
		setVideoHeight,
		setElementWidth,
		setElementHeight,
		display,
	} = useVideo();
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		// Get video data dimensions once metadata is loaded
		const handleLoadedMetadata = () => {
			setVideoWidth(video.videoWidth);
			setVideoHeight(video.videoHeight);
		};

		// Get element dimensions
		const updateElementDimensions = () => {
			setElementWidth(video.offsetWidth);
			setElementHeight(video.offsetHeight);
		};

		// Set up event listeners
		video.addEventListener("loadedmetadata", handleLoadedMetadata);

		// Check if metadata is already loaded (race condition fix)
		if (video.readyState >= 1) {
			// readyState >= 1 means HAVE_METADATA
			handleLoadedMetadata();
		}

		updateElementDimensions();

		// Update element dimensions on window resize
		window.addEventListener("resize", updateElementDimensions);

		// Also use ResizeObserver for more accurate element size tracking
		const resizeObserver = new ResizeObserver(() => {
			updateElementDimensions();
		});
		resizeObserver.observe(video);

		// Cleanup
		return () => {
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
			window.removeEventListener("resize", updateElementDimensions);
			resizeObserver.disconnect();
		};
	}, [setVideoWidth, setVideoHeight, setElementWidth, setElementHeight]);

	return (
		<div className="flex items-center justify-center h-full relative">
			<video
				ref={videoRef}
				src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
				autoPlay
				muted
				preload="metadata"
				className="w-full"
			/>

			{display === "heatmap" && <VideoHeatmap />}
			{display === "points" && <VideoPoints />}

			<DisplaySwitch />
		</div>
	);
}
