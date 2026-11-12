-- READ-ONLY preflight for adding "COF Done" immediately before existing PDI Step 35.
-- Run in LIVE SQL Editor and share results before any step renumbering.
SELECT step_no,phase_no,activity,responsible_role,target_hours
FROM public.pdi_step_templates
WHERE step_no BETWEEN 32 AND 38 ORDER BY step_no;
SELECT column_name,data_type,is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('pdi_step_templates','pdi_case_steps','pdi_cases')
 AND column_name IN ('step_no','current_step','phase_no','activity','responsible_role','target_hours')
ORDER BY table_name,column_name;
SELECT tc.table_name,tc.constraint_name,tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema='public' AND tc.table_name IN ('pdi_step_templates','pdi_case_steps')
ORDER BY tc.table_name,tc.constraint_name;
