"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { DisplayOption } from "./types";

interface IVideoContext {
	videoWidth: number;
	videoHeight: number;
	elementWidth: number;
	elementHeight: number;
	display: DisplayOption;
	setVideoWidth: (width: number) => void;
	setVideoHeight: (height: number) => void;
	setElementWidth: (width: number) => void;
	setElementHeight: (height: number) => void;
	setDisplay: (display: DisplayOption) => void;
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
	const [display, setDisplay] = useState<DisplayOption>("none");

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
				display,
				setVideoWidth,
				setVideoHeight,
				setElementWidth,
				setElementHeight,
				setDisplay,
			}}
		>
			{children}
		</VideoContext.Provider>
	);
}
