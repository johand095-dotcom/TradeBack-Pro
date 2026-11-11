-- PDI STEP 12 RETIREMENT + PDI ADMIN CONTROLLER PERMISSIONS
-- APPLY TO TEST FIRST. DO NOT RUN ON LIVE UNTIL TEST AND USER APPROVAL.
-- Existing pdi_case_steps rows are preserved for audit. Retired step 12 is excluded
-- from progression and cannot be newly completed. Original step numbers stay intact.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_complete_pdi_step(required_role text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  profile_record public.user_profiles;
  normalized_required_role text;
  user_roles text[];
BEGIN
  SELECT * INTO profile_record FROM public.user_profiles
  WHERE user_id = auth.uid() AND is_active = true;
  IF NOT FOUND THEN RETURN false; END IF;
  IF profile_record.is_admin IS TRUE THEN RETURN true; END IF;
  normalized_required_role := lower(trim(coalesce(required_role, '')));
  user_roles := coalesce(profile_record.roles, array[]::text[]);

  -- PDI Admin may complete PDI Controller and Driver steps.
  IF normalized_required_role IN ('pdi controller','driver')
     AND EXISTS (
       SELECT 1 FROM unnest(user_roles) AS role_name
       WHERE lower(trim(role_name)) = 'pdi admin'
     ) THEN RETURN true; END IF;

  -- Existing PDI Controller permission to complete Driver steps.
  IF normalized_required_role = 'driver'
     AND EXISTS (
       SELECT 1 FROM unnest(user_roles) AS role_name
       WHERE lower(trim(role_name)) = 'pdi controller'
     ) THEN RETURN true; END IF;

  RETURN EXISTS (
    SELECT 1 FROM unnest(user_roles) AS role_name
    WHERE lower(trim(role_name)) = normalized_required_role
       OR normalized_required_role LIKE '%' || lower(trim(role_name)) || '%'
       OR lower(trim(role_name)) LIKE '%' || normalized_required_role || '%'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_pdi_step(
  target_step_id bigint, step_comments text DEFAULT ''::text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  target_step public.pdi_case_steps;
  target_case public.pdi_cases;
  next_pending_step public.pdi_case_steps;
  user_name text;
  now_time timestamptz := now();
  pending_in_phase integer;
  next_phase integer;
  next_step_no integer;
BEGIN
  SELECT * INTO target_step FROM public.pdi_case_steps WHERE id=target_step_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PDI step not found'; END IF;
  IF target_step.step_no=12 THEN
    RAISE EXCEPTION 'PDI step 12 has been retired; historical records are read-only';
  END IF;
  IF target_step.step_status='Completed' THEN
    RAISE EXCEPTION 'PDI step already completed';
  END IF;
  SELECT * INTO target_case FROM public.pdi_cases WHERE id=target_step.pdi_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PDI case not found'; END IF;
  IF target_step.phase_no <> target_case.current_phase THEN
    RAISE EXCEPTION 'This step belongs to Phase %, but the vehicle is currently in Phase %',
      target_step.phase_no,target_case.current_phase;
  END IF;
  IF NOT public.can_complete_pdi_step(target_step.responsible_role) THEN
    RAISE EXCEPTION 'User is not authorised for role %',target_step.responsible_role;
  END IF;
  SELECT full_name INTO user_name FROM public.user_profiles WHERE user_id=auth.uid();
  UPDATE public.pdi_case_steps SET
    step_status='Completed', completed_by=auth.uid(),
    completed_by_name=coalesce(user_name,'Authenticated User'),
    completed_at=now_time,comments=step_comments,updated_at=now_time
  WHERE id=target_step_id;

  SELECT count(*) INTO pending_in_phase FROM public.pdi_case_steps
  WHERE pdi_case_id=target_step.pdi_case_id
    AND phase_no=target_case.current_phase
    AND step_no<>12 AND step_status<>'Completed';

  IF pending_in_phase>0 THEN
    SELECT * INTO next_pending_step FROM public.pdi_case_steps
    WHERE pdi_case_id=target_step.pdi_case_id
      AND phase_no=target_case.current_phase
      AND step_no<>12 AND step_status<>'Completed'
    ORDER BY step_no LIMIT 1;
    UPDATE public.pdi_cases SET current_step=next_pending_step.step_no,
      updated_at=now_time WHERE id=target_step.pdi_case_id;
    RETURN jsonb_build_object(
      'success',true,'completed_step',target_step.step_no,
      'case_id',target_step.pdi_case_id,'phase_completed',false,
      'current_phase',target_case.current_phase,'next_step',next_pending_step.step_no
    );
  END IF;

  SELECT min(phase_no) INTO next_phase FROM public.pdi_case_steps
  WHERE pdi_case_id=target_step.pdi_case_id
    AND phase_no>target_case.current_phase
    AND step_no<>12 AND step_status<>'Completed';

  IF next_phase IS NULL THEN
    UPDATE public.pdi_cases SET workflow_status='Completed',
      completed_at=now_time,updated_at=now_time
    WHERE id=target_step.pdi_case_id;
    RETURN jsonb_build_object(
      'success',true,'completed_step',target_step.step_no,
      'case_id',target_step.pdi_case_id,'phase_completed',true,
      'workflow_completed',true
    );
  END IF;

  SELECT min(step_no) INTO next_step_no FROM public.pdi_case_steps
  WHERE pdi_case_id=target_step.pdi_case_id AND phase_no=next_phase
    AND step_no<>12 AND step_status<>'Completed';
  UPDATE public.pdi_cases SET current_phase=next_phase,
    current_step=next_step_no,workflow_status='In Progress',
    current_step_started_at=now_time,updated_at=now_time
  WHERE id=target_step.pdi_case_id;
  RETURN jsonb_build_object(
    'success',true,'completed_step',target_step.step_no,
    'case_id',target_step.pdi_case_id,'phase_completed',true,
    'workflow_completed',false,'current_phase',next_phase,'next_step',next_step_no
  );
END;
$function$;

-- Remove Step 12 from FUTURE case creation while preserving existing case-step rows.
DELETE FROM public.pdi_step_templates WHERE step_no=12;

-- Reposition only cases currently at retired step 12, choosing the next
-- pending step in Phase 2 or the next pending phase. Completed cases unchanged.
WITH at_retired_step AS (
  SELECT c.id, c.current_phase,
    (SELECT min(s.step_no) FROM public.pdi_case_steps s
     WHERE s.pdi_case_id=c.id AND s.phase_no=c.current_phase
       AND s.step_no>12 AND s.step_no<>12 AND s.step_status<>'Completed') AS same_phase_next,
    (SELECT min(s.phase_no) FROM public.pdi_case_steps s
     WHERE s.pdi_case_id=c.id AND s.phase_no>c.current_phase
       AND s.step_no<>12 AND s.step_status<>'Completed') AS later_phase
  FROM public.pdi_cases c
  WHERE c.current_step=12 AND c.workflow_status<>'Completed'
), next_positions AS (
  SELECT a.id,
    coalesce(a.same_phase_next,
      (SELECT min(s.step_no) FROM public.pdi_case_steps s
       WHERE s.pdi_case_id=a.id AND s.phase_no=a.later_phase
         AND s.step_no<>12 AND s.step_status<>'Completed')) AS next_step,
    CASE WHEN a.same_phase_next IS NOT NULL THEN a.current_phase
         ELSE a.later_phase END AS next_phase
  FROM at_retired_step a
)
UPDATE public.pdi_cases c
SET current_step=n.next_step,current_phase=n.next_phase,
    workflow_status=CASE WHEN n.next_step IS NULL THEN 'Completed' ELSE c.workflow_status END,
    completed_at=CASE WHEN n.next_step IS NULL THEN now() ELSE c.completed_at END,
    current_step_started_at=CASE WHEN n.next_step IS NOT NULL THEN now() ELSE c.current_step_started_at END,
    updated_at=now()
FROM next_positions n WHERE c.id=n.id;

COMMIT;

-- Post-migration verification (read only):
SELECT count(*) AS cases_still_at_step_12 FROM public.pdi_cases WHERE current_step=12;
SELECT count(*) AS retained_historical_step_12_rows FROM public.pdi_case_steps WHERE step_no=12;
SELECT count(*) AS remaining_step_12_templates FROM public.pdi_step_templates WHERE step_no=12;
