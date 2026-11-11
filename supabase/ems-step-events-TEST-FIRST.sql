-- TEST FIRST. EMS step audit trail, non-destructive.
CREATE TABLE IF NOT EXISTS public.ems_step_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 ems_case_id bigint NOT NULL REFERENCES public.ems_cases(id) ON DELETE CASCADE,
 step_key text NOT NULL,
 completed_at timestamptz NOT NULL DEFAULT now(),
 completed_by uuid NOT NULL DEFAULT auth.uid(),
 notes text NOT NULL DEFAULT '',
 attachment_path text,
 UNIQUE(ems_case_id,step_key)
);
CREATE INDEX IF NOT EXISTS ems_step_events_case_idx ON public.ems_step_events(ems_case_id);
ALTER TABLE public.ems_step_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ems_step_events_read ON public.ems_step_events;
CREATE POLICY ems_step_events_read ON public.ems_step_events FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.user_id=auth.uid() AND u.is_active=true));
DROP POLICY IF EXISTS ems_step_events_insert ON public.ems_step_events;
CREATE POLICY ems_step_events_insert ON public.ems_step_events FOR INSERT TO authenticated
 WITH CHECK (completed_by=auth.uid() AND EXISTS
 (SELECT 1 FROM public.user_profiles u WHERE u.user_id=auth.uid() AND u.is_active=true));
-- Note: permissions for ems_cases updates continue to use existing RLS policies.
