-- Promote leduardoreis@gmail.com to super_admin if user and profile exist
-- Idempotent, safe to re-run; replaces the hardcoded-UUID version in
-- 20260109011955_e2b7ad9b-701b-4f0c-b2ee-299132dc6a17.sql which targeted a
-- user_id from a different Supabase project and never matched here.

DO $$
DECLARE
  v_user_id uuid;
  v_profile_exists boolean;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'leduardoreis@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User leduardoreis@gmail.com not found in auth.users. Skipping super_admin role.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE NOTICE 'Profile for leduardoreis@gmail.com not found in public.profiles. Skipping super_admin role.';
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'User leduardoreis@gmail.com promoted to super_admin successfully.';
END $$;
