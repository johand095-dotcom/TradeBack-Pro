-- DEVELOPMENT MIGRATION ONLY. Do not run against production before approval.
-- Requires public.pdi_stocktake_import_audit and pdi_stocktake_rcv_seq from previous migration.
-- Preserves Consignment Stock as a fourth stock_classification value.
-- Run preflight checks below before applying:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid='public.pdi_cases'::regclass AND contype='c';
-- If stock_classification has a three-value CHECK constraint, update it separately
-- to permit 'Consignment Stock' before deploying this function.
create or replace function public.import_stocktake_pdi_allocated(
  p_vin text, p_make text, p_model text, p_classification text,
  p_salesperson_name text default null, p_customer text default null
)
returns table (pdi_case_id bigint, rcv_number text, outcome text)
language plpgsql security definer set search_path=public as $$
declare
 v_vin text := upper(regexp_replace(coalesce(p_vin,''),'\s+','','g'));
 v_make text := nullif(btrim(p_make),'');
 v_model text := nullif(btrim(p_model),'');
 v_class text := case lower(btrim(p_classification))
   when 'stock' then 'Stock' when 'sold' then 'Sold'
   when 'allocated' then 'Allocated'
   when 'consignment stock' then 'Consignment Stock'
   else null end;
 v_sales text := case when lower(btrim(p_classification)) in ('stock','consignment stock') then null else nullif(btrim(p_salesperson_name),'') end;
 v_customer text := nullif(btrim(p_customer),'');
 v_sales_id uuid;
 v_matches int;
 v_rcv text;
 v_id bigint;
 v_existing bigint;
 v_counter int := 0;
begin
 if auth.uid() is null or not exists (
   select 1 from public.user_profiles u
   where u.user_id=auth.uid() and u.is_admin=true and u.is_active=true
 ) then raise exception 'Active administrator access required'; end if;
 if v_vin !~ '^[A-HJ-NPR-Z0-9]{17}$' then raise exception 'Invalid VIN'; end if;
 if v_make is null or v_model is null or v_class is null
 then raise exception 'Make, model and valid classification required'; end if;
 if v_class in ('Sold','Allocated') and v_customer is null
 then raise exception 'Sold/Allocated vehicles require a customer'; end if;
 if v_class in ('Stock','Consignment Stock') and v_customer is not null
 then raise exception 'Stock/Consignment Stock vehicles must not have a customer allocation'; end if;
 if length(coalesce(v_make,''))>200 or length(coalesce(v_model,''))>200
 or length(coalesce(v_customer,''))>500 or length(coalesce(v_sales,''))>200
 then raise exception 'Field exceeds maximum allowed length'; end if;

 perform pg_advisory_xact_lock(hashtextextended('elt-stocktake:'||v_vin,0));
 select c.id into v_existing from public.pdi_cases c
 where upper(regexp_replace(coalesce(c.vin,''),'\s+','','g'))=v_vin limit 1;
 if v_existing is not null then
   return query select v_existing,c.receiving_no,'Already in PDI'::text
   from public.pdi_cases c where c.id=v_existing;
   return;
 end if;
 if exists (select 1 from public.receivings r
   where upper(regexp_replace(coalesce(r.vin,''),'\s+','','g'))=v_vin)
 then raise exception 'VIN exists in Receiving; investigate before importing'; end if;

 -- Explicit mapping of stocktake shorthand to approved active Sales Person profiles.
 -- Never silently store an unlinked or ambiguous salesperson.
 if v_class in ('Sold','Allocated') then
   if v_sales is null then raise exception 'Salesperson required for Sold/Allocated'; end if;
   v_sales := case lower(v_sales)
     when 'marc' then 'Marc Jones'
     when 'ashley' then 'Ashley Ramroop'
     when 'corlia' then 'Corlia Du Toit'
     when 'esme' then 'Esme Harmse'
     when 'gavin' then 'Gavin Aboud'
     when 'willie' then 'Willie Froneman'
     when 'boni' then 'Boni'
     when 'llewellyn' then 'Llewellyn'
     when 'venecia' then 'Venecia'
     else v_sales end;
   select count(*),min(u.user_id) into v_matches,v_sales_id
   from public.user_profiles u
   where u.is_active=true and 'Sales Person'=any(u.roles)
     and lower(btrim(u.full_name))=lower(v_sales);
   -- Venecia is assigned Sales rather than Sales Person in the live directory.
   if v_matches=0 and lower(v_sales)='venecia' then
     select count(*),min(u.user_id) into v_matches,v_sales_id
     from public.user_profiles u
     where u.is_active=true and 'Sales'=any(u.roles)
       and lower(btrim(u.full_name))='venecia';
   end if;
   if v_matches<>1 then raise exception 'Salesperson does not match exactly one active sales user: %',v_sales; end if;
 end if;

 loop
   v_counter:=v_counter+1;
   if v_counter>20 then raise exception 'Could not allocate unique RCV number'; end if;
   v_rcv:='RCV-'||to_char(clock_timestamp() at time zone 'Africa/Johannesburg','YYYYMMDD')
      ||'-'||lpad(nextval('public.pdi_stocktake_rcv_seq')::text,6,'0');
   exit when not exists(select 1 from public.pdi_cases c where c.receiving_no=v_rcv)
     and not exists(select 1 from public.receivings r where r.receiving_no=v_rcv);
 end loop;

 insert into public.pdi_cases (
   vin,receiving_no,make,model,stock_classification,allocated_customer,
   allocated_salesperson_id,allocated_salesperson_name,
   order_status,workflow_status,current_phase,current_step,
   started_at,current_step_started_at,updated_at,received_at,ordered_at
 ) values (
   v_vin,v_rcv,v_make,v_model,v_class,v_customer,
   v_sales_id,v_sales,'Received','In Progress',1,1,
   now(),now(),now(),null,null
 ) returning id into v_id;
 insert into public.pdi_stocktake_import_audit(
   pdi_case_id,receiving_no,vin,admin_user_id,source
 ) values (
   v_id,v_rcv,v_vin,auth.uid(),
   'Stocktake with make/model/classification/salesperson/customer allocations'
 );
 return query select v_id,v_rcv,'Imported'::text;
end $$;
revoke all on function public.import_stocktake_pdi_allocated(text,text,text,text,text,text) from public,anon;
grant execute on function public.import_stocktake_pdi_allocated(text,text,text,text,text,text) to authenticated;

-- Test gate is restricted to successful imports performed using the new allocated RPC.
create or replace function public.has_stocktake_allocated_test(p_vins text[])
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.user_profiles u
   where u.user_id=auth.uid() and u.is_admin=true and u.is_active=true
 ) then raise exception 'Active administrator access required'; end if;
 return exists(
   select 1 from public.pdi_stocktake_import_audit a
   join public.pdi_cases c on c.id=a.pdi_case_id
   where a.admin_user_id=auth.uid()
     and a.source='Stocktake with make/model/classification/salesperson/customer allocations'
     and upper(a.vin)=any(p_vins)
     and upper(c.vin)=upper(a.vin) and c.receiving_no=a.receiving_no
 );
end $$;
revoke all on function public.has_stocktake_allocated_test(text[]) from public,anon;
grant execute on function public.has_stocktake_allocated_test(text[]) to authenticated;
