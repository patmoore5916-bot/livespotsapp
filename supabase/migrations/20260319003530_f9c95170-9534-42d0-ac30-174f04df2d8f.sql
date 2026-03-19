CREATE TABLE IF NOT EXISTS public.show_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  venue_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT '',
  event_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '',
  ticket_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.show_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own show submissions" ON public.show_submissions;
CREATE POLICY "Users can insert own show submissions"
ON public.show_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own show submissions" ON public.show_submissions;
CREATE POLICY "Users can view own show submissions"
ON public.show_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pending show submissions" ON public.show_submissions;
CREATE POLICY "Users can delete own pending show submissions"
ON public.show_submissions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Operators can view all show submissions" ON public.show_submissions;
CREATE POLICY "Operators can view all show submissions"
ON public.show_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'operator'));

DROP POLICY IF EXISTS "Operators can update all show submissions" ON public.show_submissions;
CREATE POLICY "Operators can update all show submissions"
ON public.show_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator'));

CREATE INDEX IF NOT EXISTS idx_show_submissions_user_id ON public.show_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_show_submissions_status ON public.show_submissions(status);
CREATE INDEX IF NOT EXISTS idx_show_submissions_event_date ON public.show_submissions(event_date);