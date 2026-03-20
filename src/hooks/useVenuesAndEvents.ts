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

// --- LocalStorage persistence helpers ---
const LS_VENUES_KEY = "livespots_venues_v1";
const LS_EVENTS_KEY = "livespots_events_v1";
const LS_VENUES_TS = "livespots_venues_ts";
const LS_EVENTS_TS = "livespots_events_ts";
const VENUE_CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const EVENT_CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

function readCache<T>(key: string, tsKey: string, ttl: number): T | undefined {
  try {
    const ts = localStorage.getItem(tsKey);
    if (!ts || Date.now() - Number(ts) > ttl) return undefined;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, tsKey: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(tsKey, String(Date.now()));
  } catch { /* storage full — non-critical */ }
}

// Hydrate venueCache from localStorage on module load
function hydrateVenueIndex(venues: Venue[]) {
  venueCache = new Map();
  venueNameIndex = new Map();
  venueNamesList = [];
  for (const venue of venues) {
    venueCache.set(venue.id, venue);
    const key = venue.name?.toLowerCase().trim();
    if (key) {
      if (!venueNameIndex.has(key)) venueNameIndex.set(key, venue);
      venueNamesList.push({ key, venue });
    }
  }
}

// Try to hydrate from LS immediately so events can resolve venues even before fetch completes
const cachedVenues = readCache<Venue[]>(LS_VENUES_KEY, LS_VENUES_TS, VENUE_CACHE_TTL);
if (cachedVenues) hydrateVenueIndex(cachedVenues);

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues", "manus-v3"],
    queryFn: async (): Promise<Venue[]> => {
      const raw = await fetchAllPages("venues");

      const venues: Venue[] = [];
      for (const v of raw) {
        const lat = parseFloat(v.lat);
        const lng = parseFloat(v.lng);
        if (!lat || !lng) continue;

        const hasMusicType = isMusical(v.venueType ?? "", v.vibeTags ?? []);
        venues.push({
          id: String(v.id),
          name: v.name,
          type: mapVenueType(v.venueType ?? ""),
          neighborhood: v.zip ?? "",
          city: v.city ?? "",
          lat,
          lng,
          hasMusic: hasMusicType,
          musicScore: hasMusicType ? 0.7 : 0,
        });
      }

      hydrateVenueIndex(venues);
      writeCache(LS_VENUES_KEY, LS_VENUES_TS, venues);
      return venues;
    },
    // Serve cached LS data instantly while refetching in background
    placeholderData: cachedVenues ?? keepPreviousData,
    staleTime: 1000 * 60 * 60, // 1 hour before considered stale
    gcTime: 1000 * 60 * 60 * 24, // keep in memory 24h
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

      writeCache(LS_EVENTS_KEY, LS_EVENTS_TS, events);
      return events;
    },
    staleTime: 1000 * 60 * 30, // 30 min
    gcTime: 1000 * 60 * 60 * 4, // 4h in memory
    placeholderData: readCache<Event[]>(LS_EVENTS_KEY, LS_EVENTS_TS, EVENT_CACHE_TTL) ?? keepPreviousData,
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
