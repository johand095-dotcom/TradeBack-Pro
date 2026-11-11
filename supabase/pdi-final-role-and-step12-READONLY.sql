-- READ ONLY: inspect role authorization before expanding PDI Admin permissions.
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='can_complete_pdi_step';

-- Count legacy Step 12 records without modifying audit history.
SELECT step_status, count(*) AS records
FROM public.pdi_case_steps WHERE step_no=12
GROUP BY step_status ORDER BY step_status;

-- Identify vehicles currently positioned at Step 12.
SELECT workflow_status,current_phase,count(*) AS vehicles
FROM public.pdi_cases WHERE current_step=12
GROUP BY workflow_status,current_phase;
