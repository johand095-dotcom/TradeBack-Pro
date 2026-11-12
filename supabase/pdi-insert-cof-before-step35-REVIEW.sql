-- LIVE PDI: COF Done as first Phase 4 step. REVIEW BEFORE RUNNING.
-- This migration renumbers existing steps 35+ and preserves their IDs/history.
-- Run only after verifying mandatory columns in pdi_case_steps and taking a backup.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.pdi_step_templates WHERE step_no=35 AND phase_no=4 AND activity ILIKE '%inspected by the Sales Admin%') THEN
   RAISE EXCEPTION 'Unexpected Step 35 or migration already applied. No changes made.';
 END IF;
 IF EXISTS (SELECT 1 FROM public.pdi_step_templates WHERE step_no>=1000)
    OR EXISTS (SELECT 1 FROM public.pdi_case_steps WHERE step_no>=1000) THEN
   RAISE EXCEPTION 'Temporary step number range 1000+ is in use. No changes made.';
 END IF;
END $$;
-- Move existing steps temporarily out of the unique key range.
UPDATE public.pdi_case_steps SET step_no=step_no+1000 WHERE step_no>=35;
UPDATE public.pdi_step_templates SET step_no=step_no+1000 WHERE step_no>=35;
UPDATE public.pdi_step_templates SET step_no=step_no-999 WHERE step_no>=1035;
UPDATE public.pdi_case_steps SET step_no=step_no-999 WHERE step_no>=1035;
-- Shift pointers to the same historical activity.
UPDATE public.pdi_cases SET current_step=current_step+1 WHERE current_step>=35;
-- New template. Insertion order is now 34, 35 (COF), 36 (old 35), etc.
INSERT INTO public.pdi_step_templates(step_no,phase_no,activity,responsible_role,target_hours)
VALUES (35,4,'COF Done','Sales Admin',2);
-- Existing vehicle cases that have step rows receive a pending COF step.
-- Existing completion data stays attached to the original row IDs.
INSERT INTO public.pdi_case_steps(pdi_case_id,step_no,phase_no,activity,responsible_role,step_status)
SELECT DISTINCT s.pdi_case_id,35,4,'COF Done','Sales Admin','Pending'
FROM public.pdi_case_steps s
WHERE NOT EXISTS (
 SELECT 1 FROM public.pdi_case_steps x WHERE x.pdi_case_id=s.pdi_case_id AND x.step_no=35
);
COMMIT;
-- Verification after commit:
-- SELECT step_no,phase_no,activity,responsible_role FROM public.pdi_step_templates WHERE step_no BETWEEN 34 AND 39 ORDER BY step_no;
