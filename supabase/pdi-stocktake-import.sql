-- ELT PDI stocktake: run in Supabase SQL Editor before testing the bulk importer.
-- Administrator-only, atomic per vehicle. RCV is a TRACKING reference, NOT a completed Receiving inspection.
create sequence if not exists public.pdi_stocktake_rcv_seq;
revoke all on sequence public.pdi_stocktake_rcv_seq from public, anon, authenticated;

create table if not exists public.pdi_stocktake_import_audit (
 id bigint generated always as identity primary key,
 pdi_case_id bigint not null,
 receiving_no text not null,
 vin text not null,
 admin_user_id uuid not null,
 imported_at timestamptz not null default now(),
 source text not null default 'Historical stocktake - physically on site'
);
alter table public.pdi_stocktake_import_audit enable row level security;
revoke all on public.pdi_stocktake_import_audit from public, anon, authenticated;

create or replace function public.import_stocktake_pdi_vehicle(p_vin text)
returns table (pdi_case_id bigint, rcv_number text, outcome text)
language plpgsql security definer set search_path = public
as $$
declare
 v_vin text := upper(regexp_replace(coalesce(p_vin,''), '\s+', '', 'g'));
 v_rcv text;
 v_id bigint;
 v_existing bigint;
 v_counter int := 0;
begin
 if auth.uid() is null or not exists (
   select 1 from public.user_profiles u
   where u.user_id=auth.uid() and u.is_admin=true and u.is_active=true
 ) then raise exception 'Active administrator access required'; end if;

 if v_vin !~ '^[A-HJ-NPR-Z0-9]{17}$'
 then raise exception 'A valid 17-character VIN is required'; end if;

 -- Serialise imports for the same VIN, including simultaneous administrator sessions.
 perform pg_advisory_xact_lock(hashtextextended('elt-stocktake:'||v_vin,0));

 select c.id into v_existing from public.pdi_cases c
 where upper(regexp_replace(coalesce(c.vin,''),'\s+','','g'))=v_vin limit 1;
 if v_existing is not null then
   return query select v_existing, c.receiving_no, 'Already in PDI'::text
     from public.pdi_cases c where c.id=v_existing;
   return;
 end if;

 -- An unlinked Receiving record must be investigated, not bypassed.
 if exists (
   select 1 from public.receivings r
   where upper(regexp_replace(coalesce(to_jsonb(r)->'fields'->>'receivingVin',''),'\s+','','g'))=v_vin
 ) then raise exception 'VIN exists in Receiving; investigate before importing'; end if;

 loop
   v_counter:=v_counter+1;
   if v_counter>20 then raise exception 'Could not allocate unique RCV number'; end if;
   v_rcv:='RCV-'||to_char(clock_timestamp() at time zone 'Africa/Johannesburg','YYYYMMDD')||
          '-'||lpad(nextval('public.pdi_stocktake_rcv_seq')::text,6,'0');
   exit when not exists (select 1 from public.pdi_cases c where c.receiving_no=v_rcv)
         and not exists (select 1 from public.receivings r where r.receiving_no=v_rcv);
 end loop;

 insert into public.pdi_cases (
   vin, receiving_no, order_status, workflow_status, current_phase, current_step,
   started_at, current_step_started_at, updated_at, received_at, ordered_at
 ) values (
   v_vin, v_rcv, 'Received', 'In Progress', 1, 1,
   now(), now(), now(), null, null
 ) returning id into v_id;

 insert into public.pdi_stocktake_import_audit(pdi_case_id,receiving_no,vin,admin_user_id)
 values(v_id,v_rcv,v_vin,auth.uid());

 return query select v_id,v_rcv,'Imported'::text;
end $$;
revoke all on function public.import_stocktake_pdi_vehicle(text) from public,anon;
grant execute on function public.import_stocktake_pdi_vehicle(text) to authenticated;

-- Read-only check for whether this administrator has already imported a VIN in this sheet.
-- Returns a boolean only; audit rows remain private.
create or replace function public.has_stocktake_import_test(p_vins text[])
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.user_profiles u
   where u.user_id=auth.uid() and u.is_admin=true and u.is_active=true
 ) then raise exception 'Active administrator access required'; end if;
 return exists (
   select 1 from public.pdi_stocktake_import_audit a
   join public.pdi_cases c on c.id=a.pdi_case_id
   where a.admin_user_id=auth.uid()
     and upper(a.vin)=any(p_vins)
     and upper(c.vin)=upper(a.vin)
     and c.receiving_no=a.receiving_no
 );
end $$;
revoke all on function public.has_stocktake_import_test(text[]) from public,anon;
grant execute on function public.has_stocktake_import_test(text[]) to authenticated;
