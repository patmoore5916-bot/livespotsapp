import { useQuery } from "@tanstack/react-query";
import { isToday, isTomorrow } from "date-fns";

const fetchManus = async (endpoint: "venues" | "events", limit: number, offset: number) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/manus-proxy?endpoint=${endpoint}&limit=${limit}&offset=${offset}`;

  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Proxy error ${res.status}: ${text}`);
  }

  return res.json();
};

export type VenueType = "venue" | "bar" | "brewery" | "club";
export type EventStatus = "live" | "today" | "this-week";

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
}

export interface Event {
  id: string;
  venue: Venue;
  artist: string;
  genre: string;
  date: string;
  doorsAt: string;
  startTime: string;
  status: EventStatus;
  ticketUrl?: string;
}

export const statusColors = {
  live: { bg: "#EF4444", glow: "rgba(239,68,68,0.5)", label: "Live Now" },
  today: { bg: "#F59E0B", glow: "rgba(245,158,11,0.4)", label: "Today" },
  "this-week": { bg: "#6366F1", glow: "rgba(99,102,241,0.35)", label: "This Week" },
} as const;

function deriveStatus(dateStr: string): EventStatus {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "today";
  return "this-week";
}

function mapVenueType(vt: string): VenueType {
  const map: Record<string, VenueType> = {
    bar: "bar",
    brewery: "brewery",
    club: "club",
    nightclub: "club",
    restaurant_bar: "bar",
    music_venue: "venue",
    concert_hall: "venue",
  };
  return map[vt] ?? "venue";
}

let venueCache = new Map<number, Venue>();

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues", "manus-v2"],
    queryFn: async (): Promise<Venue[]> => {
      const allVenues: Venue[] = [];
      venueCache = new Map<number, Venue>();
      let offset = 0;
      const limit = 500;

      while (true) {
        const json = await fetchManus("venues", limit, offset);
        const items = json.data ?? [];

        for (const v of items) {
          const venue: Venue = {
            id: String(v.id),
            name: v.name,
            type: mapVenueType(v.venueType ?? ""),
            neighborhood: v.zip ?? "",
            city: v.city ?? "",
            lat: parseFloat(v.lat) || 0,
            lng: parseFloat(v.lng) || 0,
          };
          allVenues.push(venue);
          venueCache.set(Number(v.id), venue);
        }

        if (items.length < limit) break;
        offset += limit;
      }

      return allVenues.filter((venue) => venue.lat && venue.lng);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 0,
    retry: 1,
  });
};

export const useEvents = () => {
  return useQuery({
    queryKey: ["events", "manus-v2"],
    queryFn: async (): Promise<Event[]> => {
      const allEvents: Event[] = [];
      let offset = 0;
      const limit = 500;

      while (true) {
        const json = await fetchManus("events", limit, offset);
        const items = json.data ?? [];

        for (const e of items) {
          if (!e.eventDate) continue;

          const venueFromCache = e.venueId ? venueCache.get(Number(e.venueId)) : undefined;
          const venue: Venue = venueFromCache ?? {
            id: String(e.venueId ?? e.id),
            name: e.venueName ?? "Unknown Venue",
            type: "venue",
            neighborhood: "",
            city: "",
            lat: 0,
            lng: 0,
          };

          allEvents.push({
            id: String(e.id),
            venue,
            artist: e.bandName ?? "TBA",
            genre: e.eventCategory === "live_music" ? "Live Music" : (e.eventCategory ?? "Other"),
            date: e.eventDate,
            doorsAt: "",
            startTime: e.startTime ? e.startTime.slice(0, 5) : "",
            status: deriveStatus(e.eventDate),
            ticketUrl: e.ticketUrl ?? undefined,
          });
        }

        if (items.length < limit) break;
        offset += limit;
      }

      return allEvents;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 0,
    retry: 1,
  });
};

export const useGenres = () => {
  const { data: events } = useEvents();
  const genres = events
    ? ["All", ...new Set(events.map((e) => e.genre).filter(Boolean))]
    : ["All"];
  return genres;
};
