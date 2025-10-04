import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import Log from "./_components/log";

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
          <ResizablePanel defaultSize={50}>
            <div className="h-full">Camera Feed</div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50}>
            <div className="h-full">Graphs</div>
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
