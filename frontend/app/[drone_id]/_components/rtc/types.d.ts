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

export interface DetectionData {
	total_persons: number;
	average_confidence: number;
	positions: Array<{
		id: number;
		x_center: number;
		y_center: number;
		width: number;
		height: number;
		confidence: number;
		normalized_x: number;
		normalized_y: number;
		normalized_width: number;
		normalized_height: number;
	}>;
	timestamp: number;
	frame_available: boolean;
}
