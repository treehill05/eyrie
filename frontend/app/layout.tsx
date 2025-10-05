import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Eyrie",
	description:
		"Eyrie uses AI-powered drones to monitor high-density gatherings in real-time, predicting deadly crowd crush events before they occur and giving authorities critical minutes to save lives. From religious pilgrimages to concerts, protests, and stadium events worldwide.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<NextThemesProvider attribute="class" forcedTheme="dark">
					{children}
				</NextThemesProvider>
			</body>
		</html>
	);
}
