-- ELT Vehicle Suite / TEST MIGRATION ONLY -- NOT YET APPLIED.
-- Confirm existing pdi_cases.id type and user_profiles policies before execution.
-- SQL functions use auth.uid() and validate active users; never trust browser role claims.

alter table public.pdi_cases
  add column if not exists current_location text,
  add column if not exists bodybuilder_name text;

alter table public.pdi_cases drop constraint if exists pdi_cases_location_check;
alter table public.pdi_cases add constraint pdi_cases_location_check
  check (current_location is null or current_location in
    ('Stock Yard','Workshop','Washbay','Fitment Bays','Waiting collection Bays','Bodybuilder'));
alter table public.pdi_cases drop constraint if exists pdi_cases_bodybuilder_required_check;
alter table public.pdi_cases add constraint pdi_cases_bodybuilder_required_check
  check (current_location is distinct from 'Bodybuilder'
    or nullif(btrim(bodybuilder_name),'') is not null);

create table if not exists public.pdi_location_history (
  id bigint generated always as identity primary key,
  pdi_case_id bigint not null references public.pdi_cases(id) on delete cascade,
  location text not null check (location in
    ('Stock Yard','Workshop','Washbay','Fitment Bays','Waiting collection Bays','Bodybuilder')),
  bodybuilder_name text,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  check (location <> 'Bodybuilder' or nullif(btrim(bodybuilder_name),'') is not null)
);
create index if not exists pdi_location_history_case_idx on public.pdi_location_history(pdi_case_id,changed_at desc);

create table if not exists public.pdi_messages (
  id bigint generated always as identity primary key,
  pdi_case_id bigint not null references public.pdi_cases(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check (length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists pdi_messages_case_idx on public.pdi_messages(pdi_case_id,created_at);

create table if not exists public.pdi_message_recipients (
  message_id bigint not null references public.pdi_messages(id) on delete cascade,
  recipient_id uuid not null references auth.users(id),
  read_at timestamptz,
  primary key(message_id,recipient_id)
);
create index if not exists pdi_message_unread_idx on public.pdi_message_recipients(recipient_id,read_at);

alter table public.pdi_location_history enable row level security;
alter table public.pdi_messages enable row level security;
alter table public.pdi_message_recipients enable row level security;

-- Existing user_profiles.is_active is the source of active user status.
create or replace function public.elt_is_active_user()
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.user_profiles p
    where p.user_id=auth.uid() and p.is_active=true);
$$;
revoke all on function public.elt_is_active_user() from public;
grant execute on function public.elt_is_active_user() to authenticated;

drop policy if exists elt_location_read on public.pdi_location_history;
create policy elt_location_read on public.pdi_location_history for select to authenticated
using (public.elt_is_active_user());
drop policy if exists elt_messages_read on public.pdi_messages;
create policy elt_messages_read on public.pdi_messages for select to authenticated
using (public.elt_is_active_user());
drop policy if exists elt_recipients_read on public.pdi_message_recipients;
create policy elt_recipients_read on public.pdi_message_recipients for select to authenticated
using (public.elt_is_active_user() and recipient_id=auth.uid());
drop policy if exists elt_recipients_mark_read on public.pdi_message_recipients;
create policy elt_recipients_mark_read on public.pdi_message_recipients for update to authenticated
using (public.elt_is_active_user() and recipient_id=auth.uid())
with check (public.elt_is_active_user() and recipient_id=auth.uid());

grant select on public.pdi_location_history,public.pdi_messages to authenticated;
grant select,update(read_at) on public.pdi_message_recipients to authenticated;

-- Writes use security-definer RPCs so messages and recipients are committed atomically.
create or replace function public.elt_send_pdi_message(
  vehicle_case_id bigint, recipient_ids uuid[], message_body text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint;
begin
  if not public.elt_is_active_user() then raise exception 'Not an active user'; end if;
  if not exists(select 1 from public.pdi_cases where id=vehicle_case_id)
    then raise exception 'Vehicle not found'; end if;
  if nullif(btrim(message_body),'') is null or length(message_body)>5000
    then raise exception 'Invalid message'; end if;
  if coalesce(array_length(recipient_ids,1),0)=0
     or coalesce(array_length(recipient_ids,1),0)>100
    then raise exception 'Choose 1 to 100 recipients'; end if;
  if exists(
    select 1 from unnest(recipient_ids) r
    where r=auth.uid() or not exists(
      select 1 from public.user_profiles u where u.user_id=r and u.is_active=true)
  ) then raise exception 'Recipient is invalid or inactive'; end if;
  insert into public.pdi_messages(pdi_case_id,sender_id,body)
  values(vehicle_case_id,auth.uid(),btrim(message_body)) returning id into new_id;
  insert into public.pdi_message_recipients(message_id,recipient_id)
  select new_id,r from (select distinct unnest(recipient_ids) r) recipients;
  return new_id;
end; $$;
revoke all on function public.elt_send_pdi_message(bigint,uuid[],text) from public;
grant execute on function public.elt_send_pdi_message(bigint,uuid[],text) to authenticated;

-- Only sales admins or full admins may change locations.
-- Verify the actual role string in user_profiles.roles before test deployment.
create or replace function public.elt_update_pdi_location(
  vehicle_case_id bigint,new_location text,new_bodybuilder text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare permitted boolean; previous_location text; previous_builder text;
begin
  select (p.is_active and (p.is_admin or p.roles::text ilike '%sales admin%'))
  into permitted from public.user_profiles p where p.user_id=auth.uid();
  if coalesce(permitted,false)=false then raise exception 'Sales Admin access required'; end if;
  if new_location not in ('Stock Yard','Workshop','Washbay','Fitment Bays','Waiting collection Bays','Bodybuilder')
    or new_location is null then raise exception 'Invalid location'; end if;
  if new_location='Bodybuilder' and nullif(btrim(new_bodybuilder),'') is null
    then raise exception 'Bodybuilder name is required'; end if;
  select current_location,bodybuilder_name into previous_location,previous_builder
    from public.pdi_cases where id=vehicle_case_id for update;
  if not found then raise exception 'Vehicle not found'; end if;
  if previous_location is not distinct from new_location and
    previous_builder is not distinct from (case when new_location='Bodybuilder' then btrim(new_bodybuilder) else null end)
    then return; end if;
  update public.pdi_cases set current_location=new_location,
    bodybuilder_name=(case when new_location='Bodybuilder' then btrim(new_bodybuilder) else null end)
    where id=vehicle_case_id;
  insert into public.pdi_location_history(pdi_case_id,location,bodybuilder_name,changed_by)
    values(vehicle_case_id,new_location,
      (case when new_location='Bodybuilder' then btrim(new_bodybuilder) else null end),auth.uid());
end; $$;
revoke all on function public.elt_update_pdi_location(bigint,text,text) from public;
grant execute on function public.elt_update_pdi_location(bigint,text,text) to authenticated;

-- IMPORTANT: Current vehicle deletion cascade removes history. For permanent audit
-- preservation after deletion, use soft-delete / retention policy before production.
-- Completed/archive cases remain in pdi_cases, so their history remains accessible.
