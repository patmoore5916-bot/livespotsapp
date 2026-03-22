import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { isToday, isTomorrow, differenceInDays, format, parseISO } from "date-fns";
import { formatLabel, formatTime } from "@/lib/formatters";

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
export type EventStatus = "live" | "today" | "tomorrow" | "this-week" | "upcoming";

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  hasMusic: boolean;
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
  /** Multiple show times when duplicates are grouped */
  showTimes?: string[];
  status: EventStatus;
  /** Human-readable status label */
  statusLabel: string;
  ticketUrl?: string;
}

export const statusColors = {
  live: { bg: "#EF4444", glow: "rgba(239,68,68,0.5)", label: "Live Now" },
  today: { bg: "#F59E0B", glow: "rgba(245,158,11,0.4)", label: "Today" },
  tomorrow: { bg: "#818CF8", glow: "rgba(129,140,248,0.35)", label: "Tomorrow" },
  "this-week": { bg: "#6366F1", glow: "rgba(99,102,241,0.35)", label: "This Week" },
  upcoming: { bg: "#64748B", glow: "rgba(100,116,139,0.25)", label: "Upcoming" },
} as const;

function deriveStatus(dateStr: string): { status: EventStatus; label: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (isToday(d)) return { status: "today", label: "Today" };
  if (isTomorrow(d)) return { status: "tomorrow", label: "Tomorrow" };

  const days = differenceInDays(d, now);
  if (days >= 0 && days <= 7) return { status: "this-week", label: "This Week" };

  // Far future — show actual date
  return { status: "upcoming", label: format(d, "MMM d") };
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

const LS_VENUES_KEY = "livespots_venues_v1";
const LS_EVENTS_KEY = "livespots_events_v1";
const LS_VENUES_TS = "livespots_venues_ts";
const LS_EVENTS_TS = "livespots_events_ts";
const VENUE_CACHE_TTL = 1000 * 60 * 60 * 24 * 7;
const EVENT_CACHE_TTL = 1000 * 60 * 60 * 2;

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
  } catch { /* storage full */ }
}

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
    placeholderData: cachedVenues ?? keepPreviousData,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 2,
  });
};

export const useEvents = () => {
  const { data: venuesData } = useVenues();

  return useQuery({
    queryKey: ["events", "manus-v3"],
    enabled: (!!venuesData && venuesData.length > 0) || venueCache.size > 0,
    queryFn: async (): Promise<Event[]> => {
      const raw = await fetchAllPages("events");

      // First pass: build all events
      const rawEvents: Event[] = [];
      for (const e of raw) {
        if (!e.eventDate) continue;

        const venueFromCache = e.venueId ? venueCache.get(String(e.venueId)) : undefined;
        const nameKey = e.venueName?.toLowerCase().trim() ?? "";
        const venueByName = !venueFromCache && nameKey ? venueNameIndex.get(nameKey) : undefined;
        let venueBySubstring: Venue | undefined;
        if (!venueFromCache && !venueByName && nameKey.length > 3) {
          const match = venueNamesList.find(
            (v) => v.key.includes(nameKey) || nameKey.includes(v.key)
          );
          venueBySubstring = match?.venue;
        }
        const matchedVenue = venueFromCache ?? venueByName ?? venueBySubstring;

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

        const venue: Venue = {
          ...baseVenue,
          city: baseVenue.city || e.city || "",
        };

        const { status, label } = deriveStatus(e.eventDate);
        const rawGenre = e.eventCategory === "live_music" ? "Live Music" : (e.eventCategory ?? "Other");

        rawEvents.push({
          id: String(e.id),
          venue,
          artist: e.bandName ?? "TBA",
          genre: formatLabel(rawGenre),
          date: e.eventDate,
          doorsAt: e.doorsAt ? formatTime(e.doorsAt.slice(0, 5)) : "",
          startTime: e.startTime ? formatTime(e.startTime.slice(0, 5)) : "",
          status,
          statusLabel: label,
          ticketUrl: e.ticketUrl ?? undefined,
        });
      }

      // BUG 7: Deduplicate — group same artist + venue + date into one card with multiple times
      const deduped = deduplicateEvents(rawEvents);

      writeCache(LS_EVENTS_KEY, LS_EVENTS_TS, deduped);
      return deduped;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    placeholderData: readCache<Event[]>(LS_EVENTS_KEY, LS_EVENTS_TS, EVENT_CACHE_TTL) ?? keepPreviousData,
    retry: 2,
  });
};

/** Group duplicate events (same artist + venue + date) into single cards with multiple show times */
function deduplicateEvents(events: Event[]): Event[] {
  const groups = new Map<string, Event[]>();

  for (const e of events) {
    const key = `${e.artist.toLowerCase()}|${e.venue.id}|${e.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const result: Event[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      // Merge: keep first event, collect all unique times
      const primary = { ...group[0] };
      const times = [...new Set(group.map((e) => e.startTime).filter(Boolean))];
      primary.showTimes = times.length > 1 ? times : undefined;
      result.push(primary);
    }
  }

  return result;
}

export const useGenres = () => {
  const { data: events } = useEvents();
  const genres = events
    ? [...new Set(events.map((e) => e.genre).filter(Boolean))]
    : [];
  return genres;
};
