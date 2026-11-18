-- ELT PDI ETA: start five-working-day clock when vehicle reaches Step 22.
-- Apply on LIVE before testing updated PDI JavaScript.
-- Preserves existing pdi_started_at dates and manual ETA overrides.
-- Uses Step 21 completion timestamp for historical vehicles where available.
CREATE OR REPLACE FUNCTION public.pdi_set_start_at_step22()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.current_step >= 22 AND NEW.pdi_started_at IS NULL THEN
    NEW.pdi_started_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pdi_set_start_at_step22_trigger ON public.pdi_cases;
CREATE TRIGGER pdi_set_start_at_step22_trigger
BEFORE INSERT OR UPDATE OF current_step ON public.pdi_cases
FOR EACH ROW EXECUTE FUNCTION public.pdi_set_start_at_step22();

-- Historical backfill ONLY where Step 21 completion supplies a reliable
-- timestamp for the transition into Step 22. Do not guess missing dates.
WITH step22_start AS (
 SELECT pdi_case_id, MIN(completed_at) AS entered_step22_at
 FROM public.pdi_case_steps
 WHERE step_no = 21 AND step_status = 'Completed' AND completed_at IS NOT NULL
 GROUP BY pdi_case_id
)
UPDATE public.pdi_cases c
SET pdi_started_at = s.entered_step22_at
FROM step22_start s
WHERE c.id = s.pdi_case_id
 AND c.current_step >= 22
 AND c.pdi_started_at IS NULL;

-- Recalculate dates only where we have a known start time.
-- The existing RPC preserves manual overrides.
DO $$
DECLARE v_case record;
BEGIN
 FOR v_case IN
  SELECT id FROM public.pdi_cases
  WHERE current_step >= 22 AND pdi_started_at IS NOT NULL
 LOOP
  PERFORM public.recalculate_pdi_expected_completion(v_case.id);
 END LOOP;
END;
$$;

-- Audit any historical vehicles still missing a recorded start.
SELECT id, stock_no, vin, current_step, pdi_started_at,
       system_expected_completion_date, expected_completion_date
FROM public.pdi_cases
WHERE current_step >= 22 AND pdi_started_at IS NULL
ORDER BY current_step DESC;
