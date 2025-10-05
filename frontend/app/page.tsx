/** biome-ignore-all lint/correctness/useUniqueElementIds: biome ignored :D */
"use client";

import DroneForm from "./_components/drone-form";
import {
	AlertTriangle,
	Eye,
	Shield,
	Zap,
	TrendingUp,
	CheckCircle,
	Search,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";

function Counter({
	end,
	duration = 2000,
	suffix = "",
}: {
	end: number;
	duration?: number;
	suffix?: string;
}) {
	const [count, setCount] = useState(0);
	const [isVisible, setIsVisible] = useState(false);
	const counterRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
				}
			},
			{ threshold: 0.3 },
		);

		if (counterRef.current) {
			observer.observe(counterRef.current);
		}

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!isVisible) return;

		const increment = end / (duration / 16);
		let current = 0;

		const timer = setInterval(() => {
			current += increment;
			if (current >= end) {
				setCount(end);
				clearInterval(timer);
			} else {
				setCount(Math.floor(current));
			}
		}, 16);

		return () => clearInterval(timer);
	}, [isVisible, end, duration]);

	return (
		<div ref={counterRef}>
			{count.toLocaleString()}
			{suffix}
		</div>
	);
}

export default function Page() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const heroStat = {
		value: "13,700+",
		highlight: "deaths in crowd incidents",
		subtext: "over 40 years—and experts say most were preventable",
	};

	const supportingStats = [
		{
			value: "1,477+",
			numericValue: 1477,
			suffix: "+",
			label: "lives lost in India since 2000 across 50+ mass gatherings",
			icon: AlertTriangle,
		},
		{
			value: "Increasing",
			label:
				"Frequency increasing — religious gatherings now the leading incident type",
			icon: TrendingUp,
		},
		{
			value: "90%+",
			numericValue: 90,
			suffix: "%+",
			label:
				"of disasters could be prevented with proper crowd management strategies",
			icon: CheckCircle,
		},
		{
			value: "10%",
			numericValue: 10,
			suffix: "%",
			label:
				"Only 1 in 10 crowd injuries are officially documented — a hidden crisis",
			icon: Search,
		},
	];

	const features = [
		{
			icon: Eye,
			title: "Real-Time Monitoring",
			description:
				"AI-powered drones track crowd density patterns across massive gatherings in real-time.",
		},
		{
			icon: Shield,
			title: "Predictive Analytics",
			description:
				"Machine learning algorithms predict dangerous crowd formations before they become deadly.",
		},
		{
			icon: Zap,
			title: "Instant Alerts",
			description:
				"Critical alerts delivered to authorities with actionable insights to prevent tragedy.",
		},
	];

	const scrollToSection = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
			{/* Header */}
			<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-300">
				<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />
				<div className="container mx-auto px-4 relative">
					<div className="flex h-20 items-center justify-between">
						{/* Logo Section with Enhanced Animation */}
						<div className="group flex items-center gap-3 cursor-pointer">
							<div className="flex flex-col">
								<span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent group-hover:from-primary group-hover:via-primary/90 group-hover:to-primary/70 transition-all duration-300 tracking-tight">
									EYRIE
								</span>
								<span className="text-[0.6rem] font-medium text-muted-foreground/60 tracking-widest uppercase">
									AI Crowd Intelligence
								</span>
							</div>
						</div>

						{/* Enhanced Navigation */}
						<nav className="hidden md:flex items-center gap-2">
							<button
								type="button"
								onClick={() => scrollToSection("hero")}
								className="relative px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 group overflow-hidden rounded-lg"
							>
								<span className="relative z-10">Home</span>
								<div className="absolute inset-0 bg-primary/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
							</button>
							<button
								type="button"
								onClick={() => scrollToSection("stats")}
								className="relative px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 group overflow-hidden rounded-lg"
							>
								<span className="relative z-10">Impact</span>
								<div className="absolute inset-0 bg-primary/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
							</button>
							<button
								type="button"
								onClick={() => scrollToSection("features")}
								className="relative px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 group overflow-hidden rounded-lg"
							>
								<span className="relative z-10">Features</span>
								<div className="absolute inset-0 bg-primary/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
							</button>

							{/* Separator */}
							<div className="w-px h-6 bg-border/50 mx-2" />

							{/* Enhanced CTA Button */}
							<a
								href="mailto:henry@lyra.so"
								className="relative group px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-105"
							>
								<span className="relative z-10 flex items-center gap-2">
									<span>Contact Us</span>
									<Zap className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
								</span>
								<div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
								{/* Shimmer effect */}
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
							</a>
						</nav>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<div id="hero" className="relative overflow-hidden">
				<div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
				<div className="container mx-auto px-4 pt-20 pb-32">
					<div
						className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
					>
						{/* Main Headline */}
						<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
							Preventing Crowd Crush
							<br />
							Before It Happens
						</h1>

						{/* Pitch */}
						<p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
							Eyrie uses AI-powered drones to monitor high-density gatherings in
							real-time, predicting deadly crowd crush events before they occur
							and giving authorities critical minutes to save lives. From
							religious pilgrimages to concerts, protests, and stadium events
							worldwide.
						</p>

						{/* CTA with Drone Selector */}
						<div
							id="cta"
							className={`transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
						>
							<div className="mb-4">
								<p className="text-sm font-medium text-muted-foreground mb-3">
									SELECT A DRONE TO BEGIN MONITORING
								</p>
								<div className="flex justify-center">
									<DroneForm />
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Decorative gradient orbs */}
				<div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
				<div className="absolute bottom-1/4 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
			</div>

			{/* Stats Section */}
			<div
				id="stats"
				className={`container mx-auto px-4 py-20 transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
			>
				<div className="max-w-6xl mx-auto">
					{/* Hero Stat */}
					<div className="mb-12">
						<div className="relative bg-gradient-to-br from-destructive/15 via-destructive/5 to-background border-2 border-destructive/30 rounded-3xl p-12 md:p-16 text-center overflow-hidden shadow-2xl">
							<div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
							{/* Animated background glow */}
							<div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/10 to-destructive/0 animate-pulse" />
							<div className="relative z-10">
								<div className="flex items-center justify-center gap-3 mb-6">
									<div className="relative">
										<AlertTriangle className="w-12 h-12 text-destructive animate-pulse" />
										<div className="absolute inset-0 w-12 h-12 bg-destructive/20 rounded-full blur-xl" />
									</div>
								</div>
								<div className="text-6xl md:text-7xl lg:text-8xl font-bold text-destructive mb-4 tracking-tight">
									<Counter end={13700} duration={2500} suffix="+" />
								</div>
								<div className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground/90 to-foreground bg-clip-text text-transparent">
									{heroStat.highlight}
								</div>
								<div className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
									{heroStat.subtext}
								</div>
							</div>
						</div>
					</div>

					{/* Supporting Stats Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{supportingStats.map((stat) => (
							<div
								key={stat.label}
								className="group relative bg-gradient-to-br from-card to-card/50 border border-border/50 rounded-2xl p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm"
							>
								<div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10 flex flex-col space-y-4">
									<div className="flex items-center gap-3">
										<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
											<stat.icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
										</div>
									</div>
									<div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
										{stat.numericValue ? (
											<Counter
												end={stat.numericValue}
												duration={2000}
												suffix={stat.suffix || ""}
											/>
										) : (
											stat.value
										)}
									</div>
									<div className="text-base text-muted-foreground leading-relaxed">
										{stat.label}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Features Section */}
			<div
				id="features"
				className={`container mx-auto px-4 py-16 transition-all duration-1000 delay-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
			>
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">
							How Eyrie Saves Lives
						</h2>
						<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
							Advanced AI and aerial intelligence working together to prevent
							disasters
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="group relative bg-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
							>
								<div className="mb-4">
									<div className="inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
										<feature.icon className="w-6 h-6 text-primary" />
									</div>
								</div>
								<h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
								<p className="text-muted-foreground leading-relaxed">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Footer Section */}
			<div className="container mx-auto px-4 py-16">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-4 text-muted-foreground">
						<Shield className="w-5 h-5" />
						<span className="text-sm font-medium">
							Protecting lives at scale through intelligent monitoring
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
