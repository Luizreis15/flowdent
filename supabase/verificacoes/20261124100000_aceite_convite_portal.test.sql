-- Teste de verificação de 20261124100000_aceite_convite_portal.sql
-- Roda tudo dentro de uma transação e faz ROLLBACK no final: não deixa dados.
-- Uso: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/verificacoes/20261124100000_aceite_convite_portal.test.sql
-- Saída esperada: apenas linhas "OK ..."; qualquer falha aborta com "FALHA ...".

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) VALUES
  ('00000000-0000-0000-0000-0000000007a1', 'maria7@teste.local',  now(), '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000007a2', 'outro7@teste.local',  now(), '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000007a3', 'pendente7@teste.local', NULL, '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000007a4', 'equipe7@teste.local', now(), '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000007a5', 'joao7@teste.local',   now(), '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000007a6', 'ana7@teste.local',    now(), '{}', 'authenticated', 'authenticated');

INSERT INTO public.clinicas (id, nome, owner_user_id) VALUES
  ('00000000-0000-0000-0000-00000000cc7a', 'Clinica Sete', NULL);

INSERT INTO public.usuarios (id, clinica_id, nome, email, perfil) VALUES
  ('00000000-0000-0000-0000-0000000007a4', '00000000-0000-0000-0000-00000000cc7a', 'Equipe', 'equipe7@teste.local', 'recepcao');

INSERT INTO public.patients (id, clinic_id, full_name, phone) VALUES
  ('00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-00000000cc7a', '  Maria Souza Lima', '11900000071'),
  ('00000000-0000-0000-0000-0000000008a2', '00000000-0000-0000-0000-00000000cc7a', 'João Pedro', '11900000072'),
  ('00000000-0000-0000-0000-0000000008a3', '00000000-0000-0000-0000-00000000cc7a', 'Ana Paula', '11900000073');

INSERT INTO public.patient_portal_invites (patient_id, email, token, expires_at, used_at, invited_by) VALUES
  ('00000000-0000-0000-0000-0000000008a1', 'maria7@teste.local',    'tok-valido-maria-0000000000000000000', now() + interval '7 days', NULL, '00000000-0000-0000-0000-0000000007a4'),
  ('00000000-0000-0000-0000-0000000008a1', 'maria7@teste.local',    'tok-expirado-0000000000000000000000', now() - interval '1 day',  NULL, '00000000-0000-0000-0000-0000000007a4'),
  ('00000000-0000-0000-0000-0000000008a1', 'maria7@teste.local',    'tok-usado-000000000000000000000000', now() + interval '7 days', now(), '00000000-0000-0000-0000-0000000007a4'),
  ('00000000-0000-0000-0000-0000000008a1', 'pendente7@teste.local', 'tok-pendente-0000000000000000000000', now() + interval '7 days', NULL, '00000000-0000-0000-0000-0000000007a4'),
  ('00000000-0000-0000-0000-0000000008a1', 'equipe7@teste.local',   'tok-equipe-00000000000000000000000', now() + interval '7 days', NULL, '00000000-0000-0000-0000-0000000007a4'),
  ('00000000-0000-0000-0000-0000000008a2', 'Maria7@Teste.local',    'tok-maria-joao-0000000000000000000', now() + interval '7 days', NULL, '00000000-0000-0000-0000-0000000007a4'),
  ('00000000-0000-0000-0000-0000000008a2', ' JOAO7@teste.local ',   'tok-joao-maiusc-000000000000000000', now() + interval '7 days', NULL, '00000000-0000-0000-0000-0000000007a4'),
  ('00000000-0000-0000-0000-0000000008a1', 'ana7@teste.local',      'tok-ana-paciente-maria-00000000000', now() + interval '7 days', NULL, '00000000-0000-0000-0000-0000000007a4'),
  ('00000000-0000-0000-0000-0000000008a3', 'ana7@teste.local',      'curto', now() + interval '7 days', NULL, '00000000-0000-0000-0000-0000000007a4');

-- Executa _sql como anon (_uid NULL) ou como o usuário _uid; devolve o primeiro valor, 'vazio' ou a mensagem de erro.
CREATE FUNCTION pg_temp.como(_uid uuid, _sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  IF _uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    EXECUTE 'SET LOCAL ROLE anon';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', _uid::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
  END IF;
  BEGIN
    EXECUTE _sql INTO r;
    EXECUTE 'RESET ROLE';
    RETURN coalesce(r, 'vazio');
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RETURN SQLERRM;
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

-- validar_convite_portal (sem login)
SELECT pg_temp.esperar('Validar: convite válido devolve e-mail, primeiro nome e clínica',
  pg_temp.como(NULL, $q$SELECT email || '|' || primeiro_nome || '|' || clinica FROM public.validar_convite_portal('tok-valido-maria-0000000000000000000')$q$),
  'maria7@teste.local|Maria|Clinica Sete');
SELECT pg_temp.esperar('Validar: convite expirado não aparece',
  pg_temp.como(NULL, $q$SELECT email FROM public.validar_convite_portal('tok-expirado-0000000000000000000000')$q$), 'vazio');
SELECT pg_temp.esperar('Validar: convite usado não aparece',
  pg_temp.como(NULL, $q$SELECT email FROM public.validar_convite_portal('tok-usado-000000000000000000000000')$q$), 'vazio');
SELECT pg_temp.esperar('Validar: token curto é recusado',
  pg_temp.como(NULL, $q$SELECT email FROM public.validar_convite_portal('curto')$q$), 'vazio');
SELECT pg_temp.esperar('Validar: token nulo não devolve nada',
  pg_temp.como(NULL, $q$SELECT email FROM public.validar_convite_portal(NULL)$q$), 'vazio');

-- As tabelas continuam fechadas para quem não é da clínica
SELECT pg_temp.esperar('RLS: anon continua sem ler convites',
  pg_temp.como(NULL, $q$SELECT count(*)::text FROM public.patient_portal_invites$q$), '0');
SELECT pg_temp.esperar('RLS: paciente sem vínculo continua sem ler convites',
  pg_temp.como('00000000-0000-0000-0000-0000000007a1', $q$SELECT count(*)::text FROM public.patient_portal_invites$q$), '0');

-- vincular_convite_portal: recusas
-- Conferido por privilégio: executar como anon e capturar o erro derruba o Postgres local (segfault no harness).
SELECT pg_temp.esperar('Vincular: anon não pode executar',
  has_function_privilege('anon', 'public.vincular_convite_portal(text)', 'EXECUTE')::text, 'false');
SELECT pg_temp.esperar('Vincular: PUBLIC não pode executar',
  (SELECT count(*)::text FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid = 'public.vincular_convite_portal(text)'::regprocedure))
   WHERE grantee = 0), '0');
SELECT pg_temp.esperar('Vincular: usuário logado pode executar',
  has_function_privilege('authenticated', 'public.vincular_convite_portal(text)', 'EXECUTE')::text, 'true');
SELECT pg_temp.esperar('Validar: anon pode executar',
  has_function_privilege('anon', 'public.validar_convite_portal(text)', 'EXECUTE')::text, 'true');
SELECT pg_temp.esperar('Vincular: conta com outro e-mail é recusada',
  pg_temp.como('00000000-0000-0000-0000-0000000007a2', $q$SELECT public.vincular_convite_portal('tok-valido-maria-0000000000000000000')::text$q$),
  'email_diferente');
SELECT pg_temp.esperar('Vincular: e-mail não confirmado é recusado',
  pg_temp.como('00000000-0000-0000-0000-0000000007a3', $q$SELECT public.vincular_convite_portal('tok-pendente-0000000000000000000000')::text$q$),
  'email_nao_confirmado');
SELECT pg_temp.esperar('Vincular: conta da equipe é recusada',
  pg_temp.como('00000000-0000-0000-0000-0000000007a4', $q$SELECT public.vincular_convite_portal('tok-equipe-00000000000000000000000')::text$q$),
  'conta_da_equipe');
SELECT pg_temp.esperar('Vincular: convite expirado é recusado',
  pg_temp.como('00000000-0000-0000-0000-0000000007a1', $q$SELECT public.vincular_convite_portal('tok-expirado-0000000000000000000000')::text$q$),
  'convite_invalido');
SELECT pg_temp.esperar('Vincular: convite usado é recusado',
  pg_temp.como('00000000-0000-0000-0000-0000000007a1', $q$SELECT public.vincular_convite_portal('tok-usado-000000000000000000000000')::text$q$),
  'convite_invalido');
SELECT pg_temp.esperar('Vincular: recusas não criaram acesso',
  (SELECT count(*)::text FROM public.patient_portal_access WHERE patient_id = '00000000-0000-0000-0000-0000000008a1'), '0');

-- vincular_convite_portal: caminho feliz
SELECT pg_temp.esperar('Vincular: paciente com e-mail do convite fica vinculado',
  pg_temp.como('00000000-0000-0000-0000-0000000007a1', $q$SELECT public.vincular_convite_portal('tok-valido-maria-0000000000000000000')::text$q$),
  '00000000-0000-0000-0000-0000000008a1');
SELECT pg_temp.esperar('Vincular: convite marcado como usado',
  (SELECT (used_at IS NOT NULL)::text FROM public.patient_portal_invites WHERE token = 'tok-valido-maria-0000000000000000000'), 'true');
SELECT pg_temp.esperar('Vincular: acesso criado e ativo',
  (SELECT active::text FROM public.patient_portal_access WHERE user_id = '00000000-0000-0000-0000-0000000007a1'), 'true');
SELECT pg_temp.esperar('Portal: paciente vê o próprio acesso',
  pg_temp.como('00000000-0000-0000-0000-0000000007a1', $q$SELECT count(*)::text FROM public.patient_portal_access$q$), '1');
SELECT pg_temp.esperar('Portal: paciente vê só o próprio cadastro',
  pg_temp.como('00000000-0000-0000-0000-0000000007a1', $q$SELECT string_agg(id::text, ',') FROM public.patients$q$),
  '00000000-0000-0000-0000-0000000008a1');
SELECT pg_temp.esperar('Vincular: o mesmo convite não serve duas vezes',
  pg_temp.como('00000000-0000-0000-0000-0000000007a1', $q$SELECT public.vincular_convite_portal('tok-valido-maria-0000000000000000000')::text$q$),
  'convite_invalido');
SELECT pg_temp.esperar('Vincular: conta já ligada a outro paciente é recusada',
  pg_temp.como('00000000-0000-0000-0000-0000000007a1', $q$SELECT public.vincular_convite_portal('tok-maria-joao-0000000000000000000')::text$q$),
  'conta_ja_vinculada');
SELECT pg_temp.esperar('Vincular: paciente já ligado a outra conta é recusado',
  pg_temp.como('00000000-0000-0000-0000-0000000007a6', $q$SELECT public.vincular_convite_portal('tok-ana-paciente-maria-00000000000')::text$q$),
  'paciente_ja_vinculado');
SELECT pg_temp.esperar('Vincular: e-mail compara sem maiúsculas e espaços',
  pg_temp.como('00000000-0000-0000-0000-0000000007a5', $q$SELECT public.vincular_convite_portal('tok-joao-maiusc-000000000000000000')::text$q$),
  '00000000-0000-0000-0000-0000000008a2');

ROLLBACK;
