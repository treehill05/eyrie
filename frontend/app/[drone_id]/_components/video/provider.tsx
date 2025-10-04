"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface IVideoContext {
	videoWidth: number;
	videoHeight: number;
	elementWidth: number;
	elementHeight: number;
	setVideoWidth: (width: number) => void;
	setVideoHeight: (height: number) => void;
	setElementWidth: (width: number) => void;
	setElementHeight: (height: number) => void;
}

const VideoContext = createContext<IVideoContext>({} as IVideoContext);

export function useVideo() {
	const context = useContext(VideoContext);
	if (!context) {
		throw new Error("useVideo must be used within a VideoProvider");
	}
	return context;
}

export default function VideoProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [videoWidth, setVideoWidth] = useState(0);
	const [videoHeight, setVideoHeight] = useState(0);
	const [elementWidth, setElementWidth] = useState(0);
	const [elementHeight, setElementHeight] = useState(0);

	useEffect(() => {
		if (videoWidth && videoHeight) {
			console.log("Loaded video dimensions", videoWidth, videoHeight);
		}
	}, [videoWidth, videoHeight]);

	return (
		<VideoContext.Provider
			value={{
				videoWidth,
				videoHeight,
				elementWidth,
				elementHeight,
				setVideoWidth,
				setVideoHeight,
				setElementWidth,
				setElementHeight,
			}}
		>
			{children}
		</VideoContext.Provider>
	);
}
