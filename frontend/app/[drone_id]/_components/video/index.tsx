"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useVideo } from "./provider";
import { useRTC } from "../rtc";
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
	const { connect, disconnect, videoStream, isConnected, isConnecting, error } =
		useRTC();
	const params = useParams<{ drone_id: string }>();
	const droneId = params.drone_id;
	const videoRef = useRef<HTMLVideoElement>(null);

	// Connect to WebRTC when component mounts and ICE servers are ready
	useEffect(() => {
		if (droneId) {
			console.log("Connecting to WebRTC for drone:", droneId);
			connect(droneId);
		}

		return () => {
			disconnect();
		};
	}, [droneId, connect, disconnect]);

	// Update video element when stream is available
	useEffect(() => {
		const video = videoRef.current;
		if (!video || !videoStream) return;

		video.srcObject = videoStream;
		console.log("Video stream attached to video element");
	}, [videoStream]);

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
			{/* Connection status overlay */}
			{(isConnecting || error || !isConnected) && (
				<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
					<div className="text-white text-center">
						{isConnecting && <p>Connecting to drone {droneId}...</p>}
						{error && (
							<div>
								<p className="text-red-400 mb-2">Connection Error</p>
								<p className="text-sm">{error}</p>
							</div>
						)}
						{!isConnecting && !error && !isConnected && (
							<p>Waiting for connection...</p>
						)}
					</div>
				</div>
			)}

			<video ref={videoRef} autoPlay muted playsInline className="w-full" />

			{display === "heatmap" && <VideoHeatmap />}
			{display === "points" && <VideoPoints />}

			<DisplaySwitch />
		</div>
	);
}
