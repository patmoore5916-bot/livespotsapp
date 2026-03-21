import { useEffect, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { statusColors, type EventStatus, type Venue, type Event } from "@/hooks/useVenuesAndEvents";
import { type DateFilter, matchesDateFilter } from "@/components/BottomSheet";

interface MapViewProps {
  venues: Venue[];
  events: Event[];
  onVenueSelect: (venueId: string) => void;
  selectedVenueId: string | null;
  userLocation?: { lat: number; lng: number } | null;
  sheetSnap?: number;
  isLoading?: boolean;
  activeDateFilter?: DateFilter;
  flyToTrigger?: number;
}

const getVenueStatus = (venueId: string, events: Event[]): EventStatus | null => {
  const venueEvents = events.filter((e) => e.venue.id === venueId);
  if (venueEvents.some((e) => e.status === "live")) return "live";
  if (venueEvents.some((e) => e.status === "today")) return "today";
  if (venueEvents.some((e) => e.status === "tomorrow")) return "tomorrow";
  if (venueEvents.some((e) => e.status === "this-week")) return "this-week";
  if (venueEvents.length > 0) return "upcoming";
  return null;
};

/** Check if venue has events matching the active date filter */
const venueMatchesDateFilter = (venueId: string, events: Event[], filter: DateFilter): boolean => {
  if (filter === "all") return true;
  return events.some((e) => e.venue.id === venueId && matchesDateFilter(e.date, filter));
};

const BAR_COLOR = "#52525b";
const MUSIC_VENUE_COLOR = "#A78BFA";
const PLACEHOLDER_COLOR = "#3f3f46";

const createPinIcon = (status: EventStatus | null, isSelected: boolean, zoom: number, hasMusic: boolean, dimmed: boolean) => {
  const isBar = !status;
  const zoomScale = zoom < 11 ? 1.4 : zoom < 13 ? 1.2 : 1;
  const baseSize = isSelected ? 20 : status === "live" ? 16 : status ? 14 : hasMusic ? 10 : 8;
  const size = Math.round(baseSize * (isBar ? 1 : zoomScale));
  const glowSize = size + (isBar ? 4 : 16);

  const barColor = hasMusic ? MUSIC_VENUE_COLOR : BAR_COLOR;
  const colors = status && status !== "upcoming"
    ? statusColors[status]
    : { bg: status === "upcoming" ? statusColors.upcoming.bg : barColor, glow: hasMusic ? "rgba(167,139,250,0.3)" : "transparent" };

  const opacity = dimmed ? 0.2 : (isBar && !hasMusic ? 0.6 : 1);

  return L.divIcon({
    className: "custom-pin",
    iconSize: [glowSize, glowSize],
    iconAnchor: [glowSize / 2, glowSize / 2],
    html: `
      <div style="position:relative;width:${glowSize}px;height:${glowSize}px;display:flex;align-items:center;justify-content:center;opacity:${opacity};">
        ${status === "live" && !dimmed ? `<div style="position:absolute;width:${glowSize}px;height:${glowSize}px;border-radius:50%;background:${colors.glow};animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
        ${status && !dimmed ? `<div style="position:absolute;width:${size + 8}px;height:${size + 8}px;border-radius:50%;background:${colors.glow};filter:blur(4px);"></div>` : ""}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors.bg};border:${isBar ? "1px" : "2px"} solid ${isSelected ? "#fff" : isBar ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.3)"};box-shadow:0 0 ${status === "live" ? "12" : isBar && hasMusic ? "4" : isBar ? "0" : "6"}px ${colors.glow};position:relative;z-index:${status ? 2 : 1};"></div>
      </div>
    `,
  });
};

/** Create placeholder dots for loading state */
const createPlaceholderIcon = () => {
  return L.divIcon({
    className: "custom-pin",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    html: `<div style="width:8px;height:8px;border-radius:50%;background:${PLACEHOLDER_COLOR};opacity:0.4;animation:pulse 2s ease-in-out infinite;"></div>`,
  });
};

const SNAP_HEIGHTS = [0.25, 0.78];
const TOP_BAR_PX = 70;

const MapView = ({ venues, events, onVenueSelect, selectedVenueId, userLocation, sheetSnap = 1, isLoading = false, activeDateFilter = "all", flyToTrigger = 0 }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dataRef = useRef({ venues, events, selectedVenueId, onVenueSelect, activeDateFilter });

  dataRef.current = { venues, events, selectedVenueId, onVenueSelect, activeDateFilter };

  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const { venues, events, selectedVenueId, onVenueSelect, activeDateFilter } = dataRef.current;
    const zoom = map.getZoom();
    const hideBarsBelowZoom = 13;

    // Remove old cluster group entirely so iconCreateFunction picks up current events
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    const statusPriority: Record<string, number> = { live: 3, today: 2, "this-week": 1, tomorrow: 1, upcoming: 0 };
    const clusterColors: Record<string, { bg: string; glow: string }> = {
      live: { bg: "#EF4444", glow: "rgba(239,68,68,0.5)" },
      today: { bg: "#F59E0B", glow: "rgba(245,158,11,0.4)" },
      "this-week": { bg: "#6366F1", glow: "rgba(99,102,241,0.35)" },
      tomorrow: { bg: "#818CF8", glow: "rgba(129,140,248,0.35)" },
      upcoming: { bg: "#64748B", glow: "rgba(100,116,139,0.25)" },
    };
    const greyCluster = { bg: "#52525b", glow: "rgba(82,82,91,0.25)" };

    clusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: (zoom) => zoom >= 14 ? 0 : zoom >= 12 ? 20 : 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 15,
      iconCreateFunction: (cluster) => {
        const children = cluster.getAllChildMarkers();
        let bestStatus: string | null = null;
        let bestPriority = -1;
        for (const child of children) {
          const s = (child.options as any)._venueStatus as string | null;
          if (s && (statusPriority[s] ?? 0) > bestPriority) {
            bestPriority = statusPriority[s] ?? 0;
            bestStatus = s;
          }
        }
        const colors = bestStatus ? clusterColors[bestStatus] ?? greyCluster : greyCluster;
        const count = cluster.getChildCount();
        const size = count > 20 ? 44 : count > 10 ? 38 : 32;
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors.bg};color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:'IBM Plex Sans',sans-serif;box-shadow:0 0 12px ${colors.glow};border:2px solid rgba(255,255,255,0.3);">${count}</div>`,
          className: "custom-cluster",
          iconSize: [size, size],
        });
      },
    });
    map.addLayer(clusterGroupRef.current);

    const markers: L.Marker[] = [];

    venues.forEach((venue) => {
      const status = getVenueStatus(venue.id, events);
      const isBar = !status;
      const matchesFilter = venueMatchesDateFilter(venue.id, events, activeDateFilter);
      const dimmed = activeDateFilter !== "all" && !matchesFilter;

      if (isBar && !venue.hasMusic && zoom < hideBarsBelowZoom) return;
      if (isBar && venue.hasMusic && zoom < hideBarsBelowZoom - 2) return;
      // Hide dimmed non-event venues entirely when filtered
      if (dimmed && isBar) return;

      const isSelected = venue.id === selectedVenueId;
      const icon = createPinIcon(status, isSelected, zoom, venue.hasMusic, dimmed);

      const marker = L.marker([venue.lat, venue.lng], {
        icon,
        _venueStatus: status, // custom property for cluster color logic
      } as any)
        .on("click", () => {
          onVenueSelect(venue.id);
          marker.openPopup();
        });

      const venueEvents = events.filter((e) => e.venue.id === venue.id);
      const typeLabel = venue.type === "bar" ? "Bar" : venue.type === "brewery" ? "Brewery" : venue.type === "club" ? "Club" : "Venue";
      const musicBadge = venue.hasMusic
        ? `<span style="background:rgba(167,139,250,0.2);color:#A78BFA;padding:1px 6px;border-radius:8px;font-size:9px;margin-left:4px;">♪ Music</span>`
        : "";

      let eventsHtml = "";
      if (venueEvents.length > 0) {
        const eventItems = venueEvents.slice(0, 3).map((ev) => {
          const sColors = statusColors[ev.status] ?? statusColors.upcoming;
          const dot = ev.status === "live" ? `<span style="color:${sColors.bg};">● </span>` : "";
          const time = ev.startTime || "TBA";
          return `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="font-weight:600;font-size:11px;color:#fafafa;">${dot}${ev.artist}</div>
            <div style="font-size:9px;color:#a1a1aa;">${ev.genre} · ${time} · ${ev.date}</div>
          </div>`;
        }).join("");
        const moreLabel = venueEvents.length > 3 ? `<div style="font-size:9px;color:#2563EB;margin-top:2px;">+${venueEvents.length - 3} more</div>` : "";
        eventsHtml = `<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px;">
          <div style="font-size:9px;color:#71717a;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Upcoming</div>
          ${eventItems}${moreLabel}
        </div>`;
      }

      marker.bindPopup(`
        <div style="font-family:'IBM Plex Sans',sans-serif;min-width:160px;max-width:220px;">
          <div style="font-weight:700;font-size:13px;color:#fafafa;line-height:1.3;">${venue.name}</div>
          <div style="font-size:10px;color:#a1a1aa;margin-top:1px;">${typeLabel}${venue.city ? ` · ${venue.city}` : ""}${musicBadge}</div>
          ${eventsHtml}
        </div>
      `, {
        className: "venue-popup",
        closeButton: false,
        maxWidth: 240,
        minWidth: 160,
      });

      markers.push(marker);
    });

    clusterGroupRef.current.addLayers(markers);
  }, []);

  const hasFlownToUser = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    // Only fly to user location on the FIRST time it's received
    if (hasFlownToUser.current) {
      // Just update marker position silently
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
      return;
    }

    hasFlownToUser.current = true;

    const viewportH = window.innerHeight;
    const sheetH = viewportH * SNAP_HEIGHTS[sheetSnap];
    const offsetPx = (sheetH - TOP_BAR_PX) / 2;
    const targetZoom = map.getZoom() < 11 ? 13 : map.getZoom();
    const targetPoint = map.project([userLocation.lat, userLocation.lng], targetZoom);
    const offsetPoint = L.point(targetPoint.x, targetPoint.y + offsetPx / 2);
    const offsetLatLng = map.unproject(offsetPoint, targetZoom);
    map.flyTo(offsetLatLng, targetZoom, { animate: true });

    if (!userMarkerRef.current) {
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
  }, [userLocation]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [35.7796, -78.6382],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      className: "google-night-tiles",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

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
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
    };
  }, [renderMarkers]);

  // Re-render markers when data or filter changes
  useEffect(() => {
    renderMarkers();
    if (mapRef.current) {
      requestAnimationFrame(() => mapRef.current?.invalidateSize({ animate: false }));
    }
  }, [venues, events, selectedVenueId, onVenueSelect, activeDateFilter, renderMarkers]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <div className={`absolute left-4 z-20 bg-card/90 backdrop-blur-md rounded-inner p-2.5 shadow-card space-y-1.5 transition-all duration-300`} style={{ bottom: sheetSnap === 1 ? 'calc(78vh + 16px)' : 'calc(25vh + 16px)' }}>
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
