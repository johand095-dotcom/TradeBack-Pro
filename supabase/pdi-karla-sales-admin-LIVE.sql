-- Run in TradeBack Pro LIVE SQL Editor only AFTER inviting Karla via
-- Supabase Authentication > Users > Invite user.
-- Does not create credentials, bypass authentication, or grant administrator access.
DO $$
DECLARE v_user_id uuid;
BEGIN
 SELECT id INTO v_user_id FROM auth.users
 WHERE lower(email)=lower('karlab@eltgroup.co.za');
 IF v_user_id IS NULL THEN
   RAISE EXCEPTION 'Karla has not been invited/created in Supabase Authentication. Invite her first.';
 END IF;
 INSERT INTO public.user_profiles(user_id,full_name,email,roles,is_admin,is_active)
 VALUES(v_user_id,'Karla Buys','karlab@eltgroup.co.za',ARRAY['Sales Admin']::text[],false,true)
 ON CONFLICT (user_id) DO UPDATE SET
   full_name=EXCLUDED.full_name,
   email=EXCLUDED.email,
   roles=CASE WHEN 'Sales Admin'=ANY(COALESCE(public.user_profiles.roles,ARRAY[]::text[]))
      THEN public.user_profiles.roles
      ELSE array_append(COALESCE(public.user_profiles.roles,ARRAY[]::text[]),'Sales Admin') END,
   is_active=true;
END $$;
