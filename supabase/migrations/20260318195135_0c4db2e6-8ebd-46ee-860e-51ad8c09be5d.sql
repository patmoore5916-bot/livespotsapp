
-- Venue type enum
CREATE TYPE public.venue_type AS ENUM ('venue', 'bar', 'brewery', 'club');

-- Event status enum
CREATE TYPE public.event_status AS ENUM ('live', 'today', 'this-week');

-- Venues table
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type venue_type NOT NULL DEFAULT 'venue',
  neighborhood TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  artist TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT '',
  doors_at TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL DEFAULT '',
  status event_status NOT NULL DEFAULT 'today',
  ticket_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: publicly readable
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view venues" ON public.venues FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT TO public USING (true);

-- Operators can manage venues and events
CREATE POLICY "Operators can insert venues" ON public.venues FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Operators can update venues" ON public.venues FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Operators can delete venues" ON public.venues FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Operators can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Operators can delete events" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'operator'));
