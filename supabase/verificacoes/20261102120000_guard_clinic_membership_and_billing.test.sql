-- Teste de verificação de 20261102120000_guard_clinic_membership_and_billing.sql
-- Roda tudo dentro de uma transação e faz ROLLBACK no final: não deixa dados.
-- Uso: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/verificacoes/20261102120000_guard_clinic_membership_and_billing.test.sql
-- Saída esperada: apenas linhas "OK ..."; qualquer falha aborta com "FALHA ...".

BEGIN;

-- Cenário: vítima (dona da clínica V) e atacante (dono da clínica A, admin)
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'vitima@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'atacante@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'novo@teste.local', '{}', 'authenticated', 'authenticated');

-- handle_new_user cria os profiles; garante caso o trigger não exista no ambiente
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, 'Teste', u.email FROM auth.users u
WHERE u.email LIKE '%@teste.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clinicas (id, nome, owner_user_id, plano, status_assinatura)
VALUES
  ('00000000-0000-0000-0000-00000000c11a', 'Clinica Vitima', '00000000-0000-0000-0000-0000000000a1', 'starter', 'active'),
  ('00000000-0000-0000-0000-00000000c11b', 'Clinica Atacante', '00000000-0000-0000-0000-0000000000b2', 'starter', 'trialing');

UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000c11a' WHERE id = '00000000-0000-0000-0000-0000000000a1';
UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000c11b' WHERE id = '00000000-0000-0000-0000-0000000000b2';

INSERT INTO public.usuarios (id, clinica_id, nome, email, perfil)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c11a', 'Vitima', 'vitima@teste.local', 'admin'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c11b', 'Atacante', 'atacante@teste.local', 'admin');

INSERT INTO public.patients (id, clinic_id, full_name, phone)
VALUES ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000c11a', 'Paciente da Vitima', '11999999999');

-- Helper: executa um comando como usuário autenticado e diz se foi bloqueado
CREATE FUNCTION pg_temp.como(_uid uuid, _sql text) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', _uid::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    EXECUTE _sql;
    EXECUTE 'RESET ROLE';
    RETURN 'permitido';
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    RETURN 'bloqueado';
  END;
END;
$$;

CREATE FUNCTION pg_temp.esperar(_nome text, _obtido text, _esperado text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF _obtido IS DISTINCT FROM _esperado THEN
    RAISE EXCEPTION 'FALHA %: esperado %, obtido %', _nome, _esperado, _obtido;
  END IF;
  RAISE NOTICE 'OK %', _nome;
END;
$$;

-- A1: atacante tenta se mover para a clínica da vítima
SELECT pg_temp.esperar('A1 profiles.clinic_id -> clinica alheia',
  pg_temp.como('00000000-0000-0000-0000-0000000000b2',
    $q$UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000c11a' WHERE id = '00000000-0000-0000-0000-0000000000b2'$q$),
  'bloqueado');

SELECT pg_temp.esperar('A1 profiles.clinic_id inalterado',
  (SELECT clinic_id::text FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000b2'),
  '00000000-0000-0000-0000-00000000c11b');

-- A1: atacante continua sem ver paciente da vítima
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.patients WHERE id = '00000000-0000-0000-0000-0000000000f1';
  RESET ROLE;
  PERFORM pg_temp.esperar('A1 paciente da vitima invisivel ao atacante', n::text, '0');
END $$;

-- A1: atacante tenta usuarios.clinica_id
SELECT pg_temp.esperar('A1 usuarios.clinica_id -> clinica alheia',
  pg_temp.como('00000000-0000-0000-0000-0000000000b2',
    $q$UPDATE public.usuarios SET clinica_id = '00000000-0000-0000-0000-00000000c11a' WHERE id = '00000000-0000-0000-0000-0000000000b2'$q$),
  'bloqueado');

-- Fluxo legítimo: usuário novo cria a própria clínica e se vincula (onboarding)
SELECT pg_temp.esperar('Onboarding cria clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000000c3',
    $q$INSERT INTO public.clinicas (id, nome, owner_user_id, plano, status_assinatura, current_period_end)
       VALUES ('00000000-0000-0000-0000-00000000c11c', 'Clinica Nova', '00000000-0000-0000-0000-0000000000c3',
               'starter', 'active', now() + interval '10 years')$q$),
  'permitido');

SELECT pg_temp.esperar('A7 INSERT forca status trialing',
  (SELECT status_assinatura::text FROM public.clinicas WHERE id = '00000000-0000-0000-0000-00000000c11c'),
  'trialing');

SELECT pg_temp.esperar('A7 INSERT forca vencimento de 14 dias',
  (SELECT (current_period_end < now() + interval '15 days')::text FROM public.clinicas WHERE id = '00000000-0000-0000-0000-00000000c11c'),
  'true');

SELECT pg_temp.esperar('Onboarding vincula profiles a clinica propria',
  pg_temp.como('00000000-0000-0000-0000-0000000000c3',
    $q$UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000c11c' WHERE id = '00000000-0000-0000-0000-0000000000c3'$q$),
  'permitido');

SELECT pg_temp.esperar('Onboarding: profiles.clinic_id gravado',
  (SELECT clinic_id::text FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000c3'),
  '00000000-0000-0000-0000-00000000c11c');

-- Depois de vinculado, não pode trocar de novo
SELECT pg_temp.esperar('A1 troca apos vinculo',
  pg_temp.como('00000000-0000-0000-0000-0000000000c3',
    $q$UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000c11a' WHERE id = '00000000-0000-0000-0000-0000000000c3'$q$),
  'bloqueado');

-- Atualizar outros campos do perfil continua funcionando
SELECT pg_temp.esperar('Perfil: editar nome continua permitido',
  pg_temp.como('00000000-0000-0000-0000-0000000000b2',
    $q$UPDATE public.profiles SET full_name = 'Novo Nome' WHERE id = '00000000-0000-0000-0000-0000000000b2'$q$),
  'permitido');

-- A7: admin tenta estender trial / ativar assinatura
SELECT pg_temp.esperar('A7 admin altera status_assinatura',
  pg_temp.como('00000000-0000-0000-0000-0000000000b2',
    $q$UPDATE public.clinicas SET status_assinatura = 'active' WHERE id = '00000000-0000-0000-0000-00000000c11b'$q$),
  'bloqueado');

SELECT pg_temp.esperar('A7 admin altera current_period_end',
  pg_temp.como('00000000-0000-0000-0000-0000000000b2',
    $q$UPDATE public.clinicas SET current_period_end = now() + interval '5 years' WHERE id = '00000000-0000-0000-0000-00000000c11b'$q$),
  'bloqueado');

-- Editar dados cadastrais e onboarding_status continua funcionando
SELECT pg_temp.esperar('Clinica: editar nome/onboarding_status permitido',
  pg_temp.como('00000000-0000-0000-0000-0000000000b2',
    $q$UPDATE public.clinicas SET nome = 'Outro Nome', onboarding_status = 'completed' WHERE id = '00000000-0000-0000-0000-00000000c11b'$q$),
  'permitido');

-- Privilegiado (conexão direta / service_role) continua podendo alterar cobrança
UPDATE public.clinicas SET status_assinatura = 'active' WHERE id = '00000000-0000-0000-0000-00000000c11b';
SELECT pg_temp.esperar('service_role/conexao direta altera status',
  (SELECT status_assinatura::text FROM public.clinicas WHERE id = '00000000-0000-0000-0000-00000000c11b'),
  'active');

ROLLBACK;
