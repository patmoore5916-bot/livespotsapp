import { useQuery } from "@tanstack/react-query";
import { ScraperService } from "@/services/ScraperService";
import { format, isToday, addMonths } from "date-fns";

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
  const d = new Date(dateStr + "T00:00:00");
  if (isToday(d)) return "today";
  return "this-week";
}

function venueTypeFromString(s?: string): VenueType {
  if (!s) return "venue";
  const lower = s.toLowerCase();
  if (lower.includes("bar")) return "bar";
  if (lower.includes("brew")) return "brewery";
  if (lower.includes("club")) return "club";
  return "venue";
}

function makeId(str: string, fallback: string): string {
  const slug = (str ?? "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
  return slug || fallback;
}

// Parse lat/lng safely — API returns them as strings
function toNum(v: any): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export const useVenues = () => {
  return useQuery({
    queryKey: ["manus-venues"],
    queryFn: async (): Promise<Venue[]> => {
      const raw = await ScraperService.fetchVenues();
      return raw
        .filter((v) => v.lat != null && v.lng != null && toNum(v.lat) !== 0 && toNum(v.lng) !== 0)
        .map((v, i) => ({
          id: makeId(v.name, String(i)),
          name: v.name,
          type: venueTypeFromString(v.venue_type),
          neighborhood: v.address ?? "",
          city: v.city ?? "",
          lat: toNum(v.lat),
          lng: toNum(v.lng),
        }));
    },
    staleTime: 1000 * 60 * 15,
  });
};

export const useEvents = () => {
  return useQuery({
    queryKey: ["manus-events"],
    queryFn: async (): Promise<Event[]> => {
      const [rawVenues, rawShows] = await Promise.all([
        ScraperService.fetchVenues(),
        ScraperService.fetchShows(),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const twoMonthsOut = format(addMonths(new Date(), 2), "yyyy-MM-dd");

      const venueMap = new Map(
        rawVenues.map((v, i) => [
          v.name.toLowerCase(),
          {
            id: makeId(v.name, String(i)),
            name: v.name,
            type: venueTypeFromString(v.venue_type),
            neighborhood: v.address ?? "",
            city: v.city ?? "",
            lat: toNum(v.lat),
            lng: toNum(v.lng),
          } as Venue,
        ])
      );

      return rawShows
        .filter((e) => e.date >= today && e.date <= twoMonthsOut)
        .map((e, i) => {
          const venueKey = (e.venue_name ?? "").toLowerCase();
          const matchedVenue: Venue = venueMap.get(venueKey) ?? {
            id: makeId(e.venue_name ?? "unknown", `venue-${i}`),
            name: e.venue_name ?? "Unknown Venue",
            type: "venue" as VenueType,
            neighborhood: "",
            city: "",
            lat: 0,
            lng: 0,
          };
          return {
            id: `${makeId(e.artist ?? "event", "evt")}-${i}`,
            venue: matchedVenue,
            artist: e.artist ?? "Unknown Artist",
            genre: e.genre ?? "",
            date: e.date,
            doorsAt: e.start_time ?? "",
            startTime: e.start_time ?? "",
            status: deriveStatus(e.date),
            ticketUrl: e.ticket_url,
          };
        });
    },
    staleTime: 1000 * 60 * 15,
  });
};

export const useGenres = () => {
  const { data: events } = useEvents();
  const genres = events
    ? ["All", ...new Set(events.map((e) => e.genre).filter(Boolean))]
    : ["All"];
  return genres;
};
