"use client";

import { useChat } from "@ai-sdk/react";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track loading state based on messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    // If last message is from user, we're waiting for AI response
    if (lastMessage?.role === "user") {
      setIsLoading(true);
    } else if (lastMessage?.role === "assistant") {
      setIsLoading(false);
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive or loading state changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to scroll on message changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  return (
    <div className="h-full max-h-screen w-full grid grid-rows-[auto_1fr_auto]">
      {/* Header */}
      <div className="border-b border-border p-4 shrink-0">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <p className="text-xs text-muted-foreground">
          Ask questions about the drone feed
        </p>
      </div>

      {/* Messages Area */}
      <div className="relative h-full w-full overflow-hidden">
        <ScrollArea className="absolute inset-0 h-full w-full">
          <div className="space-y-4 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-3xl">💬</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Start a conversation</p>
                  <p className="text-xs text-muted-foreground">
                    Ask me anything about the drone feed
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
                      className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground border border-border"
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
                    <div className="max-w-[85%] rounded-lg px-4 py-2.5 bg-muted text-foreground border border-border">
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
      <div className="border-t border-border p-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            placeholder={isLoading ? "AI is thinking..." : "Type a message..."}
            onChange={(e) => setInput(e.currentTarget.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
