-- Aceite do convite do Portal do Paciente (PENDENCIAS P4.12)
--
-- Problema: a tela /portal/auth lia patient_portal_invites pelo token sem login, mas a única policy da
-- tabela é da equipe da clínica (o paciente sempre via "Convite inválido"); e patient_portal_access só
-- aceita INSERT de admin da clínica, então o vínculo paciente ↔ conta nunca era criado.
--
-- Solução: duas funções SECURITY DEFINER, sem abrir as tabelas por RLS.
--   validar_convite_portal(token): devolve só o necessário para a tela de cadastro (e-mail do convite,
--     primeiro nome do paciente e nome da clínica) quando o convite existe, não foi usado e não expirou.
--   vincular_convite_portal(token): com o usuário logado, cria o acesso ao portal e marca o convite como
--     usado. Exige que o e-mail (confirmado) da conta seja o mesmo do convite.
--
-- Não altera tabelas, policies nem dados. Rollback: supabase/rollbacks/20261124100000_aceite_convite_portal.down.sql
-- Teste: supabase/verificacoes/20261124100000_aceite_convite_portal.test.sql

CREATE OR REPLACE FUNCTION public.validar_convite_portal(_token text)
RETURNS TABLE (email text, primeiro_nome text, clinica text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.email,
         split_part(btrim(p.full_name), ' ', 1),
         c.nome
  FROM public.patient_portal_invites i
  JOIN public.patients p ON p.id = i.patient_id
  LEFT JOIN public.clinicas c ON c.id = p.clinic_id
  WHERE _token IS NOT NULL
    AND length(_token) >= 32
    AND i.token = _token
    AND i.used_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.validar_convite_portal(text) IS
  'Portal do paciente: confere um convite pelo token (sem login) e devolve e-mail, primeiro nome e clínica.';

-- Erros devolvidos (a tela traduz):
--   nao_autenticado, convite_invalido, email_diferente, email_nao_confirmado,
--   conta_da_equipe, paciente_ja_vinculado, conta_ja_vinculada
CREATE OR REPLACE FUNCTION public.vincular_convite_portal(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _convite public.patient_portal_invites%ROWTYPE;
  _email text;
  _confirmado timestamptz;
  _acesso public.patient_portal_access%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _convite
  FROM public.patient_portal_invites
  WHERE token = _token
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'convite_invalido' USING ERRCODE = 'P0001';
  END IF;

  SELECT u.email, u.email_confirmed_at INTO _email, _confirmado
  FROM auth.users u
  WHERE u.id = _uid;

  IF lower(btrim(coalesce(_email, ''))) <> lower(btrim(_convite.email)) THEN
    RAISE EXCEPTION 'email_diferente' USING ERRCODE = 'P0001';
  END IF;

  IF _confirmado IS NULL THEN
    RAISE EXCEPTION 'email_nao_confirmado' USING ERRCODE = 'P0001';
  END IF;

  -- Conta da equipe de uma clínica não vira conta de paciente.
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = _uid)
     OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'conta_da_equipe' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO _acesso FROM public.patient_portal_access WHERE patient_id = _convite.patient_id;
  IF FOUND AND _acesso.user_id <> _uid THEN
    RAISE EXCEPTION 'paciente_ja_vinculado' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.patient_portal_access
    WHERE user_id = _uid AND patient_id <> _convite.patient_id
  ) THEN
    RAISE EXCEPTION 'conta_ja_vinculada' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.patient_portal_access (patient_id, user_id, active)
  VALUES (_convite.patient_id, _uid, true)
  ON CONFLICT (patient_id) DO UPDATE SET active = true;

  UPDATE public.patient_portal_invites SET used_at = now() WHERE id = _convite.id;

  RETURN _convite.patient_id;
END;
$$;

COMMENT ON FUNCTION public.vincular_convite_portal(text) IS
  'Portal do paciente: liga a conta logada ao paciente do convite (e-mail igual e confirmado) e marca o convite como usado.';

-- O Supabase concede EXECUTE a anon/authenticated por padrão: revogar tudo e conceder só o necessário.
REVOKE ALL ON FUNCTION public.validar_convite_portal(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vincular_convite_portal(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_convite_portal(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_convite_portal(text) TO authenticated;
