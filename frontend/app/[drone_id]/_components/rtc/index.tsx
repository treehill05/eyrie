"use client";

import { useEffect } from "react";
import { requestRTC } from "../../action";

export default function RTCProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	useEffect(() => {
		requestRTC().then((res) => {
			console.log(res);
		});
	}, []);

	return children;
}
