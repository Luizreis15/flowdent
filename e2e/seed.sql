-- Semeia uma clínica e um usuário para os testes de fluxo.
-- Roda contra o Postgres LOCAL do `supabase db start`, nunca contra produção.
-- Senha: e2e-senha-forte-123

BEGIN;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-0000000e2e01',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'e2e@flowdent.local',
  crypt('e2e-senha-forte-123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Usuario E2E"}',
  now(), now()
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

INSERT INTO public.patients (id, clinic_id, full_name, phone)
VALUES ('00000000-0000-0000-0000-0000000e2e90', '00000000-0000-0000-0000-00000000e2ec',
        'Paciente Semeado E2E', '11911110000')
ON CONFLICT (id) DO NOTHING;

COMMIT;
