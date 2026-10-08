-- EMS Phase 3 completion fields (steps 9-14)
alter table public.ems_cases add column if not exists repairs_completed_at timestamptz;
alter table public.ems_cases add column if not exists repairs_completed_by uuid;
alter table public.ems_cases add column if not exists qc_passed_at timestamptz;
alter table public.ems_cases add column if not exists qc_passed_by uuid;
alter table public.ems_cases add column if not exists job_card_handed_front_office_at timestamptz;
alter table public.ems_cases add column if not exists job_card_handed_front_office_by uuid;
alter table public.ems_cases add column if not exists job_card_accepted_front_office_at timestamptz;
alter table public.ems_cases add column if not exists job_card_accepted_front_office_by uuid;
alter table public.ems_cases add column if not exists invoice_number text;
alter table public.ems_cases add column if not exists invoiced_at timestamptz;
alter table public.ems_cases add column if not exists invoiced_by uuid;
alter table public.ems_cases add column if not exists vehicle_released_at timestamptz;
alter table public.ems_cases add column if not exists vehicle_released_by uuid;
alter table public.ems_cases add column if not exists invoice_proof_path text;
alter table public.ems_cases add column if not exists invoice_signed_at timestamptz;
alter table public.ems_cases add column if not exists invoice_signed_by uuid;
alter table public.ems_cases add column if not exists completed_at timestamptz;
alter table public.ems_cases add column if not exists completed_by uuid;

-- Private bucket for signed invoices / official proof.
insert into storage.buckets (id, name, public)
values ('ems-documents','ems-documents',false)
on conflict (id) do nothing;

-- Authenticated users may upload/read EMS documents. Existing policies with these names are replaced safely.
drop policy if exists "EMS documents authenticated read" on storage.objects;
drop policy if exists "EMS documents authenticated upload" on storage.objects;
create policy "EMS documents authenticated read" on storage.objects for select to authenticated using (bucket_id='ems-documents');
create policy "EMS documents authenticated upload" on storage.objects for insert to authenticated with check (bucket_id='ems-documents');
