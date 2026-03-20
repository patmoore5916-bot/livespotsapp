import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
  const limit = 200;

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
  hasMusic: boolean;
  /** 0–1 likelihood of live music based on event frequency + venue type */
  musicScore: number;
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

const MUSIC_VENUE_TYPES = new Set([
  "live_music_venue", "concert_hall", "music_venue", "jazz_club",
]);

function isMusical(venueType: string, vibeTags: string[]): boolean {
  return MUSIC_VENUE_TYPES.has(venueType) || vibeTags.includes("live_music");
}

let venueCache = new Map<string, Venue>();
let venueNameIndex = new Map<string, Venue>();
let venueNamesList: { key: string; venue: Venue }[] = [];

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues", "manus-v3"],
    queryFn: async (): Promise<Venue[]> => {
      const raw = await fetchAllPages("venues");
      venueCache = new Map();
      venueNameIndex = new Map();
      venueNamesList = [];

      const venues: Venue[] = [];
      for (const v of raw) {
        const lat = parseFloat(v.lat);
        const lng = parseFloat(v.lng);
        if (!lat || !lng) continue;

        const hasMusicType = isMusical(v.venueType ?? "", v.vibeTags ?? []);
        const venue: Venue = {
          id: String(v.id),
          name: v.name,
          type: mapVenueType(v.venueType ?? ""),
          neighborhood: v.zip ?? "",
          city: v.city ?? "",
          lat,
          lng,
          hasMusic: hasMusicType,
          musicScore: hasMusicType ? 0.7 : 0,
        };
        venues.push(venue);
        venueCache.set(String(v.id), venue);
        const key = v.name?.toLowerCase().trim();
        if (key) {
          if (!venueNameIndex.has(key)) venueNameIndex.set(key, venue);
          venueNamesList.push({ key, venue });
        }
      }

      return venues;
    },
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });
};

export const useEvents = () => {
  // Ensure venue cache is populated before fetching events
  const { data: venuesData } = useVenues();

  return useQuery({
    queryKey: ["events", "manus-v3"],
    enabled: !!venuesData && venuesData.length > 0,
    queryFn: async (): Promise<Event[]> => {
      const raw = await fetchAllPages("events");
      const events: Event[] = [];

      for (const e of raw) {
        if (!e.eventDate) continue;

        const venueFromCache = e.venueId ? venueCache.get(String(e.venueId)) : undefined;
        // Try exact name match
        const nameKey = e.venueName?.toLowerCase().trim() ?? "";
        const venueByName = !venueFromCache && nameKey
          ? venueNameIndex.get(nameKey)
          : undefined;
        // Try substring match if exact fails
        let venueBySubstring: Venue | undefined;
        if (!venueFromCache && !venueByName && nameKey.length > 3) {
          const match = venueNamesList.find(
            (v) => v.key.includes(nameKey) || nameKey.includes(v.key)
          );
          venueBySubstring = match?.venue;
        }
        const matchedVenue = venueFromCache ?? venueByName ?? venueBySubstring;

        // Use event's own lat/lng if available and venue wasn't matched
        const eventLat = parseFloat(e.lat) || 0;
        const eventLng = parseFloat(e.lng) || 0;

        const baseVenue: Venue = matchedVenue ?? {
          id: String(e.venueId ?? e.id),
          name: e.venueName ?? "Unknown Venue",
          type: "venue",
          neighborhood: "",
          city: "",
          lat: eventLat,
          lng: eventLng,
          hasMusic: false,
          musicScore: 0,
        };

        // Ensure city is populated — prefer venue's city, fallback to event-level city
        const venue: Venue = {
          ...baseVenue,
          city: baseVenue.city || e.city || "",
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
    ? [...new Set(events.map((e) => e.genre).filter(Boolean))]
    : [];
  return genres;
};
