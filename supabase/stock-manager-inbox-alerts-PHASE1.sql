-- ELT Stock Management: independent manager inbox alerts.
-- REVIEW before applying to LIVE. This migration does not change floorplan dates.
-- Notification source: stock_floorplan_register() returns due_date, days_remaining,
-- settled_at, vin, stock_no, floorplan_provider and pdi_case_id.
-- The scheduled job must run with a role allowed to read the register.
create table if not exists public.stock_payment_notifications (
 id bigint generated always as identity primary key,
 pdi_case_id bigint not null,
 alert_stage text not null check (alert_stage in ('warning15','critical7','overdue')),
 alert_date date not null,
 vin text,
 stock_no text,
 floorplan_provider text,
 due_date date,
 days_remaining integer,
 created_at timestamptz not null default now(),
 unique (pdi_case_id, alert_stage, alert_date)
);
create table if not exists public.stock_payment_notification_recipients (
 notification_id bigint not null references public.stock_payment_notifications(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz,
 primary key (notification_id, recipient_id)
);
create index if not exists stock_alert_recipient_unread_idx
 on public.stock_payment_notification_recipients(recipient_id, read_at);
alter table public.stock_payment_notifications enable row level security;
alter table public.stock_payment_notification_recipients enable row level security;
revoke all on public.stock_payment_notifications from anon, authenticated;
revoke all on public.stock_payment_notification_recipients from anon, authenticated;
grant select on public.stock_payment_notifications to authenticated;
grant select on public.stock_payment_notification_recipients to authenticated;
create policy "Stock notification recipients see own alerts"
 on public.stock_payment_notifications for select to authenticated
 using (exists (select 1 from public.stock_payment_notification_recipients r
   where r.notification_id=id and r.recipient_id=auth.uid()));
create policy "Stock notification recipients see own delivery"
 on public.stock_payment_notification_recipients for select to authenticated
 using (recipient_id=auth.uid());

create or replace function public.stock_mark_notification_read(p_notification_id bigint)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.stock_payment_notification_recipients
 set read_at=now()
 where notification_id=p_notification_id and recipient_id=auth.uid() and read_at is null;
end $$;
revoke all on function public.stock_mark_notification_read(bigint) from public;
grant execute on function public.stock_mark_notification_read(bigint) to authenticated;

-- NOTE: The register RPC may be authenticated-only. This job intentionally
-- uses the PDI source records instead of impersonating a user. Review the
-- actual PDI column names and receipt-date source before enabling scheduling.
-- The dispatch function is supplied in a separate, reviewed migration.
