import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { statusColors, type EventStatus, type Venue, type Event } from "@/hooks/useVenuesAndEvents";

interface MapViewProps {
  venues: Venue[];
  events: Event[];
  onVenueSelect: (venueId: string) => void;
  selectedVenueId: string | null;
  userLocation?: { lat: number; lng: number } | null;
}

const getVenueStatus = (venueId: string, events: Event[]): EventStatus | null => {
  const venueEvents = events.filter((e) => e.venue.id === venueId);
  if (venueEvents.some((e) => e.status === "live")) return "live";
  if (venueEvents.some((e) => e.status === "today")) return "today";
  if (venueEvents.some((e) => e.status === "this-week")) return "this-week";
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
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors.bg};border:2px solid ${isSelected ? "#fff" : "rgba(255,255,255,0.3)"};box-shadow:0 0 ${status === "live" ? "12" : "6"}px ${colors.glow};position:relative;z-index:2;${isSelected ? "box-shadow:0 0 0 3px rgba(255,255,255,0.4),0 0 16px ${colors.glow};" : ""}"></div>
      </div>
    `,
  });
};

const MapView = ({ venues, events, onVenueSelect, selectedVenueId, userLocation }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 13, { animate: true });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        const userIcon = L.divIcon({
          className: "custom-pin",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          html: `
            <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(0,122,255,0.15);animation:ping 2.5s ease-out infinite;"></div>
              <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(0,122,255,0.2);"></div>
              <div style="width:14px;height:14px;border-radius:50%;background:#007AFF;border:3px solid white;box-shadow:0 0 8px rgba(0,122,255,0.6);position:relative;z-index:2;"></div>
            </div>
          `,
        });
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, interactive: false }).addTo(mapRef.current);
      }
    }
  }, [userLocation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [39.5, -98.35];
    const defaultZoom = userLocation ? 13 : 4;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    const invalidateMapSize = () => {
      map.invalidateSize({ animate: false });
    };

    const scheduleInvalidate = () => {
      requestAnimationFrame(invalidateMapSize);
    };

    scheduleInvalidate();
    window.addEventListener("resize", scheduleInvalidate);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(scheduleInvalidate);
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", scheduleInvalidate);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [userLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    venues.forEach((venue) => {
      const status = getVenueStatus(venue.id, events);
      const isSelected = venue.id === selectedVenueId;
      const icon = createPinIcon(status, isSelected);

      const marker = L.marker([venue.lat, venue.lng], { icon })
        .addTo(map)
        .on("click", () => onVenueSelect(venue.id));

      marker.bindTooltip(venue.name, {
        permanent: false,
        direction: "top",
        offset: [0, -14],
        className: "venue-tooltip",
      });

      markersRef.current[venue.id] = marker;
    });

    requestAnimationFrame(() => map.invalidateSize({ animate: false }));
  }, [venues, events, selectedVenueId, onVenueSelect]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
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
