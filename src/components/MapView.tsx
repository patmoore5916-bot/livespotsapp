import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { venues, events, statusColors, type EventStatus } from "@/data/mockEvents";

interface MapViewProps {
  onVenueSelect: (venueId: string) => void;
  selectedVenueId: string | null;
  userLocation?: { lat: number; lng: number } | null;
}

// Get the "hottest" status for a venue (live > today > this-week)
const getVenueStatus = (venueId: string): EventStatus | null => {
  const venueEvents = events.filter(e => e.venue.id === venueId);
  if (venueEvents.some(e => e.status === "live")) return "live";
  if (venueEvents.some(e => e.status === "today")) return "today";
  if (venueEvents.some(e => e.status === "this-week")) return "this-week";
  return null;
};

const createPinIcon = (status: EventStatus | null, isSelected: boolean) => {
  const colors = status ? statusColors[status] : { bg: "#52525b", glow: "transparent" };
  const size = isSelected ? 20 : status === "live" ? 16 : 12;
  const glowSize = size + 16;

  return L.divIcon({
    className: "custom-pin",
    iconSize: [glowSize, glowSize],
    iconAnchor: [glowSize / 2, glowSize / 2],
    html: `
      <div style="position:relative;width:${glowSize}px;height:${glowSize}px;display:flex;align-items:center;justify-content:center;">
        ${status === "live" ? `<div style="position:absolute;width:${glowSize}px;height:${glowSize}px;border-radius:50%;background:${colors.glow};animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
        ${status ? `<div style="position:absolute;width:${size + 8}px;height:${size + 8}px;border-radius:50%;background:${colors.glow};filter:blur(4px);"></div>` : ""}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors.bg};border:2px solid ${isSelected ? "#fff" : "rgba(255,255,255,0.3)"};box-shadow:0 0 ${status === "live" ? "12" : "6"}px ${colors.glow};position:relative;z-index:2;${isSelected ? "box-shadow:0 0 0 3px rgba(255,255,255,0.4),0 0 16px " + colors.glow + ";" : ""}"></div>
      </div>
    `,
  });
};

const MapView = ({ onVenueSelect, selectedVenueId }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Center on the Triangle (Durham area)
    const map = L.map(containerRef.current, {
      center: [35.9, -78.95],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add venue markers
    venues.forEach((venue) => {
      const status = getVenueStatus(venue.id);
      const icon = createPinIcon(status, false);

      const marker = L.marker([venue.lat, venue.lng], { icon })
        .addTo(map)
        .on("click", () => onVenueSelect(venue.id));

      // Tooltip with venue name
      marker.bindTooltip(venue.name, {
        permanent: false,
        direction: "top",
        offset: [0, -14],
        className: "venue-tooltip",
      });

      markersRef.current[venue.id] = marker;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Update selected marker styling
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([venueId, marker]) => {
      const status = getVenueStatus(venueId);
      const isSelected = venueId === selectedVenueId;
      marker.setIcon(createPinIcon(status, isSelected));
    });
  }, [selectedVenueId]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {/* Map legend */}
      <div className="absolute bottom-24 left-4 z-20 bg-card/90 backdrop-blur-md rounded-inner p-3 shadow-card space-y-2">
        {(["live", "today", "this-week"] as const).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: statusColors[status].bg,
                boxShadow: `0 0 6px ${statusColors[status].glow}`,
              }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {statusColors[status].label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

export default MapView;
