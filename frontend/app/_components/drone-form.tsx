"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AVAILABLE_DRONES } from "@/lib/constants";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

export default function DroneForm() {
	return (
		<Card className="w-full max-w-sm">
			<CardContent>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" className="!pl-2 w-full">
							<span>Select Drone</span>
							<ChevronDownIcon />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="[--radius:1rem]">
						<DropdownMenuGroup>
							{AVAILABLE_DRONES.map((drone) => (
								<DropdownMenuItem asChild key={drone.id}>
									<Link href={`/${drone.id}`}>
										{drone.name} ({drone.id})
									</Link>
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardContent>
		</Card>
	);
}
