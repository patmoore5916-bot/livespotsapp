import { useQuery } from "@tanstack/react-query";
import { isToday, isTomorrow, differenceInDays, format } from "date-fns";
import { formatLabel, formatTime } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useUserLocation } from "@/hooks/useUserLocation";

/* ────────────────────────────────────────────────────────
   Unified Feed API (venues + events in one call, sorted by distance)
   ──────────────────────────────────────────────────────── */

type FeedResponse = {
  events?: any[];
  meta?: Record<string, unknown>;
  apiDown?: boolean;
  error?: string;
  upstreamStatus?: number | null;
};

const isApiDownPayload = (value: unknown): value is FeedResponse & { apiDown: true } => {
  return typeof value === "object" && value !== null && (value as { apiDown?: boolean }).apiDown === true;
};

const fetchFeed = async (params: { lat?: number; lng?: number; radius?: number; state?: string }): Promise<FeedResponse> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const qs = new URLSearchParams({ endpoint: "feed" });
  if (params.lat != null && params.lng != null) {
    qs.set("lat", String(params.lat));
    qs.set("lng", String(params.lng));
    qs.set("radius", String(params.radius ?? 25));
  } else {
    qs.set("state", params.state ?? "NC");
  }

  const url = `${supabaseUrl}/functions/v1/manus-proxy?${qs.toString()}`;

  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }

  if (!res.ok) {
    if (isApiDownPayload(payload)) {
      throw new Error(payload.error ?? "Manus API unavailable");
    }
    throw new Error(`Proxy error ${res.status}: ${text}`);
  }
  if (isApiDownPayload(payload)) {
    throw new Error(payload.error ?? "Manus API unavailable");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Proxy returned an invalid response");
  }

  return payload as FeedResponse;
};

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

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
  showTimes?: string[];
  status: EventStatus;
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

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

function deriveStatus(dateStr: string): { status: EventStatus; label: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (isToday(d)) return { status: "today", label: "Today" };
  if (isTomorrow(d)) return { status: "tomorrow", label: "Tomorrow" };

  const days = differenceInDays(d, now);
  if (days >= 0 && days <= 7) return { status: "this-week", label: "This Week" };

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

/* ────────────────────────────────────────────────────────
   Venue index (for event → venue matching)
   ──────────────────────────────────────────────────────── */

let venueCache = new Map<string, Venue>();
let venueNameIndex = new Map<string, Venue>();
let venueNamesList: { key: string; venue: Venue }[] = [];

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

/* ────────────────────────────────────────────────────────
   Unified feed query — single fetch returns venues + events
   ──────────────────────────────────────────────────────── */

interface FeedResult {
  venues: Venue[];
  events: Event[];
}

/** Single shared query — fetches the unified feed (venues + events) in one call. */
const useFeed = () => {
  const { location } = useUserLocation();

  return useQuery<FeedResult>({
    queryKey: ["feed", "manus-v5", location?.lat ?? null, location?.lng ?? null],
    queryFn: async (): Promise<FeedResult> => {
      try {
        const json = await fetchFeed(
          location ? { lat: location.lat, lng: location.lng, radius: 25 } : { state: "NC" }
        );

        const rawEvents = json.events ?? [];
        const venuesById = new Map<string, Venue>();
        const events: Event[] = [];

        for (const e of rawEvents) {
          if (!e.eventDate) continue;
          const v = e.venue ?? {};
          const lat = parseFloat(v.lat ?? e.lat) || 0;
          const lng = parseFloat(v.lng ?? e.lng) || 0;

          const venueId = String(v.id ?? e.venueId ?? e.id);
          const venueType = v.venueType ?? "";
          const vibeTags: string[] = v.vibeTags ?? [];
          const hasMusicType = isMusical(venueType, vibeTags);

          const venue: Venue = {
            id: venueId,
            name: v.name ?? e.venueName ?? "Unknown Venue",
            type: mapVenueType(venueType),
            neighborhood: v.address ?? "",
            city: v.city ?? e.city ?? "",
            lat,
            lng,
            hasMusic: hasMusicType || true, // events imply live music
            musicScore: hasMusicType ? 0.9 : 0.5,
          };

          if (lat && lng && !venuesById.has(venueId)) {
            venuesById.set(venueId, venue);
          }

          const { status, label } = deriveStatus(e.eventDate);
          const rawGenre = e.genre ?? (e.eventCategory === "live_music" ? "Live Music" : (e.eventCategory ?? "Other"));

          events.push({
            id: String(e.id),
            venue,
            artist: e.bandName ?? "TBA",
            genre: formatLabel(rawGenre),
            date: e.eventDate,
            doorsAt: e.doorsAt ? formatTime(String(e.doorsAt).slice(0, 5)) : "",
            startTime: e.startTime ?? "",
            status,
            statusLabel: label,
            ticketUrl: e.ticketUrl ?? undefined,
          });
        }

        const venues = Array.from(venuesById.values());
        hydrateVenueIndex(venues);
        return { venues, events: deduplicateEvents(events) };
      } catch (err) {
        console.warn("Feed API failed, falling back to database:", err);
        const [{ data: vData }, { data: eData }] = await Promise.all([
          supabase.from("venues").select("*"),
          supabase.from("events").select("*, venues(*)"),
        ]);
        const venues: Venue[] = (vData ?? []).map((v) => ({
          id: v.id,
          name: v.name,
          type: v.type as VenueType,
          neighborhood: v.neighborhood ?? "",
          city: v.city ?? "",
          lat: v.lat,
          lng: v.lng,
          hasMusic: false,
          musicScore: 0,
        }));
        hydrateVenueIndex(venues);
        const events: Event[] = (eData ?? []).map((e) => {
          const v = (e as any).venues;
          const venue: Venue = v ? {
            id: v.id, name: v.name, type: v.type as VenueType,
            neighborhood: v.neighborhood ?? "", city: v.city ?? "",
            lat: v.lat, lng: v.lng, hasMusic: false, musicScore: 0,
          } : {
            id: e.venue_id, name: "Unknown Venue", type: "venue",
            neighborhood: "", city: "", lat: 0, lng: 0, hasMusic: false, musicScore: 0,
          };
          const { status, label } = deriveStatus(e.date);
          return {
            id: e.id, venue, artist: e.artist, genre: formatLabel(e.genre), date: e.date,
            doorsAt: e.doors_at ? formatTime(e.doors_at.slice(0, 5)) : "",
            startTime: e.start_time ? formatTime(e.start_time.slice(0, 5)) : "",
            status, statusLabel: label, ticketUrl: e.ticket_url ?? undefined,
          };
        });
        return { venues, events: deduplicateEvents(events) };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — feed is location-sensitive
    gcTime: 1000 * 60 * 60 * 24, // 1 day
    retry: 1,
  });
};

export const useVenues = () => {
  const q = useFeed();
  return { ...q, data: q.data?.venues ?? [] };
};

export const useEvents = () => {
  const q = useFeed();
  return { ...q, data: q.data?.events ?? [] };
};

/* ────────────────────────────────────────────────────────
   Deduplication
   ──────────────────────────────────────────────────────── */

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
