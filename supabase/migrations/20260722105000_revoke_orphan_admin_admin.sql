-- Passo 7: remover backdoor humano admin@admin.com
-- Conta criada em 2026-05-05, nunca fez login (last_sign_in_at IS NULL),
-- ainda com role super_admin. Revoga privilégios e bloqueia autenticação.

DO $$
DECLARE
  v_user_id uuid := '76b0308d-c7df-474b-be0b-b94e39a8bf4c';
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL OR lower(v_email) <> 'admin@admin.com' THEN
    RAISE NOTICE 'admin@admin.com not found or id mismatch — skipping.';
    RETURN;
  END IF;

  -- Revoga super_admin (e qualquer outra role)
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- Remove perfil privilegiado em usuarios, se existir
  UPDATE public.usuarios
  SET perfil = 'assistente'::perfil_usuario,
      clinica_id = NULL
  WHERE id = v_user_id;

  -- Auditoria (new_role NOT NULL — registra demoção para assistente)
  INSERT INTO public.role_audit_log (user_id, changed_by, old_role, new_role)
  VALUES (v_user_id, v_user_id, 'super_admin'::perfil_usuario, 'assistente'::perfil_usuario);

  -- Bloqueia login indefinidamente
  UPDATE auth.users
  SET
    banned_until = '2999-12-31 23:59:59+00',
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('disabled_reason', 'orphan_super_admin_revoked_20260722'),
    updated_at = now()
  WHERE id = v_user_id;

  RAISE NOTICE 'admin@admin.com revoked and banned successfully.';
END $$;
