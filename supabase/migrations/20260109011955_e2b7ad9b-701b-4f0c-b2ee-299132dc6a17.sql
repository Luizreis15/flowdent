-- Inserir role super_admin para o usuario leduardoreis@gmail.com
--
-- Era um INSERT incondicional com UUID fixo. user_roles.user_id tem FK para
-- auth.users, então num banco novo (CI, ambiente local, branch, recuperação)
-- isto abortava com violação de chave estrangeira — ON CONFLICT não cobre FK.
-- O UUID veio de outro projeto Supabase e nunca correspondeu a ninguém aqui;
-- 20260721155445_fix_super_admin_bootstrap.sql resolve o caso por e-mail.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '9fa2445b-2561-4fe2-bb3a-507427294f32') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('9fa2445b-2561-4fe2-bb3a-507427294f32', 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    RAISE NOTICE 'Usuario 9fa2445b-... nao existe em auth.users. Ignorando.';
  END IF;
END $$;
