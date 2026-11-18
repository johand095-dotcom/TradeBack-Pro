-- One-time LIVE wording correction for Sales Controller Step 36.
-- This does not change step status, assignments or completion history.
UPDATE public.pdi_step_templates
SET activity = replace(activity, 'Sales Admin', 'Sales Controller')
WHERE step_no = 36 AND activity ILIKE '%Sales Admin%';

UPDATE public.pdi_case_steps
SET activity = replace(activity, 'Sales Admin', 'Sales Controller')
WHERE step_no = 36 AND activity ILIKE '%Sales Admin%';

SELECT step_no, activity, responsible_role FROM public.pdi_step_templates WHERE step_no=36;
