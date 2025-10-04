import LogProvider from "./_components/log/provider";
import RTCProvider from "./_components/rtc";
import VideoProvider from "./_components/video/provider";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<LogProvider>
			<RTCProvider>
				<VideoProvider>{children}</VideoProvider>
			</RTCProvider>
		</LogProvider>
	);
}
