-- Teste de verificação de 20261102130000_procedimentos_por_clinica.sql
-- Roda tudo dentro de uma transação e faz ROLLBACK no final: não deixa dados.
-- Uso: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/verificacoes/20261102130000_procedimentos_por_clinica.test.sql
-- Saída esperada: apenas linhas "OK ..."; qualquer falha aborta com "FALHA ...".

BEGIN;

-- Cenário: clínica A (admin A + recepção R), clínica V (admin V), super admin S
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
  ('00000000-0000-0000-0000-0000000001a1', 'adminA@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000001a2', 'recepA@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000001b1', 'adminV@teste.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000001c1', 'super@teste.local', '{}', 'authenticated', 'authenticated');

INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, 'Teste', u.email FROM auth.users u WHERE u.email LIKE '%@teste.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clinicas (id, nome, owner_user_id) VALUES
  ('00000000-0000-0000-0000-00000000ca0a', 'Clinica A', '00000000-0000-0000-0000-0000000001a1'),
  ('00000000-0000-0000-0000-00000000ca0b', 'Clinica V', '00000000-0000-0000-0000-0000000001b1');

INSERT INTO public.usuarios (id, clinica_id, nome, email, perfil) VALUES
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000ca0a', 'Admin A', 'adminA@teste.local', 'admin'),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-00000000ca0a', 'Recep A', 'recepA@teste.local', 'recepcao'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-00000000ca0b', 'Admin V', 'adminV@teste.local', 'admin')
ON CONFLICT (id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id, perfil = EXCLUDED.perfil;

UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000ca0a'
WHERE id IN ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000001a2');
UPDATE public.profiles SET clinic_id = '00000000-0000-0000-0000-00000000ca0b'
WHERE id = '00000000-0000-0000-0000-0000000001b1';

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-0000000001c1', 'super_admin');

-- Procedimentos: um do sistema (G) e um da clínica V (PV)
INSERT INTO public.procedimentos (id, codigo_sistema, especialidade, descricao, valor, clinica_id) VALUES
  ('00000000-0000-0000-0000-0000000009a1', 'TESTE-SYS-1', 'Geral', 'Sistema', 100, NULL),
  ('00000000-0000-0000-0000-0000000009b1', 'TESTE-V-1', 'Geral', 'Da clinica V', 200, '00000000-0000-0000-0000-00000000ca0b');

INSERT INTO public.planos_procedimentos (id, clinica_id, nome) VALUES
  ('00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-00000000ca0a', 'Plano Teste A');

-- Helper: executa como usuário e retorna nº de linhas afetadas/lidas, ou 'bloqueado'
CREATE FUNCTION pg_temp.como(_uid uuid, _sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  IF _uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    EXECUTE 'SET LOCAL ROLE anon';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', _uid::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
  END IF;
  BEGIN
    EXECUTE _sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    EXECUTE 'RESET ROLE';
    RETURN n::text;
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN
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

-- Leitura
SELECT pg_temp.esperar('A nao ve procedimento da clinica V',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$SELECT 1 FROM public.procedimentos WHERE id = '00000000-0000-0000-0000-0000000009b1'$q$), '0');

SELECT pg_temp.esperar('A ve procedimento do sistema',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$SELECT 1 FROM public.procedimentos WHERE id = '00000000-0000-0000-0000-0000000009a1'$q$), '1');

SELECT pg_temp.esperar('anon nao le catalogo',
  pg_temp.como(NULL, $q$SELECT 1 FROM public.procedimentos$q$), '0');

-- Escrita no catálogo do sistema e na clínica alheia
SELECT pg_temp.esperar('Admin A nao altera procedimento do sistema',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$UPDATE public.procedimentos SET valor = 1 WHERE id = '00000000-0000-0000-0000-0000000009a1'$q$), '0');

SELECT pg_temp.esperar('Admin A nao apaga procedimento do sistema',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$DELETE FROM public.procedimentos WHERE id = '00000000-0000-0000-0000-0000000009a1'$q$), '0');

SELECT pg_temp.esperar('Admin A nao altera procedimento da clinica V',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$UPDATE public.procedimentos SET valor = 1 WHERE id = '00000000-0000-0000-0000-0000000009b1'$q$), '0');

SELECT pg_temp.esperar('Valor do sistema intacto',
  (SELECT valor::int::text FROM public.procedimentos WHERE id = '00000000-0000-0000-0000-0000000009a1'), '100');

SELECT pg_temp.esperar('A nao insere procedimento na clinica V',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$INSERT INTO public.procedimentos (codigo_sistema, especialidade, descricao, valor, clinica_id)
       VALUES ('TESTE-X', 'Geral', 'x', 1, '00000000-0000-0000-0000-00000000ca0b')$q$), 'bloqueado');

SELECT pg_temp.esperar('A nao insere no catalogo do sistema (clinica_id NULL)',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$INSERT INTO public.procedimentos (codigo_sistema, especialidade, descricao, valor, clinica_id)
       VALUES ('TESTE-Y', 'Geral', 'y', 1, NULL)$q$), 'bloqueado');

-- Fluxo do app: insert sem clinica_id recebe a clínica de quem cria
SELECT pg_temp.esperar('Recepcao A cria procedimento sem informar clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000001a2',
    $q$INSERT INTO public.procedimentos (codigo_sistema, especialidade, descricao, valor)
       VALUES ('TESTE-A-1', 'Geral', 'Da clinica A', 50)$q$), '1');

SELECT pg_temp.esperar('DEFAULT atribuiu a clinica A',
  (SELECT clinica_id::text FROM public.procedimentos WHERE codigo_sistema = 'TESTE-A-1'),
  '00000000-0000-0000-0000-00000000ca0a');

SELECT pg_temp.esperar('Admin A ve o proprio procedimento',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$SELECT 1 FROM public.procedimentos WHERE codigo_sistema = 'TESTE-A-1'$q$), '1');

SELECT pg_temp.esperar('Admin V nao ve procedimento da clinica A',
  pg_temp.como('00000000-0000-0000-0000-0000000001b1',
    $q$SELECT 1 FROM public.procedimentos WHERE codigo_sistema = 'TESTE-A-1'$q$), '0');

SELECT pg_temp.esperar('Recepcao A edita procedimento da propria clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000001a2',
    $q$UPDATE public.procedimentos SET valor = 60 WHERE codigo_sistema = 'TESTE-A-1'$q$), '1');

-- Códigos
SELECT pg_temp.esperar('Clinica nao repete codigo do sistema',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$INSERT INTO public.procedimentos (codigo_sistema, especialidade, descricao, valor)
       VALUES ('TESTE-SYS-1', 'Geral', 'copia', 1)$q$), 'bloqueado');

SELECT pg_temp.esperar('Clinica A pode usar codigo que a clinica V usa',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$INSERT INTO public.procedimentos (codigo_sistema, especialidade, descricao, valor)
       VALUES ('TESTE-V-1', 'Geral', 'Da clinica A tambem', 1)$q$), '1');

SELECT pg_temp.esperar('Clinica nao repete o proprio codigo',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$INSERT INTO public.procedimentos (codigo_sistema, especialidade, descricao, valor)
       VALUES ('TESTE-A-1', 'Geral', 'dup', 1)$q$), 'bloqueado');

-- Planos: vínculo cruzado
SELECT pg_temp.esperar('A nao vincula procedimento da clinica V ao seu plano',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$INSERT INTO public.planos_procedimentos_itens (plano_id, procedimento_id, valor_customizado)
       VALUES ('00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-0000000009b1', 1)$q$), 'bloqueado');

SELECT pg_temp.esperar('A vincula procedimento do sistema ao seu plano',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$INSERT INTO public.planos_procedimentos_itens (plano_id, procedimento_id, valor_customizado)
       VALUES ('00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-0000000009a1', 1)$q$), '1');

-- Exclusão: só admin da própria clínica
SELECT pg_temp.esperar('Recepcao A nao apaga procedimento',
  pg_temp.como('00000000-0000-0000-0000-0000000001a2',
    $q$DELETE FROM public.procedimentos WHERE codigo_sistema = 'TESTE-A-1'$q$), '0');

SELECT pg_temp.esperar('Admin V nao apaga procedimento da clinica A',
  pg_temp.como('00000000-0000-0000-0000-0000000001b1',
    $q$DELETE FROM public.procedimentos WHERE codigo_sistema = 'TESTE-A-1'$q$), '0');

SELECT pg_temp.esperar('Admin A apaga procedimento da propria clinica',
  pg_temp.como('00000000-0000-0000-0000-0000000001a1',
    $q$DELETE FROM public.procedimentos WHERE codigo_sistema = 'TESTE-A-1'$q$), '1');

-- A2: is_clinic_admin considera a clínica
SELECT pg_temp.esperar('is_clinic_admin(admin A, clinica A)',
  public.is_clinic_admin('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000ca0a')::text, 'true');
SELECT pg_temp.esperar('is_clinic_admin(admin A, clinica V)',
  public.is_clinic_admin('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000ca0b')::text, 'false');
SELECT pg_temp.esperar('is_clinic_admin(recepcao A, clinica A)',
  public.is_clinic_admin('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-00000000ca0a')::text, 'false');

-- Super admin mantém o catálogo do sistema
SELECT pg_temp.esperar('Super admin altera procedimento do sistema',
  pg_temp.como('00000000-0000-0000-0000-0000000001c1',
    $q$UPDATE public.procedimentos SET valor = 110 WHERE id = '00000000-0000-0000-0000-0000000009a1'$q$), '1');

SELECT pg_temp.esperar('Super admin insere no catalogo do sistema',
  pg_temp.como('00000000-0000-0000-0000-0000000001c1',
    $q$INSERT INTO public.procedimentos (codigo_sistema, especialidade, descricao, valor, clinica_id)
       VALUES ('TESTE-SYS-2', 'Geral', 'Sistema 2', 1, NULL)$q$), '1');

-- Dados existentes continuam no catálogo do sistema
SELECT pg_temp.esperar('Nenhum procedimento pre-existente ganhou clinica',
  (SELECT count(*)::text FROM public.procedimentos
   WHERE clinica_id IS NOT NULL AND codigo_sistema NOT LIKE 'TESTE-%'), '0');

ROLLBACK;
