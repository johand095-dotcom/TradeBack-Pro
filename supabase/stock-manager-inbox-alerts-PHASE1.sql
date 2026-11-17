-- ELT Stock Management: manager inbox and scheduled payment reminders.
-- Run on LIVE only after reviewing the existing stock_floorplan_register() output.
-- No vehicle due dates or settlements are modified by this migration.
create table if not exists public.stock_payment_notifications (
 id bigint generated always as identity primary key,
 pdi_case_id bigint not null,
 alert_stage text not null check (alert_stage in ('warning15','critical7','overdue')),
 alert_date date not null,
 vin text, stock_no text, floorplan_provider text, due_date date,
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
drop policy if exists "Stock notification recipients see own alerts" on public.stock_payment_notifications;
create policy "Stock notification recipients see own alerts"
 on public.stock_payment_notifications for select to authenticated
 using (exists (select 1 from public.stock_payment_notification_recipients r
 where r.notification_id=id and r.recipient_id=auth.uid()));
drop policy if exists "Stock notification recipients see own delivery" on public.stock_payment_notification_recipients;
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

-- Dispatcher is server-only. Read only the necessary stock fields directly.
-- Do not call stock_floorplan_register(), which deliberately requires an
-- authenticated authorised user; scheduled jobs have no auth.uid().
-- Returns number of notification deliveries inserted.
create or replace function public.stock_dispatch_payment_alerts(p_dry_run boolean default false)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_record record;
 v_payload jsonb;
 v_case_id bigint;
 v_days integer;
 v_stage text;
 v_today date := (now() at time zone 'Africa/Johannesburg')::date;
 v_due date;
 v_notification_id bigint;
 v_recipient uuid;
 v_count integer := 0;
begin
 for v_record in
  select to_jsonb(x) as payload from (
   select p.id as pdi_case_id, p.vin, p.stock_no, p.floorplan_provider,
    ((p.received_at at time zone 'Africa/Johannesburg')::date +
      public.stock_floorplan_days(p.floorplan_provider,p.vehicle_range))::date as due_date,
    s.settled_at
   from public.pdi_cases p
   left join public.stock_floorplan_settlements s on s.pdi_case_id=p.id
   where p.received_at is not null and p.floorplan_provider is not null
     and p.vehicle_range is not null
  ) x
 loop
  v_payload:=v_record.payload;
  if nullif(v_payload->>'settled_at','') is not null then continue; end if;
  v_case_id:=nullif(v_payload->>'pdi_case_id','')::bigint;
  v_due:=nullif(v_payload->>'due_date','')::date;
  if v_case_id is null or v_due is null then continue; end if;
  v_days:=v_due-v_today;
  if v_days>15 then continue; end if;
  v_stage:=case when v_days<0 then 'overdue' when v_days<=7 then 'critical7' else 'warning15' end;
  -- Warning and critical messages are once per stage; overdue is daily.
  if v_stage<>'overdue' and exists (
   select 1 from public.stock_payment_notifications n
   where n.pdi_case_id=v_case_id and n.alert_stage=v_stage
  ) then continue; end if;
  if p_dry_run then
   v_count:=v_count+1;continue;
  end if;
  insert into public.stock_payment_notifications
   (pdi_case_id,alert_stage,alert_date,vin,stock_no,floorplan_provider,due_date,days_remaining)
  values (v_case_id,v_stage,v_today,v_payload->>'vin',v_payload->>'stock_no',
   v_payload->>'floorplan_provider',v_due,v_days)
  on conflict (pdi_case_id,alert_stage,alert_date) do update
   set due_date=excluded.due_date
  returning id into v_notification_id;
  for v_recipient in
   select distinct u.user_id from public.user_profiles u
   where lower(trim(u.email)) in ('marca@eltgroup.co.za','sp@eltgroup.co.za')
   and u.is_active=true and u.user_id is not null
  loop
   insert into public.stock_payment_notification_recipients(notification_id,recipient_id)
   values (v_notification_id,v_recipient) on conflict do nothing;
   if found then v_count:=v_count+1;end if;
  end loop;
 end loop;
 return v_count;
end $$;
revoke all on function public.stock_dispatch_payment_alerts(boolean) from public, anon, authenticated;
-- Execute via SQL editor as postgres or a privileged scheduled pg_cron job.
-- Dry-run: select public.stock_dispatch_payment_alerts(true);
-- This returns number of eligible vehicle alert events, not recipient deliveries.
-- Production run: select public.stock_dispatch_payment_alerts(false);

-- Optional pg_cron scheduler. Run separately after confirming pg_cron exists:
-- select cron.schedule('elt-stock-floorplan-alerts','15 5 * * *',
--   $$select public.stock_dispatch_payment_alerts(false)$$);
-- pg_cron uses UTC: 05:15 UTC = 07:15 SAST.
