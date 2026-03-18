import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues"],
    queryFn: async (): Promise<Venue[]> => {
      const { data, error } = await supabase
        .from("venues")
        .select("*");
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
  });
};

export const useEvents = () => {
  return useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*, venues(*)")
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        venue: {
          id: e.venues.id,
          name: e.venues.name,
          type: e.venues.type as VenueType,
          neighborhood: e.venues.neighborhood,
          city: e.venues.city,
          lat: e.venues.lat,
          lng: e.venues.lng,
        },
        artist: e.artist,
        genre: e.genre,
        doorsAt: e.doors_at,
        startTime: e.start_time,
        status: e.status as EventStatus,
        ticketUrl: e.ticket_url,
      }));
    },
  });
};

export const useGenres = () => {
  const { data: events } = useEvents();
  const genres = events ? ["All", ...new Set(events.map((e) => e.genre).filter(Boolean))] : ["All"];
  return genres;
};
