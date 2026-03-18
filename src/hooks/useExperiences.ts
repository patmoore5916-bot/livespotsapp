import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ExperiencePost = Tables<"experience_posts">;

export const useExperiencePosts = (venueId?: string | null) => {
  return useQuery({
    queryKey: ["experience-posts", venueId],
    queryFn: async () => {
      let query = supabase
        .from("experience_posts")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (venueId) {
        query = query.eq("venue_id", venueId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const uploadExperienceVideo = async (
  userId: string,
  file: File
): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("experiences")
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from("experiences").getPublicUrl(path);
  return data.publicUrl;
};

export const createExperiencePost = async (post: {
  user_id: string;
  venue_id: string;
  video_url: string;
  caption?: string;
}) => {
  const { data, error } = await supabase
    .from("experience_posts")
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data;
};
