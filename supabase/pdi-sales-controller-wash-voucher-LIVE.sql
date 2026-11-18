-- ELT PDI Sales Controller transition (LIVE migration; review before running).
-- Account ab@eltgroup.co.za must FIRST be invited/created in Supabase Authentication.
-- No passwords are created or changed by this migration.
DO $$
DECLARE v_controller uuid;
BEGIN
 SELECT id INTO v_controller FROM auth.users WHERE lower(email)='ab@eltgroup.co.za';
 IF v_controller IS NULL THEN RAISE EXCEPTION 'Create/invite ab@eltgroup.co.za in Authentication first'; END IF;
 INSERT INTO public.user_profiles(user_id,email,full_name,roles,is_admin,is_active)
 VALUES(v_controller,'ab@eltgroup.co.za','Sales Controller',ARRAY['Sales Controller']::text[],false,true)
 ON CONFLICT (user_id) DO UPDATE SET
   roles=CASE WHEN 'Sales Controller'=ANY(public.user_profiles.roles)
     THEN public.user_profiles.roles
     ELSE array_append(coalesce(public.user_profiles.roles,ARRAY[]::text[]),'Sales Controller') END,
   is_active=true;
END $$;

-- Reassign existing and future workflow steps.
UPDATE public.pdi_step_templates SET responsible_role='Sales Controller'
WHERE step_no IN (20,36,39,41);
UPDATE public.pdi_case_steps SET responsible_role='Sales Controller',updated_at=now()
WHERE step_no IN (20,36,39,41) AND step_status='Pending';

-- A voucher is an immutable, vehicle-linked record; messages are dispatched
-- through the existing PDI inbox RPC after voucher creation.
CREATE TABLE IF NOT EXISTS public.pdi_final_wash_vouchers (
 id bigint generated always as identity primary key,
 pdi_case_id bigint not null references public.pdi_cases(id),
 voucher_number text unique,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 qc_user_id uuid not null references auth.users(id),
 notes text,
 message_sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS pdi_wash_vouchers_case_idx
 ON public.pdi_final_wash_vouchers(pdi_case_id,created_at desc);
ALTER TABLE public.pdi_final_wash_vouchers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pdi_final_wash_vouchers FROM anon,authenticated;
GRANT SELECT ON public.pdi_final_wash_vouchers TO authenticated;
DROP POLICY IF EXISTS "View wash vouchers for PDI users" ON public.pdi_final_wash_vouchers;
CREATE POLICY "View wash vouchers for PDI users"
 ON public.pdi_final_wash_vouchers FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.user_profiles u
 WHERE u.user_id=auth.uid() AND u.is_active=true));

CREATE OR REPLACE FUNCTION public.pdi_create_final_wash_voucher(
 p_case_id bigint,p_notes text DEFAULT NULL
) RETURNS TABLE(voucher_id bigint,voucher_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor uuid:=auth.uid();v_qc uuid;v_id bigint;v_roles text[];
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT roles INTO v_roles FROM public.user_profiles
 WHERE user_id=v_actor AND is_active=true;
 IF NOT FOUND OR NOT (
  EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=v_actor AND is_active=true AND is_admin=true)
  OR EXISTS(SELECT 1 FROM unnest(coalesce(v_roles,ARRAY[]::text[])) role
     WHERE lower(trim(role))='sales controller')
 ) THEN RAISE EXCEPTION 'Sales Controller access required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pdi_cases WHERE id=p_case_id AND vin IS NOT NULL)
 THEN RAISE EXCEPTION 'Vehicle not found'; END IF;
 SELECT id INTO v_qc FROM auth.users WHERE lower(email)='gerhardg@eltgroup.co.za';
 IF v_qc IS NULL THEN RAISE EXCEPTION 'QC account gerhardg@eltgroup.co.za not found'; END IF;
 INSERT INTO public.pdi_final_wash_vouchers(pdi_case_id,created_by,qc_user_id,notes)
 VALUES(p_case_id,v_actor,v_qc,left(nullif(trim(p_notes),''),2000))
 RETURNING id INTO v_id;
 UPDATE public.pdi_final_wash_vouchers v SET voucher_number='FWV-'||lpad(v_id::text,6,'0')
 WHERE v.id=v_id;
 RETURN QUERY SELECT v_id,('FWV-'||lpad(v_id::text,6,'0'))::text;
END $$;
REVOKE ALL ON FUNCTION public.pdi_create_final_wash_voucher(bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pdi_create_final_wash_voucher(bigint,text) TO authenticated;
