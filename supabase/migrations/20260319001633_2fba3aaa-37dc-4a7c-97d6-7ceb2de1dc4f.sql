
-- Function: get total user count
CREATE OR REPLACE FUNCTION public.get_user_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM auth.users;
$$;

-- Function: get genre popularity (aggregated from user_preferences)
CREATE OR REPLACE FUNCTION public.get_genre_stats()
RETURNS TABLE(genre text, user_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unnest(genres) AS genre, count(*) AS user_count
  FROM public.user_preferences
  GROUP BY genre
  ORDER BY user_count DESC;
$$;

-- Function: get venue popularity by experience post count
CREATE OR REPLACE FUNCTION public.get_venue_post_stats()
RETURNS TABLE(venue_id text, venue_name text, post_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ep.venue_id, v.name AS venue_name, count(*) AS post_count
  FROM public.experience_posts ep
  LEFT JOIN public.venues v ON v.id::text = ep.venue_id
  GROUP BY ep.venue_id, v.name
  ORDER BY post_count DESC
  LIMIT 20;
$$;

-- Function: get event count by status
CREATE OR REPLACE FUNCTION public.get_event_status_stats()
RETURNS TABLE(status text, event_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status::text, count(*) AS event_count
  FROM public.events
  GROUP BY status;
$$;
