import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Chat from "./_components/chat";
import Graph from "./_components/graph";
import Video from "./_components/video";

export default async function Page() {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-screen rounded-lg min-w-screen"
    >
      <ResizablePanel defaultSize={70}>
        <ResizablePanelGroup direction="vertical">
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
        <Chat />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
