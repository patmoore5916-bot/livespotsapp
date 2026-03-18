import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, addMonths } from "date-fns";

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
  if (isTomorrow(d)) return "today";
  return "this-week";
}

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues"],
    queryFn: async (): Promise<Venue[]> => {
      const { data, error } = await supabase.from("venues").select("*");
      if (error) throw error;
      return (data ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        type: v.type as VenueType,
        neighborhood: v.neighborhood,
        city: v.city,
        lat: v.lat,
        lng: v.lng,
      }));
    },
    staleTime: 1000 * 60 * 15,
  });
};

export const useEvents = () => {
  return useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<Event[]> => {
      const today = format(new Date(), "yyyy-MM-dd");
      const twoMonthsOut = format(addMonths(new Date(), 2), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("events")
        .select("*, venues(*)")
        .gte("date", today)
        .lte("date", twoMonthsOut)
        .order("date", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((e) => {
        const v = e.venues as any;
        const venue: Venue = v
          ? { id: v.id, name: v.name, type: v.type, neighborhood: v.neighborhood, city: v.city, lat: v.lat, lng: v.lng }
          : { id: e.venue_id, name: "Unknown Venue", type: "venue", neighborhood: "", city: "", lat: 0, lng: 0 };

        return {
          id: e.id,
          venue,
          artist: e.artist,
          genre: e.genre,
          date: e.date,
          doorsAt: e.doors_at,
          startTime: e.start_time,
          status: deriveStatus(e.date),
          ticketUrl: e.ticket_url ?? undefined,
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
