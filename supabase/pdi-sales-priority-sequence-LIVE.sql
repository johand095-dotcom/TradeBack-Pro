-- PDI Sales Priority Sequence (LIVE). Review and execute in LIVE Supabase SQL Editor.
-- Additive migration; existing vehicles and workflow steps are preserved.
BEGIN;
ALTER TABLE public.pdi_cases ADD COLUMN IF NOT EXISTS sales_priority_sequence integer;
ALTER TABLE public.pdi_cases ADD CONSTRAINT pdi_sales_priority_positive CHECK (sales_priority_sequence IS NULL OR sales_priority_sequence > 0);
COMMENT ON COLUMN public.pdi_cases.sales_priority_sequence IS 'Sales Admin workshop sequence for sold, received, active vehicles. NULL means unsequenced.';
CREATE OR REPLACE FUNCTION public.pdi_set_sales_priority(p_case_id bigint, p_position integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_role_ok boolean;
 v_target public.pdi_cases%ROWTYPE;
 v_id bigint;
 v_ids bigint[];
 v_result bigint[];
 v_rank integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign-in required'; END IF;
 SELECT (is_active IS TRUE AND (is_admin IS TRUE OR 'Sales Admin'=ANY(COALESCE(roles,ARRAY[]::text[]))))
 INTO v_role_ok FROM public.user_profiles WHERE user_id=auth.uid();
 IF COALESCE(v_role_ok,false)=false THEN RAISE EXCEPTION 'Sales Admin or administrator permission required'; END IF;
 IF p_position IS NOT NULL AND p_position<1 THEN RAISE EXCEPTION 'Sequence must be 1 or greater'; END IF;
 PERFORM pg_advisory_xact_lock(741125,2026);
 SELECT * INTO v_target FROM public.pdi_cases WHERE id=p_case_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not found'; END IF;
 IF v_target.stock_classification IS DISTINCT FROM 'Sold'
   OR v_target.received_at IS NULL
   OR v_target.workflow_status IN ('Completed','Archived','Deleted')
 THEN RAISE EXCEPTION 'Only active, received, sold vehicles may be sequenced'; END IF;
 SELECT COALESCE(array_agg(id ORDER BY sales_priority_sequence NULLS LAST,started_at NULLS LAST,id),'{}'::bigint[])
 INTO v_ids FROM public.pdi_cases
 WHERE stock_classification='Sold' AND received_at IS NOT NULL
   AND COALESCE(workflow_status,'') NOT IN ('Completed','Archived','Deleted')
   AND sales_priority_sequence IS NOT NULL AND id<>p_case_id;
 IF p_position IS NOT NULL THEN
   v_rank:=LEAST(p_position,cardinality(v_ids)+1);
   v_result:=COALESCE(v_ids[1:v_rank-1],'{}'::bigint[])||ARRAY[p_case_id]||
      COALESCE(v_ids[v_rank:cardinality(v_ids)],'{}'::bigint[]);
 ELSE v_result:=v_ids;
 END IF;
 -- Reset previous assignments, then renumber in one transaction.
 UPDATE public.pdi_cases SET sales_priority_sequence=NULL
 WHERE sales_priority_sequence IS NOT NULL
 AND (id=p_case_id OR id=ANY(v_ids));
 FOR v_rank IN 1..cardinality(v_result) LOOP
   UPDATE public.pdi_cases SET sales_priority_sequence=v_rank,updated_at=now() WHERE id=v_result[v_rank];
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pdi_set_sales_priority(bigint,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pdi_set_sales_priority(bigint,integer) TO authenticated;
COMMIT;
-- Verify: SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='pdi_cases' AND column_name='sales_priority_sequence';
