-- READ ONLY. Run in TEST Supabase SQL Editor. No data changes.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('complete_pdi_step','create_pdi_case_steps','initialize_pdi_case_steps')
ORDER BY p.proname;

SELECT table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema='public'
 AND table_name IN ('pdi_case_steps','pdi_step_templates','pdi_cases')
 AND column_name IN ('id','step_no','step_status','current_step','current_phase','responsible_role','completed_at','completed_by_name','comments')
ORDER BY table_name,column_name;

SELECT step_no,phase_no,activity,responsible_role
FROM public.pdi_step_templates
WHERE step_no BETWEEN 11 AND 13 ORDER BY step_no;