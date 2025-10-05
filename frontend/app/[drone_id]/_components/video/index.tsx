"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Radio, Loader2 } from "lucide-react";
import { useRTC } from "../rtc";
import DisplaySwitch from "./display-switch";
import VideoHeatmap from "./heatmap";
import VideoPoints from "./points";
import { useVideo } from "./provider";

export default function Video() {
	const {
		setVideoWidth,
		setVideoHeight,
		setElementWidth,
		setElementHeight,
		display,
	} = useVideo();
	const { connect, disconnect, videoStream, isConnected, error } = useRTC();
	const params = useParams<{ drone_id: string }>();
	const droneId = params.drone_id;
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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

	// Auto-retry on error after 1 second
	useEffect(() => {
		if (error && droneId) {
			console.log("Connection error detected, retrying in 1 second...");
			const retryTimeout = setTimeout(() => {
				disconnect();
				connect(droneId);
			}, 1000);

			return () => {
				clearTimeout(retryTimeout);
			};
		}
	}, [error, droneId, connect, disconnect]);

	// Update video element when stream is available
	useEffect(() => {
		const video = videoRef.current;
		if (!video || !videoStream) return;

		video.srcObject = videoStream;
		setIsVideoPlaying(false); // Reset playing state when stream changes
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

		// Track when video starts playing
		const handlePlaying = () => {
			setIsVideoPlaying(true);
			console.log("Video is now playing");
		};

		// Track when video is waiting/buffering
		const handleWaiting = () => {
			setIsVideoPlaying(false);
		};

		// Get element dimensions
		const updateElementDimensions = () => {
			setElementWidth(video.offsetWidth);
			setElementHeight(video.offsetHeight);
		};

		// Set up event listeners
		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		video.addEventListener("playing", handlePlaying);
		video.addEventListener("waiting", handleWaiting);

		// Check if metadata is already loaded (race condition fix)
		if (video.readyState >= 1) {
			// readyState >= 1 means HAVE_METADATA
			handleLoadedMetadata();
		}

		// Check if video is already playing
		if (video.readyState >= 3 && !video.paused) {
			// readyState >= 3 means HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
			setIsVideoPlaying(true);
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
			video.removeEventListener("playing", handlePlaying);
			video.removeEventListener("waiting", handleWaiting);
			window.removeEventListener("resize", updateElementDimensions);
			resizeObserver.disconnect();
		};
	}, [setVideoWidth, setVideoHeight, setElementWidth, setElementHeight]);

	return (
		<div className="flex items-center justify-center h-full relative bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden">
			{/* Decorative gradient orbs */}
			<div className="absolute top-20 left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

			{/* Connection status overlay */}
			{!isConnected && (
				<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md z-10">
					<div className="text-center space-y-4 p-8 rounded-2xl bg-gradient-to-br from-card/40 to-card/20 border border-border/30 backdrop-blur-sm shadow-2xl max-w-md">
						<div className="space-y-4">
							<div className="relative mx-auto w-16 h-16">
								<div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
								<div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
									<Radio className="w-8 h-8 text-primary" />
								</div>
							</div>
							<div>
								<p className="text-white font-semibold text-lg">
									Connecting to Drone
								</p>
								<p className="text-white/70 text-sm mt-1">ID: {droneId}</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Video loading overlay */}
			{isConnected && !isVideoPlaying && (
				<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md z-10">
					<div className="text-center space-y-4 p-8 rounded-2xl bg-gradient-to-br from-card/40 to-card/20 border border-border/30 backdrop-blur-sm shadow-2xl max-w-md">
						<div className="space-y-4">
							<div className="relative mx-auto w-16 h-16">
								<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
									<Loader2 className="w-8 h-8 text-primary animate-spin" />
								</div>
							</div>
							<div>
								<p className="text-white font-semibold text-lg">
									Loading Video Stream
								</p>
								<p className="text-white/70 text-sm mt-1">Please wait...</p>
							</div>
						</div>
					</div>
				</div>
			)}

			<video
				ref={videoRef}
				autoPlay
				muted
				playsInline
				className="w-full relative z-0"
			/>

			{display === "heatmap" && <VideoHeatmap />}
			{display === "points" && <VideoPoints />}

			{isConnected && <DisplaySwitch />}
		</div>
	);
}
