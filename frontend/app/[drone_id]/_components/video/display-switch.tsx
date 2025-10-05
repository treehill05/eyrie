"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVideo } from "./provider";

export default function DisplaySwitch() {
	const { display, setDisplay } = useVideo();

	return (
		<div className="absolute bottom-4 right-4">
			<ToggleGroup
				type="single"
				value={display}
				onValueChange={setDisplay}
				variant="outline"
			>
				<ToggleGroupItem value="none">None</ToggleGroupItem>
				<ToggleGroupItem value="points">Points</ToggleGroupItem>
				<ToggleGroupItem value="heatmap">Heat</ToggleGroupItem>
			</ToggleGroup>
		</div>
	);
}
