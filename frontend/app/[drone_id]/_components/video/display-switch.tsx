"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVideo } from "./provider";

export default function DisplaySwitch() {
	const { display, setDisplay } = useVideo();

	return (
		<div className="absolute bottom-4 right-4 z-20">
			<div className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-md border border-border/50 rounded-xl p-1 shadow-xl">
				<ToggleGroup
					type="single"
					value={display}
					onValueChange={setDisplay}
					variant="outline"
					className="gap-1"
				>
					<ToggleGroupItem
						value="none"
						className="data-[state=on]:bg-gradient-to-br data-[state=on]:from-primary data-[state=on]:to-primary/90 data-[state=on]:text-primary-foreground transition-all duration-300 data-[state=on]:shadow-lg"
					>
						None
					</ToggleGroupItem>
					<ToggleGroupItem
						value="points"
						className="data-[state=on]:bg-gradient-to-br data-[state=on]:from-primary data-[state=on]:to-primary/90 data-[state=on]:text-primary-foreground transition-all duration-300 data-[state=on]:shadow-lg"
					>
						Points
					</ToggleGroupItem>
					<ToggleGroupItem
						value="heatmap"
						className="data-[state=on]:bg-gradient-to-br data-[state=on]:from-primary data-[state=on]:to-primary/90 data-[state=on]:text-primary-foreground transition-all duration-300 data-[state=on]:shadow-lg"
					>
						Heat
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	);
}
