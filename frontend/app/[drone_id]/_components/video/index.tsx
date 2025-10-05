"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Radio, AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
		<div className="flex items-center justify-center h-full relative bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden">
			{/* Decorative gradient orbs */}
			<div className="absolute top-20 left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

			{/* Connection status overlay */}
			{(isConnecting || error || !isConnected) && (
				<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md z-10">
					<div className="text-center space-y-4 p-8 rounded-2xl bg-gradient-to-br from-card/40 to-card/20 border border-border/30 backdrop-blur-sm shadow-2xl max-w-md">
						{isConnecting && (
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
						)}
						{error && (
							<div className="space-y-4">
								<div className="relative mx-auto w-16 h-16">
									<div className="w-16 h-16 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center border border-destructive/30">
										<AlertTriangle className="w-8 h-8 text-destructive" />
									</div>
									<div className="absolute inset-0 w-16 h-16 bg-destructive/20 rounded-full blur-xl" />
								</div>
								<div>
									<p className="text-destructive font-semibold text-lg mb-2">
										Connection Error
									</p>
									<p className="text-white/80 text-sm bg-black/30 rounded-lg p-3 border border-destructive/20 mb-4">
										{error}
									</p>
									<Button
										onClick={() => {
											disconnect();
											if (droneId) {
												connect(droneId);
											}
										}}
										className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
									>
										<RotateCw className="w-4 h-4" />
										Retry Connection
									</Button>
								</div>
							</div>
						)}
						{!isConnecting && !error && !isConnected && (
							<div className="space-y-4">
								<div className="relative mx-auto w-16 h-16">
									<div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center border border-border/30">
										<Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
									</div>
								</div>
								<p className="text-white font-medium">
									Waiting for connection...
								</p>
							</div>
						)}
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
