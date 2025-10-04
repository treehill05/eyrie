"use server";

interface IceServer {
	urls: string | string[];
	username?: string;
	credential?: string;
}

interface CloudflareIceServer {
	urls: string[];
	username?: string;
	credential?: string;
}

interface CloudflareResponse {
	iceServers: CloudflareIceServer[];
}

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

export async function requestRTC(): Promise<{ iceServers: IceServer[] }> {
	try {
		const cfServers = await getCloudflareCredentials();

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
			return { iceServers: filteredServers };
		}

		// Fallback to STUN servers
		return {
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun.cloudflare.com:3478" },
			],
		};
	} catch (error) {
		console.error("Failed to get ICE servers:", error);
		// Return STUN fallback on error
		return {
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun.cloudflare.com:3478" },
			],
		};
	}
}
