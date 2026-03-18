import MapPin from "./MapPin";
import { venues, events } from "@/data/mockEvents";

interface MapViewProps {
  onVenueSelect: (venueId: string) => void;
  selectedVenueId: string | null;
}

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

// Cluster nearby live venues for bigger heat blobs
const getHeatIntensity = (venueId: string) => {
  const venueEvents = events.filter(e => e.venue.id === venueId);
  const liveCount = venueEvents.filter(e => e.isLiveNow).length;
  return liveCount;
};

const MapView = ({ onVenueSelect, selectedVenueId }: MapViewProps) => {
  return (
    <div className="absolute inset-0 bg-[#0a0a12] overflow-hidden">
      {/* Dark map base with subtle terrain */}
      <div className="absolute inset-0">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Subtle grid for streets */}
            <pattern id="streets" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="hsl(240 10% 18%)" strokeWidth="0.5" />
            </pattern>
            <pattern id="streets-lg" width="240" height="240" patternUnits="userSpaceOnUse">
              <path d="M 240 0 L 0 0 0 240" fill="none" stroke="hsl(240 10% 14%)" strokeWidth="1" />
            </pattern>

            {/* Heat map gradient definitions */}
            <radialGradient id="heat-hot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(22 100% 50%)" stopOpacity="0.6" />
              <stop offset="30%" stopColor="hsl(30 100% 55%)" stopOpacity="0.35" />
              <stop offset="60%" stopColor="hsl(45 100% 50%)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(45 100% 50%)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-warm" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(30 100% 55%)" stopOpacity="0.35" />
              <stop offset="40%" stopColor="hsl(45 100% 50%)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(50 100% 50%)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-cool" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(200 60% 50%)" stopOpacity="0.2" />
              <stop offset="50%" stopColor="hsl(220 40% 40%)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="hsl(220 40% 40%)" stopOpacity="0" />
            </radialGradient>

            <filter id="heat-blur">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id="heat-blur-lg">
              <feGaussianBlur stdDeviation="30" />
            </filter>
          </defs>

          {/* Base grid */}
          <rect width="100%" height="100%" fill="url(#streets)" />
          <rect width="100%" height="100%" fill="url(#streets-lg)" />

          {/* Roads - more organic, muted */}
          <path d="M 0 45% Q 25% 42%, 50% 45% T 100% 43%" fill="none" stroke="hsl(240 8% 22%)" strokeWidth="4" strokeLinecap="round" />
          <path d="M 35% 0 Q 40% 30%, 48% 50% T 55% 100%" fill="none" stroke="hsl(240 8% 20%)" strokeWidth="3" strokeLinecap="round" />
          <path d="M 65% 0 Q 70% 25%, 75% 55% T 78% 100%" fill="none" stroke="hsl(240 8% 22%)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 0 30% Q 20% 25%, 40% 32% T 100% 38%" fill="none" stroke="hsl(240 8% 18%)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 10% 100% Q 25% 65%, 50% 48% T 90% 25%" fill="none" stroke="hsl(240 8% 19%)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Highway-like path */}
          <path d="M 0 60% Q 30% 55%, 60% 58% T 100% 52%" fill="none" stroke="hsl(240 8% 24%)" strokeWidth="5" strokeLinecap="round" opacity="0.6" />

          {/* Heat blobs - layered for Snap Map feel */}
          <g filter="url(#heat-blur-lg)" style={{ mixBlendMode: "screen" }}>
            {venues.map((venue) => {
              const pos = venuePositions[venue.id];
              const intensity = getHeatIntensity(venue.id);
              const isLive = intensity > 0;
              if (!pos) return null;

              const size = isLive ? 120 + intensity * 40 : 60;
              return (
                <ellipse
                  key={`heat-${venue.id}`}
                  cx={`${pos.x}%`}
                  cy={`${pos.y}%`}
                  rx={size}
                  ry={size * 0.85}
                  fill={isLive ? "url(#heat-hot)" : "url(#heat-cool)"}
                />
              );
            })}
          </g>

          {/* Second heat layer - tighter, brighter for live venues */}
          <g filter="url(#heat-blur)" style={{ mixBlendMode: "screen" }}>
            {venues.map((venue) => {
              const pos = venuePositions[venue.id];
              const intensity = getHeatIntensity(venue.id);
              if (!pos || intensity === 0) return null;

              return (
                <ellipse
                  key={`heat2-${venue.id}`}
                  cx={`${pos.x}%`}
                  cy={`${pos.y}%`}
                  rx={50 + intensity * 15}
                  ry={40 + intensity * 12}
                  fill="url(#heat-warm)"
                />
              );
            })}
          </g>
        </svg>

        {/* City labels - subtle, uppercase */}
        <span className="absolute top-[22%] left-[15%] text-[10px] font-mono font-medium tracking-[0.25em] uppercase text-white/20 select-none">
          Chapel Hill
        </span>
        <span className="absolute top-[25%] left-[42%] text-[10px] font-mono font-medium tracking-[0.25em] uppercase text-white/20 select-none">
          Durham
        </span>
        <span className="absolute top-[42%] left-[70%] text-[10px] font-mono font-medium tracking-[0.25em] uppercase text-white/20 select-none">
          Raleigh
        </span>
        <span className="absolute top-[62%] left-[5%] text-[9px] font-mono tracking-[0.2em] uppercase text-white/10 select-none">
          Saxapahaw
        </span>
      </div>

      {/* Venue Pins */}
      {venues.map((venue) => {
        const pos = venuePositions[venue.id];
        if (!pos) return null;
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
