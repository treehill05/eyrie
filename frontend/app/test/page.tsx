"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Rocket } from "lucide-react";
import { useState } from "react";

export default function TestPage() {
	// Use localhost:8001 as default for testing the RTC server
	const defaultBackendUrl = "http://localhost:8001";
	const envBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

	// Only use env var if it's not an ngrok URL (which causes issues with HTML interstitials)
	const initialUrl =
		envBackendUrl && !envBackendUrl.includes("ngrok")
			? envBackendUrl
			: defaultBackendUrl;

	const [backendUrl, setBackendUrl] = useState(initialUrl);
	const [responses, setResponses] = useState<
		Record<string, { status: number; data: unknown; error?: string }>
	>({});
	const [loading, setLoading] = useState<Record<string, boolean>>({});

	// Custom inputs for specific endpoints
	const [clientId, setClientId] = useState("drone-test-1");

	const makeRequest = async (
		key: string,
		method: string,
		endpoint: string,
		body?: unknown,
	) => {
		setLoading((prev) => ({ ...prev, [key]: true }));
		try {
			const options: RequestInit = {
				method,
				headers: {
					"Content-Type": "application/json",
					// Bypass ngrok browser warning
					"ngrok-skip-browser-warning": "true",
					"User-Agent": "EndpointTester/1.0",
				},
			};

			if (body) {
				options.body = JSON.stringify(body);
			}

			const response = await fetch(`${backendUrl}${endpoint}`, options);

			// Check if response is JSON
			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				// Try to get response text for better error message
				const text = await response.text();
				throw new Error(
					`Expected JSON but got ${contentType}. Response preview: ${text.substring(
						0,
						100,
					)}...`,
				);
			}

			const data = await response.json();

			setResponses((prev) => ({
				...prev,
				[key]: {
					status: response.status,
					data,
				},
			}));
		} catch (error) {
			let errorMessage = "Unknown error";

			if (error instanceof Error) {
				errorMessage = error.message;
			}

			// Provide helpful error messages
			if (errorMessage.includes("Failed to fetch")) {
				errorMessage =
					"Failed to connect. Is the backend running on the specified URL?";
			}

			setResponses((prev) => ({
				...prev,
				[key]: {
					status: 0,
					data: null,
					error: errorMessage,
				},
			}));
		} finally {
			setLoading((prev) => ({ ...prev, [key]: false }));
		}
	};

	const endpoints = [
		{
			key: "root",
			name: "Root Info",
			method: "GET",
			endpoint: "/",
			description: "Get server information and status",
		},
		{
			key: "health",
			name: "Health Check",
			method: "GET",
			endpoint: "/health",
			description: "Check server health and active connections",
		},
		{
			key: "config",
			name: "Get Config",
			method: "GET",
			endpoint: "/config",
			description: "Get client configuration",
		},
		{
			key: "active-streams",
			name: "Active Streams",
			method: "GET",
			endpoint: "/active-streams",
			description: "List all active WebRTC streams",
		},
		{
			key: "available-videos",
			name: "Available Videos",
			method: "GET",
			endpoint: "/available-videos",
			description: "List available video files for streaming",
		},
		{
			key: "detection-data",
			name: "Detection Data",
			method: "GET",
			endpoint: `/detection-data/${clientId}`,
			description: "Get detection data for a specific client",
			requiresClientId: true,
		},
		{
			key: "stop-stream",
			name: "Stop Stream",
			method: "POST",
			endpoint: `/stop-stream?client_id=${clientId}`,
			description: "Stop a specific stream",
			requiresClientId: true,
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="space-y-4">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
						Backend Endpoint Tester
					</h1>
					<p className="text-muted-foreground">
						Test all endpoints from the RTC server
					</p>
				</div>

				{/* Configuration */}
				<Card className="p-6 space-y-4">
					<h2 className="text-xl font-semibold">Configuration</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Backend URL</label>
							<Input
								value={backendUrl}
								onChange={(e) => setBackendUrl(e.target.value)}
								placeholder="http://localhost:8001"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Client ID</label>
							<Input
								value={clientId}
								onChange={(e) => setClientId(e.target.value)}
								placeholder="drone-test-1"
							/>
						</div>
					</div>
				</Card>

				{/* Endpoints Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{endpoints.map((endpoint) => (
						<Card key={endpoint.key} className="p-6 space-y-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold">{endpoint.name}</h3>
									<span
										className={`text-xs px-2 py-1 rounded ${
											endpoint.method === "GET"
												? "bg-blue-500/20 text-blue-500"
												: "bg-green-500/20 text-green-500"
										}`}
									>
										{endpoint.method}
									</span>
								</div>
								<p className="text-sm text-muted-foreground">
									{endpoint.description}
								</p>
								<code className="text-xs bg-muted px-2 py-1 rounded block">
									{endpoint.endpoint}
								</code>
							</div>

							<Button
								onClick={() =>
									makeRequest(endpoint.key, endpoint.method, endpoint.endpoint)
								}
								disabled={loading[endpoint.key]}
								className="w-full"
							>
								{loading[endpoint.key] ? "Loading..." : "Test Endpoint"}
							</Button>

							{/* Response Display */}
							{responses[endpoint.key] && (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium">Response:</span>
										<span
											className={`text-xs px-2 py-1 rounded ${
												responses[endpoint.key].status >= 200 &&
												responses[endpoint.key].status < 300
													? "bg-green-500/20 text-green-500"
													: "bg-red-500/20 text-red-500"
											}`}
										>
											{responses[endpoint.key].status || "ERROR"}
										</span>
									</div>
									<Textarea
										value={JSON.stringify(
											responses[endpoint.key].data,
											null,
											2,
										)}
										readOnly
										className="font-mono text-xs min-h-[150px]"
									/>
									{responses[endpoint.key].error && (
										<div className="text-xs text-red-500">
											Error: {responses[endpoint.key].error}
										</div>
									)}
								</div>
							)}
						</Card>
					))}
				</div>

				{/* WebSocket Test */}
				<Card className="p-6 space-y-4">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold">WebSocket Test</h3>
						<span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-500">
							WS
						</span>
					</div>
					<WebSocketTest backendUrl={backendUrl} />
				</Card>

				{/* Full Test All */}
				<Card className="p-6">
					<Button
						onClick={() => {
							endpoints.forEach((endpoint) => {
								if (endpoint.method === "GET" && !endpoint.requiresClientId) {
									makeRequest(endpoint.key, endpoint.method, endpoint.endpoint);
								}
							});
						}}
						className="w-full gap-2"
						size="lg"
					>
						<Rocket className="w-5 h-5" />
						Test All GET Endpoints
					</Button>
				</Card>
			</div>
		</div>
	);
}

// WebSocket Test Component
function WebSocketTest({ backendUrl }: { backendUrl: string }) {
	const [ws, setWs] = useState<WebSocket | null>(null);
	const [messages, setMessages] = useState<string[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [messageInput, setMessageInput] = useState("");

	const connect = () => {
		const wsUrl = backendUrl
			.replace("http://", "ws://")
			.replace("https://", "wss://");
		const socket = new WebSocket(`${wsUrl}/ws/detection`);

		socket.onopen = () => {
			setIsConnected(true);
			addMessage("✅ Connected to WebSocket");
		};

		socket.onmessage = (event) => {
			addMessage(`📨 Received: ${event.data}`);
		};

		socket.onclose = () => {
			setIsConnected(false);
			addMessage("❌ WebSocket closed");
		};

		socket.onerror = (error) => {
			addMessage(`⚠️ Error: ${error}`);
		};

		setWs(socket);
	};

	const disconnect = () => {
		if (ws) {
			ws.close();
			setWs(null);
		}
	};

	const sendMessage = () => {
		if (ws && messageInput) {
			try {
				const message = JSON.parse(messageInput);
				ws.send(JSON.stringify(message));
				addMessage(`📤 Sent: ${messageInput}`);
				setMessageInput("");
			} catch (error) {
				addMessage(
					`⚠️ Invalid JSON: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				);
			}
		}
	};

	const addMessage = (msg: string) => {
		setMessages((prev) => [
			...prev,
			`[${new Date().toLocaleTimeString()}] ${msg}`,
		]);
	};

	const sendPing = () => {
		if (ws) {
			ws.send(JSON.stringify({ type: "ping" }));
			addMessage('📤 Sent: {"type":"ping"}');
		}
	};

	const sendGetStatus = () => {
		if (ws) {
			ws.send(JSON.stringify({ type: "get_status" }));
			addMessage('📤 Sent: {"type":"get_status"}');
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				{!isConnected ? (
					<Button onClick={connect} className="flex-1">
						Connect WebSocket
					</Button>
				) : (
					<>
						<Button
							onClick={disconnect}
							variant="destructive"
							className="flex-1"
						>
							Disconnect
						</Button>
						<Button onClick={sendPing} variant="outline">
							Send Ping
						</Button>
						<Button onClick={sendGetStatus} variant="outline">
							Get Status
						</Button>
					</>
				)}
			</div>

			{isConnected && (
				<div className="space-y-2">
					<label className="text-sm font-medium">
						Send Custom Message (JSON)
					</label>
					<div className="flex gap-2">
						<Input
							value={messageInput}
							onChange={(e) => setMessageInput(e.target.value)}
							placeholder='{"type": "ping"}'
							className="font-mono text-xs"
						/>
						<Button onClick={sendMessage} size="sm">
							Send
						</Button>
					</div>
				</div>
			)}

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">Messages:</span>
					<Button
						onClick={() => setMessages([])}
						variant="ghost"
						size="sm"
						className="text-xs"
					>
						Clear
					</Button>
				</div>
				<Textarea
					value={messages.join("\n")}
					readOnly
					className="font-mono text-xs min-h-[200px] max-h-[400px]"
					placeholder="WebSocket messages will appear here..."
				/>
			</div>
		</div>
	);
}
