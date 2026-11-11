-- Administrator-only recoverable removal of an EMS vehicle from active lists.
-- Preserves all related EMS step history and supporting documents.
CREATE OR REPLACE FUNCTION public.archive_ems_case(p_case_id bigint)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND is_active = true AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only active administrators may archive EMS vehicles';
  END IF;
  UPDATE public.ems_cases
  SET workflow_status='Archived',updated_at=now()
  WHERE id=p_case_id AND coalesce(workflow_status,'') <> 'Archived';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EMS vehicle not found or already archived';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_ems_case(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_ems_case(bigint) TO authenticated;
