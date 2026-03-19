import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { statusColors, type EventStatus, type Venue, type Event } from "@/hooks/useVenuesAndEvents";

interface MapViewProps {
  venues: Venue[];
  events: Event[];
  onVenueSelect: (venueId: string) => void;
  selectedVenueId: string | null;
  userLocation?: { lat: number; lng: number } | null;
  /** Current bottom-sheet snap index so we can offset the map center */
  sheetSnap?: number;
}

const getVenueStatus = (venueId: string, events: Event[]): EventStatus | null => {
  const venueEvents = events.filter((e) => e.venue.id === venueId);
  if (venueEvents.some((e) => e.status === "live")) return "live";
  if (venueEvents.some((e) => e.status === "today")) return "today";
  if (venueEvents.some((e) => e.status === "this-week")) return "this-week";
  return null;
};

const BAR_COLOR = "#52525b";
const MUSIC_VENUE_COLOR = "#A78BFA"; // violet-400

const createPinIcon = (status: EventStatus | null, isSelected: boolean, zoom: number, hasMusic: boolean) => {
  const isBar = !status;
  // Scale event pins larger when zoomed out
  const zoomScale = zoom < 11 ? 1.4 : zoom < 13 ? 1.2 : 1;
  const baseSize = isSelected ? 20 : status === "live" ? 16 : status ? 14 : hasMusic ? 10 : 8;
  const size = Math.round(baseSize * (isBar ? 1 : zoomScale));
  const glowSize = size + (isBar ? 4 : 16);

  const barColor = hasMusic ? MUSIC_VENUE_COLOR : BAR_COLOR;
  const colors = status ? statusColors[status] : { bg: barColor, glow: hasMusic ? "rgba(167,139,250,0.3)" : "transparent" };

  return L.divIcon({
    className: "custom-pin",
    iconSize: [glowSize, glowSize],
    iconAnchor: [glowSize / 2, glowSize / 2],
    html: `
      <div style="position:relative;width:${glowSize}px;height:${glowSize}px;display:flex;align-items:center;justify-content:center;">
        ${status === "live" ? `<div style="position:absolute;width:${glowSize}px;height:${glowSize}px;border-radius:50%;background:${colors.glow};animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
        ${status ? `<div style="position:absolute;width:${size + 8}px;height:${size + 8}px;border-radius:50%;background:${colors.glow};filter:blur(4px);"></div>` : ""}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors.bg};border:${isBar ? "1px" : "2px"} solid ${isSelected ? "#fff" : isBar ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.3)"};box-shadow:0 0 ${status === "live" ? "12" : isBar && hasMusic ? "4" : isBar ? "0" : "6"}px ${colors.glow};position:relative;z-index:${status ? 2 : 1};opacity:${isBar && !hasMusic ? "0.6" : "1"};"></div>
      </div>
    `,
  });
};

const SNAP_HEIGHTS = [0.1, 0.45, 0.78];
const TOP_BAR_PX = 70;

const MapView = ({ venues, events, onVenueSelect, selectedVenueId, userLocation, sheetSnap = 1 }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dataRef = useRef({ venues, events, selectedVenueId, onVenueSelect });

  // Keep data ref current
  dataRef.current = { venues, events, selectedVenueId, onVenueSelect };

  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const { venues, events, selectedVenueId, onVenueSelect } = dataRef.current;
    const zoom = map.getZoom();
    const hideBarsBelowZoom = 13; // Hide bar-only pins when zoomed out

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    venues.forEach((venue) => {
      const status = getVenueStatus(venue.id, events);
      const isBar = !status;

      // Hide non-music bar-only venues when zoomed out; show music venues earlier
      if (isBar && !venue.hasMusic && zoom < hideBarsBelowZoom) return;
      if (isBar && venue.hasMusic && zoom < hideBarsBelowZoom - 2) return;

      const isSelected = venue.id === selectedVenueId;
      const icon = createPinIcon(status, isSelected, zoom, venue.hasMusic);

      const marker = L.marker([venue.lat, venue.lng], { icon })
        .addTo(map)
        .on("click", () => onVenueSelect(venue.id));

      const scoreLabel = venue.musicScore > 0
        ? `<br/><span style="font-size:9px;opacity:0.7">♪ ${Math.round(venue.musicScore * 100)}% music likelihood</span>`
        : "";
      marker.bindTooltip(`${venue.name}${scoreLabel}`, {
        permanent: false,
        direction: "top",
        offset: [0, -14],
        className: "venue-tooltip",
      });

      markersRef.current[venue.id] = marker;
    });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    // Offset the map center so user dot sits between top bar and sheet
    const viewportH = window.innerHeight;
    const sheetH = viewportH * SNAP_HEIGHTS[sheetSnap];
    const visibleH = viewportH - sheetH - TOP_BAR_PX;
    // Shift center upward by half the difference between bottom obstruction and top
    const offsetPx = (sheetH - TOP_BAR_PX) / 2;
    const targetZoom = map.getZoom() < 11 ? 13 : map.getZoom();
    const targetPoint = map.project([userLocation.lat, userLocation.lng], targetZoom);
    // Move the point down in pixel space so that when rendered, dot appears higher
    const offsetPoint = L.point(targetPoint.x, targetPoint.y + offsetPx / 2);
    const offsetLatLng = map.unproject(offsetPoint, targetZoom);
    map.flyTo(offsetLatLng, targetZoom, { animate: true });

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
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, interactive: false }).addTo(map);
    }
  }, [userLocation, sheetSnap]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [35.7796, -78.6382],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    // Re-render markers on zoom change for size/visibility updates
    map.on("zoomend", renderMarkers);

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
      map.off("zoomend", renderMarkers);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      markersRef.current = {};
    };
  }, [renderMarkers]);

  // Re-render markers when data changes
  useEffect(() => {
    renderMarkers();
    if (mapRef.current) {
      requestAnimationFrame(() => mapRef.current?.invalidateSize({ animate: false }));
    }
  }, [venues, events, selectedVenueId, onVenueSelect, renderMarkers]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <div className="absolute bottom-24 left-4 z-20 bg-card/90 backdrop-blur-md rounded-inner p-2.5 shadow-card space-y-1.5">
        {(["live", "today", "this-week"] as const).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: statusColors[status].bg,
                boxShadow: `0 0 6px ${statusColors[status].glow}`,
              }}
            />
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              {statusColors[status].label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: MUSIC_VENUE_COLOR,
              boxShadow: `0 0 4px rgba(167,139,250,0.3)`,
            }}
          />
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            Music Venue
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: BAR_COLOR,
              border: "1px solid rgba(255,255,255,0.15)",
              opacity: 0.6,
            }}
          />
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            Bar / Venue
          </span>
        </div>
      </div>
    </>
  );
};

export default MapView;
