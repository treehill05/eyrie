"use client";

import { useChat } from "@ai-sdk/react";
import { Send, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRTC } from "../rtc";
import { calculateDensity } from "@/lib/analytics";

export default function Chat() {
	const [input, setInput] = useState("");
	const { dataHistory } = useRTC();
	const analytics = useMemo(() => {
		if (!dataHistory?.length) return undefined;

		return {
			people: dataHistory[dataHistory.length - 1]?.total_persons ?? 0,
			density: calculateDensity(
				dataHistory[dataHistory.length - 1]?.positions || [],
			),
		};
	}, [dataHistory]);

	const { messages, sendMessage } = useChat();
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSendMessage = useCallback(() => {
		sendMessage(
			{ text: input },
			{
				body: {
					analytics,
				},
			},
		);
		setInput("");
	}, [input, analytics, sendMessage]);

	// Track loading state based on messages
	useEffect(() => {
		const lastMessage = messages[messages.length - 1];
		// If last message is from user, we're waiting for AI response
		if (lastMessage?.role === "user") {
			setIsLoading(true);
		} else if (lastMessage?.role === "assistant") {
			setIsLoading(false);

			if (inputRef.current) {
				if (document.activeElement === document.body) {
					inputRef.current.focus();
				}
			}
		}
	}, [messages]);

	// Auto-scroll to bottom when new messages arrive or loading state changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: Need to scroll on message changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length, isLoading]);

	return (
		<div className="h-full max-h-screen w-full grid grid-rows-[auto_1fr_auto] bg-gradient-to-br from-background via-background to-muted/10 relative overflow-hidden">
			{/* Decorative gradient orbs */}
			<div className="absolute top-10 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute bottom-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

			{/* Header */}
			<div className="relative border-b border-border/50 p-4 shrink-0 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm">
				<div className="flex items-center gap-2 mb-1">
					<div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
						<Send className="w-4 h-4 text-primary" />
					</div>
					<h2 className="text-lg font-semibold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
						AI Assistant
					</h2>
				</div>
				<p className="text-xs text-muted-foreground ml-9">
					Ask questions about the drone feed
				</p>
			</div>

			{/* Messages Area */}
			<div className="relative h-full w-full overflow-hidden">
				<ScrollArea className="absolute inset-0 h-full w-full">
					<div className="space-y-4 p-4">
						{messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-4">
								<div className="relative">
									<div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-lg">
										<MessageCircle className="w-10 h-10 text-primary" />
									</div>
									<div className="absolute inset-0 w-20 h-20 bg-primary/10 rounded-full blur-xl" />
								</div>
								<div className="space-y-2">
									<p className="text-sm font-semibold">Start a conversation</p>
									<p className="text-xs text-muted-foreground max-w-[200px]">
										Ask me anything about the drone feed and crowd analytics
									</p>
								</div>
							</div>
						) : (
							<>
								{messages.map((message) => (
									<div
										key={message.id}
										className={`flex flex-col gap-2 ${
											message.role === "user" ? "items-end" : "items-start"
										}`}
									>
										<div
											className={`max-w-[85%] rounded-xl px-4 py-2.5 transition-all duration-300 hover:shadow-lg ${
												message.role === "user"
													? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md hover:shadow-primary/20"
													: "bg-gradient-to-br from-card to-card/50 text-foreground border border-border/50 hover:border-primary/30 shadow-sm backdrop-blur-sm"
											}`}
										>
											<div className="text-xs font-medium mb-1 opacity-70">
												{message.role === "user" ? "You" : "AI Assistant"}
											</div>
											<div className="text-sm whitespace-pre-wrap">
												{message.parts
													.filter((part) => part.type === "text")
													.map((part, i) => (
														<div key={`${message.id}-${i}`}>{part.text}</div>
													))}
											</div>
										</div>
									</div>
								))}
								{isLoading && (
									<div className="flex flex-col gap-2 items-start">
										<div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-gradient-to-br from-card to-card/50 text-foreground border border-border/50 shadow-sm backdrop-blur-sm">
											<div className="text-xs font-medium mb-1 opacity-70">
												AI Assistant
											</div>
											<div className="flex items-center gap-1 text-sm">
												<span>Thinking</span>
												<span className="flex gap-0.5">
													<span className="animate-bounce [animation-delay:0ms]">
														.
													</span>
													<span className="animate-bounce [animation-delay:150ms]">
														.
													</span>
													<span className="animate-bounce [animation-delay:300ms]">
														.
													</span>
												</span>
											</div>
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</>
						)}
					</div>
				</ScrollArea>
			</div>

			{/* Input Area */}
			<div className="relative border-t border-border/50 p-4 shrink-0 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSendMessage();
					}}
					className="flex gap-2"
				>
					<Input
						value={input}
						placeholder={isLoading ? "AI is thinking..." : "Type a message..."}
						onChange={(e) => setInput(e.currentTarget.value)}
						disabled={isLoading}
						className="flex-1 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
						autoFocus
						ref={inputRef}
					/>
					<Button
						type="submit"
						size="icon"
						disabled={!input.trim() || isLoading}
						className="shrink-0 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
					>
						<Send className="size-4" />
					</Button>
				</form>
			</div>
		</div>
	);
}
