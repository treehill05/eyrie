import LogProvider from "./_components/log/provider";
import VideoProvider from "./_components/video/provider";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<LogProvider>
			<VideoProvider>{children}</VideoProvider>
		</LogProvider>
	);
}
