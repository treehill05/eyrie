"use client";

import { ArrowRight, Radio } from "lucide-react";
import Link from "next/link";
import { AVAILABLE_DRONES } from "@/lib/constants";

export default function DroneForm() {
  return (
    <div className="w-full max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {AVAILABLE_DRONES.map((drone) => (
          <Link key={drone.id} href={`/${drone.id}`}>
            <div className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer overflow-hidden">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Status indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
                </div>
                <span className="text-xs text-muted-foreground">ONLINE</span>
              </div>

              {/* Drone icon */}
              <div className="relative mb-4">
                <div className="inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                  <Radio className="w-6 h-6 text-primary" />
                </div>
              </div>

              {/* Drone info */}
              <div className="relative">
                <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                  {drone.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Unit ID: {drone.id}
                </p>

                {/* Connect button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Connect →
                  </span>
                  <ArrowRight className="w-5 h-5 text-primary translate-x-0 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" />
                </div>
              </div>

              {/* Decorative corner accent */}
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-primary/10 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
