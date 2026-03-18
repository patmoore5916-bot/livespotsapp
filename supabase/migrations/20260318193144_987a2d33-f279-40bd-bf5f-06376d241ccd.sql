-- Storage bucket for experience videos
INSERT INTO storage.buckets (id, name, public) VALUES ('experiences', 'experiences', true);

-- Allow anyone to view experience videos
CREATE POLICY "Experience videos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'experiences');

-- Authenticated users can upload videos
CREATE POLICY "Authenticated users can upload experience videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'experiences');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own experience videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'experiences' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Experience posts table
CREATE TABLE public.experience_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  venue_id TEXT NOT NULL,
  caption TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.experience_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view non-expired posts
CREATE POLICY "Anyone can view active experience posts"
  ON public.experience_posts FOR SELECT
  USING (expires_at > now());

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create experience posts"
  ON public.experience_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own experience posts"
  ON public.experience_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for efficient querying
CREATE INDEX idx_experience_posts_venue ON public.experience_posts(venue_id);
CREATE INDEX idx_experience_posts_expires ON public.experience_posts(expires_at);