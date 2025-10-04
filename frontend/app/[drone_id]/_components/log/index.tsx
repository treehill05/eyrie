"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useLog } from "./provider";
import { format } from "date-fns";

export default function Log() {
	const { logs } = useLog();

	return (
		<ScrollArea className="h-full w-full">
			<div className="flex flex-col gap-2 p-4">
				{logs.map((log, index) => (
					<div key={index}>
						<span className="text-sm">
							{format(new Date(log.timestamp), "HH:mm:ss")}:{" "}
						</span>
						<span className="text-sm text-muted-foreground">{log.message}</span>
					</div>
				))}
			</div>
		</ScrollArea>
	);
}
