-- DRAFT ONLY: run in a test Supabase environment after review.
-- Vehicle location tracking and VIN-linked internal messaging.

alter table public.pdi_cases
  add column if not exists current_location text,
  add column if not exists bodybuilder_name text;

alter table public.pdi_cases
  drop constraint if exists pdi_cases_location_check;
alter table public.pdi_cases
  add constraint pdi_cases_location_check check (
    current_location is null or current_location in
    ('Stock Yard','Workshop','Washbay','Fitment Bays','Waiting collection Bays','Bodybuilder')
  );
alter table public.pdi_cases
  add constraint pdi_cases_bodybuilder_required_check check (
    current_location is distinct from 'Bodybuilder'
    or nullif(btrim(bodybuilder_name),'') is not null
  );

create table if not exists public.pdi_location_history (
  id bigint generated always as identity primary key,
  pdi_case_id bigint not null references public.pdi_cases(id),
  location text not null check (location in
    ('Stock Yard','Workshop','Washbay','Fitment Bays','Waiting collection Bays','Bodybuilder')),
  bodybuilder_name text,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  check (location <> 'Bodybuilder' or nullif(btrim(bodybuilder_name),'') is not null)
);
create index if not exists pdi_location_history_case_idx
  on public.pdi_location_history (pdi_case_id, changed_at desc);

create table if not exists public.pdi_messages (
  id bigint generated always as identity primary key,
  pdi_case_id bigint not null references public.pdi_cases(id),
  sender_id uuid not null references auth.users(id),
  body text not null check (length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists pdi_messages_case_idx
  on public.pdi_messages (pdi_case_id, created_at);

create table if not exists public.pdi_message_recipients (
  message_id bigint not null references public.pdi_messages(id),
  recipient_id uuid not null references auth.users(id),
  read_at timestamptz,
  primary key (message_id, recipient_id)
);
create index if not exists pdi_message_unread_idx
  on public.pdi_message_recipients (recipient_id, read_at);

-- RLS grants and atomic write/read RPCs to be added after verifying
-- existing auth/user_profiles conventions and Supabase Realtime setup.
-- DO NOT APPLY THIS DRAFT TO PRODUCTION.
