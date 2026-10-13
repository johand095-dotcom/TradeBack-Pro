-- Apply in Supabase SQL Editor BEFORE enabling the recovery button.
-- This RPC logs successful administrator recovery attempts in a durable table.
create table if not exists public.receiving_pdi_recovery_audit (
 id bigint generated always as identity primary key,
 receiving_no text not null,
 vin text not null,
 pdi_case_id bigint,
 admin_user_id uuid not null,
 reason text not null check (char_length(trim(reason)) >= 10),
 outcome text not null,
 created_at timestamptz not null default now()
);
alter table public.receiving_pdi_recovery_audit enable row level security;
revoke all on public.receiving_pdi_recovery_audit from anon, authenticated;
create or replace function public.log_receiving_pdi_recovery(
 p_receiving_no text,p_vin text,p_pdi_case_id bigint,p_reason text,p_outcome text
) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.user_profiles
   where user_id=auth.uid() and is_admin=true and is_active=true
 ) then raise exception 'Administrator access required'; end if;
 if length(trim(coalesce(p_reason,'')))<10 then raise exception 'Recovery reason required'; end if;
 if not exists (
   select 1 from public.receivings
   where receiving_no=p_receiving_no and status='Completed'
 ) then raise exception 'Completed receiving record not found'; end if;
 insert into public.receiving_pdi_recovery_audit
 (receiving_no,vin,pdi_case_id,admin_user_id,reason,outcome)
 values (p_receiving_no,p_vin,p_pdi_case_id,auth.uid(),trim(p_reason),p_outcome);
end $$;
revoke all on function public.log_receiving_pdi_recovery(text,text,bigint,text,text) from public,anon;
grant execute on function public.log_receiving_pdi_recovery(text,text,bigint,text,text) to authenticated;
