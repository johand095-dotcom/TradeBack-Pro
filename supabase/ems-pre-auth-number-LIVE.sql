-- ELT EMS LIVE migration: optional pre-authorisation / authorisation reference.
-- Non-destructive, idempotent. Run once in LIVE Supabase SQL Editor before testing branch.
BEGIN;
ALTER TABLE public.ems_cases ADD COLUMN IF NOT EXISTS pre_auth_number text;
COMMENT ON COLUMN public.ems_cases.pre_auth_number IS
 'Editable pre-authorisation or final authorisation reference for client EMS reporting.';
COMMIT;
-- Verify:
-- SELECT column_name,data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='ems_cases' AND column_name='pre_auth_number';
