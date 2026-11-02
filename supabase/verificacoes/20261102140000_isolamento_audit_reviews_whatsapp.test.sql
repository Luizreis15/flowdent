-- Teste de verificação de 20261102140000_isolamento_audit_reviews_whatsapp.sql
-- Roda tudo dentro de uma transação e faz ROLLBACK no final: não deixa dados.
-- Uso: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/verificacoes/20261102140000_isolamento_audit_reviews_whatsapp.test.sql
-- Saída esperada: apenas linhas "OK ..."; qualquer falha aborta com "FALHA ...".

BEGIN;

-- Cenário: clínica A (admin A + recepção R), clínica V (admin V)
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
  ('00000000-0000-0000-0000-0000000002a1', 'adminA3@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000002a2', 'recepA3@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000002b1', 'adminV3@teste.local', '{}', 'authenticated', 'authenticated');

INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, 'Teste', u.email FROM auth.users u WHERE u.email LIKE '%3@teste.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clinicas (id, nome, owner_user_id) VALUES
  ('00000000-0000-0000-0000-00000000cb0a', 'Clinica A', '00000000-0000-0000-0000-0000000002a1'),
  ('00000000-0000-0000-0000-00000000cb0b', 'Clinica V', '00000000-0000-0000-0000-0000000002b1');

INSERT INTO public.usuarios (id, clinica_id, nome, email, perfil) VALUES
  ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-00000000cb0a', 'Admin A', 'adminA3@teste.local', 'admin'),
  ('00000000-0000-0000-0000-0000000002a2', '00000000-0000-0000-0000-00000000cb0a', 'Recep A', 'recepA3@teste.local', 'recepcao'),
  ('00000000-0000-0000-0000-0000000002b1', '00000000-0000-0000-0000-00000000cb0b', 'Admin V', 'adminV3@teste.local', 'admin')
ON CONFLICT (id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id, perfil = EXCLUDED.perfil;

UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000cb0a'
WHERE id IN ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000002a2');
UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000cb0b'
WHERE id = '00000000-0000-0000-0000-0000000002b1';

INSERT INTO public.patients (id, clinic_id, full_name, phone) VALUES
  ('00000000-0000-0000-0000-0000000007a1', '00000000-0000-0000-0000-00000000cb0a', 'Paciente A', '11900000001'),
  ('00000000-0000-0000-0000-0000000007b1', '00000000-0000-0000-0000-00000000cb0b', 'Paciente V', '11900000002');

INSERT INTO public.role_audit_log (user_id, changed_by, old_role, new_role) VALUES
  ('00000000-0000-0000-0000-0000000002a2', '00000000-0000-0000-0000-0000000002a1', 'assistente', 'recepcao'),
  ('00000000-0000-0000-0000-0000000002b1', '00000000-0000-0000-0000-0000000002b1', 'assistente', 'admin');

INSERT INTO public.whatsapp_configs (clinica_id, connection_type, instance_id, instance_token, client_token, is_active)
VALUES ('00000000-0000-0000-0000-00000000cb0a', 'web_qrcode', 'INST-A', 'segredo-a', 'cliente-a', true);

CREATE FUNCTION pg_temp.como(_uid uuid, _sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', _uid::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    EXECUTE _sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    EXECUTE 'RESET ROLE';
    RETURN n::text;
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

-- A3: log de perfis
SELECT pg_temp.esperar('A3 admin A ve log da propria clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000002a1',
    $q$SELECT 1 FROM public.role_audit_log WHERE user_id = '00000000-0000-0000-0000-0000000002a2'$q$), '1');

SELECT pg_temp.esperar('A3 admin A nao ve log da clinica V',
  pg_temp.como('00000000-0000-0000-0000-0000000002a1',
    $q$SELECT 1 FROM public.role_audit_log WHERE user_id = '00000000-0000-0000-0000-0000000002b1'$q$), '0');

SELECT pg_temp.esperar('A3 recepcao A nao ve log',
  pg_temp.como('00000000-0000-0000-0000-0000000002a2',
    $q$SELECT 1 FROM public.role_audit_log$q$), '0');

-- A4: avaliações
SELECT pg_temp.esperar('A4 A nao cria avaliacao na clinica V',
  pg_temp.como('00000000-0000-0000-0000-0000000002a1',
    $q$INSERT INTO public.reviews (clinic_id, patient_id, rating)
       VALUES ('00000000-0000-0000-0000-00000000cb0b', '00000000-0000-0000-0000-0000000007b1', 1)$q$), 'bloqueado');

SELECT pg_temp.esperar('A4 A nao cria avaliacao com paciente da clinica V',
  pg_temp.como('00000000-0000-0000-0000-0000000002a1',
    $q$INSERT INTO public.reviews (clinic_id, patient_id, rating)
       VALUES ('00000000-0000-0000-0000-00000000cb0a', '00000000-0000-0000-0000-0000000007b1', 1)$q$), 'bloqueado');

SELECT pg_temp.esperar('A4 A cria avaliacao do proprio paciente',
  pg_temp.como('00000000-0000-0000-0000-0000000002a2',
    $q$INSERT INTO public.reviews (clinic_id, patient_id, rating)
       VALUES ('00000000-0000-0000-0000-00000000cb0a', '00000000-0000-0000-0000-0000000007a1', 5)$q$), '1');

-- A6: config/tokens do WhatsApp
SELECT pg_temp.esperar('A6 recepcao A le is_active (CRM)',
  pg_temp.como('00000000-0000-0000-0000-0000000002a2',
    $q$SELECT is_active FROM public.whatsapp_configs WHERE clinica_id = '00000000-0000-0000-0000-00000000cb0a'$q$), '1');

SELECT pg_temp.esperar('A6 recepcao A nao le instance_token',
  pg_temp.como('00000000-0000-0000-0000-0000000002a2',
    $q$SELECT instance_token FROM public.whatsapp_configs$q$), 'bloqueado');

SELECT pg_temp.esperar('A6 admin A tambem nao le client_token pelo cliente',
  pg_temp.como('00000000-0000-0000-0000-0000000002a1',
    $q$SELECT client_token FROM public.whatsapp_configs$q$), 'bloqueado');

SELECT pg_temp.esperar('A6 select * bloqueado (colunas secretas)',
  pg_temp.como('00000000-0000-0000-0000-0000000002a1',
    $q$SELECT * FROM public.whatsapp_configs$q$), 'bloqueado');

SELECT pg_temp.esperar('A6 admin V nao ve config da clinica A',
  pg_temp.como('00000000-0000-0000-0000-0000000002b1',
    $q$SELECT id FROM public.whatsapp_configs WHERE clinica_id = '00000000-0000-0000-0000-00000000cb0a'$q$), '0');

SELECT pg_temp.esperar('A6 recepcao A nao altera config',
  pg_temp.como('00000000-0000-0000-0000-0000000002a2',
    $q$UPDATE public.whatsapp_configs SET is_active = false WHERE clinica_id = '00000000-0000-0000-0000-00000000cb0a'$q$), '0');

SELECT pg_temp.esperar('A6 admin A atualiza tokens e segredo do webhook (fluxo do modal)',
  pg_temp.como('00000000-0000-0000-0000-0000000002a1',
    $q$UPDATE public.whatsapp_configs
       SET instance_id = 'INST-A', instance_token = 'novo', webhook_verify_token = 'v', is_active = true
       WHERE clinica_id = '00000000-0000-0000-0000-00000000cb0a'$q$), '1');

SELECT pg_temp.esperar('A6 admin V nao cria config para a clinica A',
  pg_temp.como('00000000-0000-0000-0000-0000000002b1',
    $q$INSERT INTO public.whatsapp_configs (clinica_id, connection_type, instance_id, instance_token)
       VALUES ('00000000-0000-0000-0000-00000000cb0a', 'web_qrcode', 'X', 'Y')$q$), 'bloqueado');

SELECT pg_temp.esperar('A6 admin V cria config da propria clinica (fluxo do modal)',
  pg_temp.como('00000000-0000-0000-0000-0000000002b1',
    $q$INSERT INTO public.whatsapp_configs (clinica_id, connection_type, instance_id, instance_token, is_active)
       VALUES ('00000000-0000-0000-0000-00000000cb0b', 'web_qrcode', 'INST-V', 'tok', false)$q$), '1');

SELECT pg_temp.esperar('A6 service_role/conexao direta le token',
  (SELECT instance_token FROM public.whatsapp_configs WHERE instance_id = 'INST-A'), 'novo');

ROLLBACK;
