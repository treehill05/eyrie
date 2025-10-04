"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { requestRTC } from "./action";
import type { IceServer } from "./types";

interface IRTCContext {
	iceServers?: IceServer[];
}

const RTCContext = createContext<IRTCContext>({});

export function useRTC() {
	const context = useContext(RTCContext);
	if (!context) {
		throw new Error("useRTC must be used within a RTCProvider");
	}
	return context;
}

export default function RTCProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [iceServers, setIceServers] = useState<IceServer[]>();

	useEffect(() => {
		requestRTC().then((res) => {
			setIceServers(res.iceServers);
		});
	}, []);

	return (
		<RTCContext.Provider value={{ iceServers }}>{children}</RTCContext.Provider>
	);
}
