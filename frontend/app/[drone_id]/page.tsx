import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import Log from "./_components/log";
import Video from "./_components/video";
import Graph from "./_components/graph";

export default async function Page({
	params,
}: {
	params: Promise<{ drone_id: string }>;
}) {
	return (
		<ResizablePanelGroup
			direction="vertical"
			className="min-h-screen rounded-lg min-w-screen"
		>
			<ResizablePanel defaultSize={70}>
				<ResizablePanelGroup direction="horizontal">
					<ResizablePanel defaultSize={60}>
						<Video />
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel defaultSize={40}>
						<Graph />
					</ResizablePanel>
				</ResizablePanelGroup>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={30}>
				<Log />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
