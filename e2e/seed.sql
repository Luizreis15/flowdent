-- Semeia uma clínica e um usuário para os testes de fluxo.
-- Roda contra o Postgres LOCAL do `supabase db start`, nunca contra produção.
-- Senha: e2e-senha-forte-123

BEGIN;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current
) VALUES (
  '00000000-0000-0000-0000-0000000e2e01',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'e2e@flowdent.local',
  crypt('e2e-senha-forte-123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Usuario E2E"}',
  now(), now(),
  -- GoTrue lê estas colunas como string e quebra com NULL.
  '', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-0000000e2e01',
  '00000000-0000-0000-0000-0000000e2e01',
  '{"sub":"00000000-0000-0000-0000-0000000e2e01","email":"e2e@flowdent.local"}',
  'email', now(), now()
) ON CONFLICT DO NOTHING;

INSERT INTO public.clinicas (id, nome, owner_user_id)
VALUES ('00000000-0000-0000-0000-00000000e2ec', 'Clinica E2E', '00000000-0000-0000-0000-0000000e2e01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.usuarios (id, clinica_id, nome, email, perfil)
VALUES ('00000000-0000-0000-0000-0000000e2e01', '00000000-0000-0000-0000-00000000e2ec',
        'Usuario E2E', 'e2e@flowdent.local', 'admin')
ON CONFLICT (id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id, perfil = EXCLUDED.perfil;

-- profiles explícito: as policies desta base ainda leem profiles.clinic_id, e
-- fixture de teste não deve depender de gatilho de espelhamento ter rodado.
INSERT INTO public.profiles (id, full_name, email, clinic_id)
VALUES ('00000000-0000-0000-0000-0000000e2e01', 'Usuario E2E', 'e2e@flowdent.local',
        '00000000-0000-0000-0000-00000000e2ec')
ON CONFLICT (id) DO UPDATE SET clinic_id = EXCLUDED.clinic_id;

-- Permissões da clínica. /dashboard/financeiro está atrás de
-- <RequirePermission permission="financeiro.visualizar">, que lê
-- clinic_permissions. Sem isto o admin da clínica nova não abre a tela.
SELECT public.seed_default_permissions('00000000-0000-0000-0000-00000000e2ec');

INSERT INTO public.patients (id, clinic_id, full_name, phone)
VALUES ('00000000-0000-0000-0000-0000000e2e90', '00000000-0000-0000-0000-00000000e2ec',
        'Paciente Semeado E2E', '11911110000')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Confere o que foi semeado: se algo aqui vier zerado, o e2e falha por fixture
-- e não por regressão do produto.
SELECT
  (SELECT count(*) FROM public.usuarios WHERE id = '00000000-0000-0000-0000-0000000e2e01') AS usuario,
  (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000e2e01' AND clinic_id IS NOT NULL) AS profile_com_clinica,
  (SELECT count(*) FROM public.clinic_permissions WHERE clinic_id = '00000000-0000-0000-0000-00000000e2ec') AS permissoes,
  (SELECT count(*) FROM public.patients WHERE clinic_id = '00000000-0000-0000-0000-00000000e2ec') AS pacientes;
