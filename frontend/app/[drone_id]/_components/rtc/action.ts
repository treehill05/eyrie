"use server";

import type {
	CloudflareIceServer,
	CloudflareResponse,
	IceServer,
} from "./types";

async function getCloudflareCredentials(): Promise<CloudflareIceServer[]> {
	const turnKeyId = process.env.TURN_APP_ID;
	const turnApiToken = process.env.TURN_API_TOKEN;

	if (!turnKeyId || !turnApiToken) {
		console.warn("Cloudflare TURN credentials not configured, using STUN only");
		return [];
	}

	try {
		const response = await fetch(
			`https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${turnApiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ttl: 86400 }), // 24 hours
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = (await response.json()) as CloudflareResponse;
		return data.iceServers || [];
	} catch (error) {
		console.error("Failed to get Cloudflare TURN credentials:", error);
		return [];
	}
}

async function sendIceServersToBackend(iceServers: IceServer[]): Promise<void> {
	const fastapiUrl =
		process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

	try {
		const response = await fetch(`${fastapiUrl}/ice-servers`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ iceServers }),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		console.log("Successfully sent ICE servers to backend:", result);
	} catch (error) {
		console.error("Failed to send ICE servers to backend:", error);
		// Don't throw - we still want to return the ICE servers to the frontend
	}
}

export async function requestRTC(): Promise<{ iceServers: IceServer[] }> {
	try {
		const cfServers = await getCloudflareCredentials();
		let finalIceServers: IceServer[] = [];

		if (cfServers.length > 0) {
			// Filter out port 53 URLs as they're blocked by browsers
			const filteredServers: IceServer[] = [];
			for (const server of cfServers) {
				const filteredUrls = server.urls.filter((url) => !url.includes(":53"));
				if (filteredUrls.length > 0) {
					filteredServers.push({
						urls: filteredUrls,
						username: server.username,
						credential: server.credential,
					});
				}
			}
			finalIceServers = filteredServers;
		} else {
			// Fallback to STUN servers
			finalIceServers = [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun.cloudflare.com:3478" },
			];
		}

		// Send ICE servers to backend
		await sendIceServersToBackend(finalIceServers);

		return { iceServers: finalIceServers };
	} catch (error) {
		console.error("Failed to get ICE servers:", error);
		// Return STUN fallback on error
		const fallbackServers = [
			{ urls: "stun:stun.l.google.com:19302" },
			{ urls: "stun:stun.cloudflare.com:3478" },
		];

		// Try to send fallback servers to backend too
		await sendIceServersToBackend(fallbackServers);

		return { iceServers: fallbackServers };
	}
}