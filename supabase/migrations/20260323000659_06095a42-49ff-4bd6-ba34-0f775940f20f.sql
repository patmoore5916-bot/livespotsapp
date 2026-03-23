
CREATE TABLE public.ticket_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  venue_id text NOT NULL,
  artist text NOT NULL,
  original_url text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  referrer text
);

ALTER TABLE public.ticket_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a click (anonymous or authenticated)
CREATE POLICY "Anyone can log ticket clicks"
  ON public.ticket_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can read their own clicks
CREATE POLICY "Users can read own clicks"
  ON public.ticket_clicks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
