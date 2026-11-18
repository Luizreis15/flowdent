-- Make clinica_id nullable in usuarios table for super_admins
ALTER TABLE public.usuarios 
ALTER COLUMN clinica_id DROP NOT NULL;

-- Promote admin@admin.com to super_admin role
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Era RAISE EXCEPTION, o que tornava a história de migrations irreproduzível:
    -- num banco novo (CI, ambiente local, branch, recuperação) admin@admin.com não
    -- existe e `supabase db start` abortava aqui. A migration já está aplicada em
    -- produção, então afrouxar só afeta reconstruções. A conta foi revogada depois,
    -- em 20260722105000_revoke_orphan_admin_admin.sql.
    RAISE NOTICE 'User admin@admin.com not found in auth.users. Skipping super_admin role.';
    RETURN;
  END IF;

  -- Insert or update user_roles to super_admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin'::perfil_usuario)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update or insert into usuarios table (without clinica_id for super_admin)
  INSERT INTO public.usuarios (id, email, nome, perfil, clinica_id)
  VALUES (
    v_user_id,
    'admin@admin.com',
    'Super Admin',
    'super_admin'::perfil_usuario,
    NULL
  )
  ON CONFLICT (id) DO UPDATE
  SET perfil = 'super_admin'::perfil_usuario,
      clinica_id = NULL;

  RAISE NOTICE 'User admin@admin.com promoted to super_admin successfully';
END $$;