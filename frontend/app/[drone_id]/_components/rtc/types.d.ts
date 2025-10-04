export interface IceServer {
	urls: string | string[];
	username?: string;
	credential?: string;
}

export interface CloudflareIceServer {
	urls: string[];
	username?: string;
	credential?: string;
}

export interface CloudflareResponse {
	iceServers: CloudflareIceServer[];
}
