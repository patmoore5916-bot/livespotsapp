import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { statusColors, type Venue, type Event } from "@/hooks/useVenuesAndEvents";

interface MapViewProps {
  venues: Venue[];
  events: Event[];
  onVenueSelect: (id: string) => void;
  selectedVenueId: string | null;
  userLocation?: { lat: number; lng: number } | null;
}

const DEFAULT_CENTER: [number, number] = [35.227, -80.843]; // Charlotte, NC
const DEFAULT_ZOOM = 11;

function createMarkerIcon(color: string, glow: string, selected: boolean) {
  const size = selected ? 18 : 13;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}">
    <circle cx="${size}" cy="${size}" r="${size - 2}" fill="${color}" stroke="white" stroke-width="2"
      style="filter: drop-shadow(0 0 ${selected ? 6 : 4}px ${glow})" />
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
  });
}

const MapView = ({ venues, events, onVenueSelect, selectedVenueId, userLocation }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Pan to user location
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13, { animate: true });
  }, [userLocation]);

  // Update markers whenever venues or events change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Build event lookup by venue id
    const venueEventMap = new Map<string, Event>();
    events.forEach(e => { if (!venueEventMap.has(e.venue.id)) venueEventMap.set(e.venue.id, e); });

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!venues.find(v => v.id === id)) { marker.remove(); markersRef.current.delete(id); }
    });

    // Add/update markers for all venues with valid coords
    venues.forEach(venue => {
      const lat = parseFloat(String(venue.lat));
      const lng = parseFloat(String(venue.lng));
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const event = venueEventMap.get(venue.id);
      const status = event?.status ?? null;
      const color = status ? statusColors[status].bg : "#6B7280";
      const glow = status ? statusColors[status].glow : "rgba(107,114,128,0.3)";
      const selected = venue.id === selectedVenueId;
      const icon = createMarkerIcon(color, glow, selected);

      if (markersRef.current.has(venue.id)) {
        markersRef.current.get(venue.id)!.setIcon(icon);
      } else {
        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .on("click", () => onVenueSelect(venue.id));
        markersRef.current.set(venue.id, marker);
      }
    });
  }, [venues, events, selectedVenueId, onVenueSelect]);

  return <div ref={mapRef} className="absolute inset-0 z-0" />;
};

export default MapView;
