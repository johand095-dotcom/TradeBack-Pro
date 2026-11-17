-- ELT Stock inbox delivery TEST ONLY. Run in LIVE SQL editor as postgres.
-- Does not modify pdi_cases, due dates, floorplan settlements, or PDI messages.
-- Generates one synthetic unread notification per authorised management recipient.
-- Remove with the cleanup statement at bottom after testing.
DO $$
DECLARE
  v_notification_id bigint;
  v_recipients integer;
BEGIN
  SELECT count(DISTINCT lower(trim(email))) INTO v_recipients
  FROM public.user_profiles
  WHERE lower(trim(email)) IN ('marca@eltgroup.co.za','sp@eltgroup.co.za')
    AND is_active IS TRUE AND user_id IS NOT NULL;
  IF v_recipients <> 2 THEN
    RAISE EXCEPTION 'Test cancelled: expected 2 active management profiles, found %',v_recipients;
  END IF;
  INSERT INTO public.stock_payment_notifications
    (pdi_case_id,alert_stage,alert_date,vin,stock_no,floorplan_provider,due_date,days_remaining)
  VALUES (-17112026,'warning15',(now() at time zone 'Africa/Johannesburg')::date,
    'TEST ONLY - STOCK ALERT','INBOX-DELIVERY-TEST','FFS',
    ((now() at time zone 'Africa/Johannesburg')::date+15),15)
  ON CONFLICT (pdi_case_id,alert_stage,alert_date)
  DO UPDATE SET vin=excluded.vin,stock_no=excluded.stock_no,
    floorplan_provider=excluded.floorplan_provider,due_date=excluded.due_date,
    days_remaining=excluded.days_remaining
  RETURNING id INTO v_notification_id;
  INSERT INTO public.stock_payment_notification_recipients
    (notification_id,recipient_id,read_at)
  SELECT v_notification_id,user_id,NULL FROM public.user_profiles
  WHERE lower(trim(email)) IN ('marca@eltgroup.co.za','sp@eltgroup.co.za')
    AND is_active IS TRUE AND user_id IS NOT NULL
  ON CONFLICT (notification_id,recipient_id)
  DO UPDATE SET read_at=NULL;
END $$;

-- Verify delivery without exposing account details:
SELECT n.id AS test_notification_id, count(r.recipient_id) AS delivered_to,
       count(*) FILTER (WHERE r.read_at IS NULL) AS unread
FROM public.stock_payment_notifications n
JOIN public.stock_payment_notification_recipients r ON r.notification_id=n.id
WHERE n.pdi_case_id=-17112026 AND n.stock_no='INBOX-DELIVERY-TEST'
GROUP BY n.id;

-- AFTER both recipients test the inbox, clean up using:
-- DELETE FROM public.stock_payment_notifications
-- WHERE pdi_case_id=-17112026 AND stock_no='INBOX-DELIVERY-TEST';
-- Recipient records cascade-delete with the notification.
