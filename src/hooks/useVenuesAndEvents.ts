import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { isToday, isTomorrow, differenceInDays, format } from "date-fns";
import { formatLabel, formatTime } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";

/* ────────────────────────────────────────────────────────
   API helpers
   ──────────────────────────────────────────────────────── */

const PAGE_SIZE = 200;
const MAX_ITEMS = 1000; // hard cap — 5 pages max
const MAX_PAGES = Math.ceil(MAX_ITEMS / PAGE_SIZE);

type ManusPageResponse = {
  data?: any[];
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    returned?: number;
  };
  apiDown?: boolean;
  error?: string;
  upstreamStatus?: number | null;
};

const isApiDownPayload = (value: unknown): value is ManusPageResponse & { apiDown: true } => {
  return typeof value === "object" && value !== null && (value as { apiDown?: boolean }).apiDown === true;
};

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

  const text = await res.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
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

  return payload as ManusPageResponse;
};

/** Fetch up to MAX_ITEMS for a given endpoint (venues or events). */
const fetchCapped = async (endpoint: "venues" | "events"): Promise<any[]> => {
  const all: any[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const json = await fetchManusPage(endpoint, PAGE_SIZE, offset);
    const items = json.data ?? [];
    all.push(...items);

    const total = json.meta?.total ?? 0;
    offset += PAGE_SIZE;
    if (all.length >= MAX_ITEMS || offset >= total || items.length < PAGE_SIZE) break;
  }

  return all.slice(0, MAX_ITEMS);
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
   useVenues — capped at 1,000, cached 24h via react-query persist
   ──────────────────────────────────────────────────────── */

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues", "manus-v4"],
    queryFn: async (): Promise<Venue[]> => {
      try {
        const raw = await fetchCapped("venues");

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
        
        return venues;
      } catch (err) {
        console.warn("Manus API failed, falling back to database:", err);
        const { data, error } = await supabase.from("venues").select("*");
        if (error) throw error;
        const venues: Venue[] = (data ?? []).map((v) => ({
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
        return venues;
      }
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 2,
  });
};

/* ────────────────────────────────────────────────────────
   useEvents
   ──────────────────────────────────────────────────────── */

export const useEvents = () => {
  const { data: venuesData } = useVenues();

  return useQuery({
    queryKey: ["events", "manus-v4"],
    enabled: (!!venuesData && venuesData.length > 0) || venueCache.size > 0,
    queryFn: async (): Promise<Event[]> => {
      try {
        const raw = await fetchCapped("events");

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

          const eventLat = parseFloat(e.lat ?? e.venue?.lat) || 0;
          const eventLng = parseFloat(e.lng ?? e.venue?.lng) || 0;

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

        
        return deduplicateEvents(rawEvents);
      } catch (err) {
        console.warn("Manus API failed for events, falling back to database:", err);
        const { data, error } = await supabase
          .from("events")
          .select("*, venues(*)");
        if (error) throw error;
        const events: Event[] = (data ?? []).map((e) => {
          const v = (e as any).venues;
          const venue: Venue = v ? {
            id: v.id,
            name: v.name,
            type: v.type as VenueType,
            neighborhood: v.neighborhood ?? "",
            city: v.city ?? "",
            lat: v.lat,
            lng: v.lng,
            hasMusic: false,
            musicScore: 0,
          } : {
            id: e.venue_id,
            name: "Unknown Venue",
            type: "venue",
            neighborhood: "",
            city: "",
            lat: 0,
            lng: 0,
            hasMusic: false,
            musicScore: 0,
          };
          const { status, label } = deriveStatus(e.date);
          return {
            id: e.id,
            venue,
            artist: e.artist,
            genre: formatLabel(e.genre),
            date: e.date,
            doorsAt: e.doors_at ? formatTime(e.doors_at.slice(0, 5)) : "",
            startTime: e.start_time ? formatTime(e.start_time.slice(0, 5)) : "",
            status,
            statusLabel: label,
            ticketUrl: e.ticket_url ?? undefined,
          };
        });
        return deduplicateEvents(events);
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 2,
  });
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
