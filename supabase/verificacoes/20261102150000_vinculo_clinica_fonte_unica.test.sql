-- Teste de verificação de 20261102150000_vinculo_clinica_fonte_unica.sql
-- Roda tudo dentro de uma transação e faz ROLLBACK no final: não deixa dados.
-- Uso: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/verificacoes/20261102150000_vinculo_clinica_fonte_unica.test.sql
-- Saída esperada: apenas linhas "OK ..."; qualquer falha aborta com "FALHA ...".

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
  ('00000000-0000-0000-0000-0000000004a1', 'membro4@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000004b1', 'novo4@teste.local', '{"full_name":"Dono Novo"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000004c1', 'super4@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000004d1', 'convidado4@teste.local', '{}', 'authenticated', 'authenticated');

INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, 'Teste', u.email FROM auth.users u WHERE u.email LIKE '%4@teste.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-0000000004c1', 'super_admin');

INSERT INTO public.clinicas (id, nome, owner_user_id) VALUES
  ('00000000-0000-0000-0000-00000000cc0a', 'Clinica A', NULL),
  ('00000000-0000-0000-0000-00000000cc0b', 'Clinica B', NULL);

INSERT INTO public.usuarios (id, clinica_id, nome, email, perfil) VALUES
  ('00000000-0000-0000-0000-0000000004a1', '00000000-0000-0000-0000-00000000cc0a', 'Membro', 'membro4@teste.local', 'recepcao');

INSERT INTO public.patients (id, clinic_id, full_name, phone) VALUES
  ('00000000-0000-0000-0000-0000000006a1', '00000000-0000-0000-0000-00000000cc0a', 'Paciente A', '11900000004');

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

-- Espelho e fonte única
SELECT pg_temp.esperar('Sync: profiles do membro recebeu a clinica de usuarios',
  (SELECT clinic_id::text FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000004a1'),
  '00000000-0000-0000-0000-00000000cc0a');

UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000cc0b'
WHERE id = '00000000-0000-0000-0000-0000000004a1';
SELECT pg_temp.esperar('Espelho: escrita privilegiada em profiles nao diverge de usuarios',
  (SELECT clinic_id::text FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000004a1'),
  '00000000-0000-0000-0000-00000000cc0a');

ALTER TABLE public.profiles DISABLE TRIGGER zz_mirror_profiles_clinic_id;
UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000cc0b'
WHERE id = '00000000-0000-0000-0000-0000000004a1';
ALTER TABLE public.profiles ENABLE TRIGGER zz_mirror_profiles_clinic_id;
SELECT pg_temp.esperar('Fonte unica: com divergencia forcada, get_user_clinic_id segue usuarios',
  public.get_user_clinic_id('00000000-0000-0000-0000-0000000004a1')::text,
  '00000000-0000-0000-0000-00000000cc0a');
UPDATE public.profiles SET clinic_id = NULL WHERE id = '00000000-0000-0000-0000-0000000004a1';

SELECT pg_temp.esperar('Sync nao volta de profiles para usuarios',
  (SELECT clinica_id::text FROM public.usuarios WHERE id = '00000000-0000-0000-0000-0000000004a1'),
  '00000000-0000-0000-0000-00000000cc0a');

-- Onboarding completo, como o cliente faz (Clinica.tsx / Profissional.tsx)
SELECT pg_temp.esperar('Onboarding: dono novo cria clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000004b1',
    $q$INSERT INTO public.clinicas (id, nome, owner_user_id)
       VALUES ('00000000-0000-0000-0000-00000000cc0c', 'Clinica Nova', '00000000-0000-0000-0000-0000000004b1')$q$), '1');

SELECT pg_temp.esperar('Onboarding: dono ganhou linha em usuarios como admin',
  (SELECT clinica_id::text || ' ' || perfil::text || ' ' || nome FROM public.usuarios WHERE id = '00000000-0000-0000-0000-0000000004b1'),
  '00000000-0000-0000-0000-00000000cc0c admin Dono Novo');

SELECT pg_temp.esperar('Onboarding: profiles espelhado',
  (SELECT clinic_id::text FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000004b1'),
  '00000000-0000-0000-0000-00000000cc0c');

SELECT pg_temp.esperar('Onboarding: is_clinic_admin do dono',
  public.is_clinic_admin('00000000-0000-0000-0000-0000000004b1', '00000000-0000-0000-0000-00000000cc0c')::text, 'true');

SELECT pg_temp.esperar('Onboarding: update de profiles do cliente continua aceito',
  pg_temp.como('00000000-0000-0000-0000-0000000004b1',
    $q$UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000cc0c' WHERE id = '00000000-0000-0000-0000-0000000004b1'$q$), '1');

SELECT pg_temp.esperar('Onboarding: update de usuarios do cliente continua aceito',
  pg_temp.como('00000000-0000-0000-0000-0000000004b1',
    $q$UPDATE public.usuarios SET clinica_id = '00000000-0000-0000-0000-00000000cc0c' WHERE id = '00000000-0000-0000-0000-0000000004b1'$q$), '1');

SELECT pg_temp.esperar('Onboarding: dono le a propria linha (Profissional.tsx pula o insert)',
  pg_temp.como('00000000-0000-0000-0000-0000000004b1',
    $q$SELECT id FROM public.usuarios WHERE id = '00000000-0000-0000-0000-0000000004b1'$q$), '1');

SELECT pg_temp.esperar('Onboarding: dono grava dado de admin na propria clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000004b1',
    $q$INSERT INTO public.categorias_procedimentos (clinica_id, nome)
       VALUES ('00000000-0000-0000-0000-00000000cc0c', 'Categoria teste')$q$), '1');

-- Dono que já tem clínica não é revinculado ao criar outra
SELECT pg_temp.esperar('Dono com clinica cria segunda clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000004b1',
    $q$INSERT INTO public.clinicas (id, nome, owner_user_id)
       VALUES ('00000000-0000-0000-0000-00000000cc0d', 'Segunda', '00000000-0000-0000-0000-0000000004b1')$q$), '1');
SELECT pg_temp.esperar('Dono continua na primeira clinica',
  public.get_user_clinic_id('00000000-0000-0000-0000-0000000004b1')::text,
  '00000000-0000-0000-0000-00000000cc0c');

-- Super admin criando clínica (admin/Clinics.tsx) não vira membro dela
SELECT pg_temp.esperar('Super admin cria clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000004c1',
    $q$INSERT INTO public.clinicas (id, nome, owner_user_id)
       VALUES ('00000000-0000-0000-0000-00000000cc0e', 'Do super', '00000000-0000-0000-0000-0000000004c1')$q$), '1');
SELECT pg_temp.esperar('Super admin sem linha em usuarios',
  (SELECT count(*)::text FROM public.usuarios WHERE id = '00000000-0000-0000-0000-0000000004c1'), '0');

-- Convite (invite-user, service_role): linha em usuarios propaga para profiles
INSERT INTO public.usuarios (id, clinica_id, nome, email, perfil) VALUES
  ('00000000-0000-0000-0000-0000000004d1', '00000000-0000-0000-0000-00000000cc0a', 'Convidado', 'convidado4@teste.local', 'dentista');
SELECT pg_temp.esperar('Convite: profiles do convidado espelhado',
  (SELECT clinic_id::text FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000004d1'),
  '00000000-0000-0000-0000-00000000cc0a');

-- Remoção da clínica (clinica_id NULL) propaga e corta o acesso
SELECT pg_temp.esperar('Membro ve paciente antes da remocao',
  pg_temp.como('00000000-0000-0000-0000-0000000004a1',
    $q$SELECT 1 FROM public.patients WHERE id = '00000000-0000-0000-0000-0000000006a1'$q$), '1');
UPDATE public.usuarios SET clinica_id = NULL WHERE id = '00000000-0000-0000-0000-0000000004a1';
SELECT pg_temp.esperar('Remocao: profiles tambem ficou sem clinica',
  coalesce((SELECT clinic_id::text FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000004a1'), 'NULL'), 'NULL');
SELECT pg_temp.esperar('Remocao: membro nao ve mais o paciente',
  pg_temp.como('00000000-0000-0000-0000-0000000004a1',
    $q$SELECT 1 FROM public.patients WHERE id = '00000000-0000-0000-0000-0000000006a1'$q$), '0');

ROLLBACK;
