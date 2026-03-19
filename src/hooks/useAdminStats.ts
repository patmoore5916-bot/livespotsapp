import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserCount = () =>
  useQuery({
    queryKey: ["admin_user_count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_count");
      if (error) throw error;
      return data as number;
    },
  });

export const useGenreStats = () =>
  useQuery({
    queryKey: ["admin_genre_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_genre_stats");
      if (error) throw error;
      return (data ?? []) as { genre: string; user_count: number }[];
    },
  });

export const useVenuePostStats = () =>
  useQuery({
    queryKey: ["admin_venue_post_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_venue_post_stats");
      if (error) throw error;
      return (data ?? []) as { venue_id: string; venue_name: string; post_count: number }[];
    },
  });

export const useEventStatusStats = () =>
  useQuery({
    queryKey: ["admin_event_status_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_event_status_stats");
      if (error) throw error;
      return (data ?? []) as { status: string; event_count: number }[];
    },
  });

export const useExperiencePostCount = () =>
  useQuery({
    queryKey: ["admin_experience_post_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("experience_posts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

export const useVenueCount = () =>
  useQuery({
    queryKey: ["admin_venue_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("venues")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

export const useEventCount = () =>
  useQuery({
    queryKey: ["admin_event_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
