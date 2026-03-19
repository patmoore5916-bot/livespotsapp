import { useQuery } from "@tanstack/react-query";
import { isToday, isTomorrow } from "date-fns";

const fetchManusPage = async (endpoint: "venues" | "events", limit: number, offset: number) => {
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

/** Paginate through all pages from the frontend side */
const fetchAllPages = async (endpoint: "venues" | "events"): Promise<any[]> => {
  const all: any[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const json = await fetchManusPage(endpoint, limit, offset);
    const items = json.data ?? [];
    all.push(...items);

    const total = json.meta?.total ?? 0;
    offset += limit;
    if (offset >= total || items.length < limit) break;
  }

  return all;
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

let venueCache = new Map<string, Venue>();

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues", "manus-v3"],
    queryFn: async (): Promise<Venue[]> => {
      const raw = await fetchAllPages("venues");
      venueCache = new Map();

      const venues: Venue[] = [];
      for (const v of raw) {
        const lat = parseFloat(v.lat);
        const lng = parseFloat(v.lng);
        if (!lat || !lng) continue;

        const venue: Venue = {
          id: String(v.id),
          name: v.name,
          type: mapVenueType(v.venueType ?? ""),
          neighborhood: v.zip ?? "",
          city: v.city ?? "",
          lat,
          lng,
        };
        venues.push(venue);
        venueCache.set(String(v.id), venue);
      }

      return venues;
    },
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });
};

export const useEvents = () => {
  return useQuery({
    queryKey: ["events", "manus-v3"],
    queryFn: async (): Promise<Event[]> => {
      const raw = await fetchAllPages("events");
      const events: Event[] = [];

      for (const e of raw) {
        if (!e.eventDate) continue;

        const venueFromCache = e.venueId ? venueCache.get(String(e.venueId)) : undefined;
        const venue: Venue = venueFromCache ?? {
          id: String(e.venueId ?? e.id),
          name: e.venueName ?? "Unknown Venue",
          type: "venue",
          neighborhood: "",
          city: "",
          lat: 0,
          lng: 0,
        };

        events.push({
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

      return events;
    },
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });
};

export const useGenres = () => {
  const { data: events } = useEvents();
  const genres = events
    ? ["All", ...new Set(events.map((e) => e.genre).filter(Boolean))]
    : ["All"];
  return genres;
};
