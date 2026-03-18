
CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',
  venues_upserted INTEGER NOT NULL DEFAULT 0,
  events_upserted INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  triggered_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view sync logs" ON public.sync_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators can insert sync logs" ON public.sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators can update sync logs" ON public.sync_logs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));
