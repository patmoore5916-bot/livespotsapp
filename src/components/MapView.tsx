import { useState } from "react";
import MapPin from "./MapPin";
import { venues, events } from "@/data/mockEvents";

interface MapViewProps {
  onVenueSelect: (venueId: string) => void;
  selectedVenueId: string | null;
}

// Map venue IDs to approximate positions on the mock map
const venuePositions: Record<string, { x: number; y: number }> = {
  v1: { x: 22, y: 48 },
  v2: { x: 48, y: 35 },
  v3: { x: 78, y: 55 },
  v4: { x: 75, y: 48 },
  v5: { x: 50, y: 40 },
  v6: { x: 28, y: 42 },
  v7: { x: 80, y: 62 },
  v8: { x: 12, y: 70 },
  v9: { x: 73, y: 52 },
  v10: { x: 45, y: 32 },
  v11: { x: 82, y: 58 },
};

const MapView = ({ onVenueSelect, selectedVenueId }: MapViewProps) => {
  return (
    <div className="absolute inset-0 bg-background overflow-hidden">
      {/* Stylized dark map background */}
      <div className="absolute inset-0">
        {/* Grid lines to simulate map roads */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(var(--accent))" strokeWidth="0.5" opacity="0.3" />
            </pattern>
            <pattern id="grid-lg" width="180" height="180" patternUnits="userSpaceOnUse">
              <path d="M 180 0 L 0 0 0 180" fill="none" stroke="hsl(var(--accent))" strokeWidth="1" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#grid-lg)" />

          {/* Simulated roads */}
          <line x1="0" y1="45%" x2="100%" y2="45%" stroke="hsl(var(--secondary))" strokeWidth="3" opacity="0.6" />
          <line x1="35%" y1="0" x2="55%" y2="100%" stroke="hsl(var(--secondary))" strokeWidth="2" opacity="0.5" />
          <line x1="65%" y1="0" x2="75%" y2="100%" stroke="hsl(var(--secondary))" strokeWidth="2.5" opacity="0.5" />
          <path d="M 0 30 Q 30% 20%, 50% 35% T 100% 50%" fill="none" stroke="hsl(var(--secondary))" strokeWidth="2" opacity="0.4" />
          <path d="M 10% 100% Q 25% 60%, 45% 50% T 90% 20%" fill="none" stroke="hsl(var(--secondary))" strokeWidth="1.5" opacity="0.35" />
        </svg>

        {/* City labels */}
        <span className="absolute top-[22%] left-[15%] text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/50">
          Chapel Hill
        </span>
        <span className="absolute top-[25%] left-[42%] text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/50">
          Durham
        </span>
        <span className="absolute top-[42%] left-[70%] text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/50">
          Raleigh
        </span>
        <span className="absolute top-[60%] left-[5%] text-[10px] tracking-wider uppercase text-muted-foreground/30">
          Saxapahaw
        </span>
      </div>

      {/* Venue Pins */}
      {venues.map((venue) => {
        const pos = venuePositions[venue.id];
        const venueEvents = events.filter(e => e.venue.id === venue.id);
        const isLive = venueEvents.some(e => e.isLiveNow);
        return (
          <MapPin
            key={venue.id}
            x={pos.x}
            y={pos.y}
            label={venue.name}
            isLive={isLive}
            isSelected={selectedVenueId === venue.id}
            onClick={() => onVenueSelect(venue.id)}
          />
        );
      })}
    </div>
  );
};

export default MapView;
