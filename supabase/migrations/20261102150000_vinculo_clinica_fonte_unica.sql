-- Auditoria A8: duas fontes para "a clínica do usuário" (profiles.clinic_id e usuarios.clinica_id).
-- get_user_clinic_id lia profiles primeiro; parte das policies usa profiles, parte usa usuarios.
--
-- Novo modelo: usuarios.clinica_id é a fonte única.
--   * get_user_clinic_id lê só usuarios.
--   * profiles.clinic_id vira espelho: um trigger BEFORE sempre copia o valor de usuarios
--     (as 17 policies que ainda leem profiles continuam corretas sem reescrita).
--   * Sincronização profiles -> usuarios removida; usuarios -> profiles passa a propagar NULL.
--   * Onboarding: ao criar uma clínica, o dono ganha a linha em usuarios como admin no servidor.
--     Antes, o insert do cliente em usuarios falhava (ins_usuarios_admin exige já ser admin) e o
--     dono novo ficava sem perfil.
--
-- Pré-condição verificada em produção (2026-11-02): nenhum profiles com clínica sem linha em usuarios,
-- e nenhuma divergência entre profiles.clinic_id e usuarios.clinica_id.
--
-- Rollback: supabase/rollbacks/20261102150000_vinculo_clinica_fonte_unica.down.sql

-- 1. Fonte única
CREATE OR REPLACE FUNCTION public.get_user_clinic_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT clinica_id FROM public.usuarios WHERE id = _user_id LIMIT 1;
$function$;

-- 2. profiles.clinic_id espelha usuarios.clinica_id
CREATE OR REPLACE FUNCTION public.mirror_profiles_clinic_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clinica uuid;
  _found boolean;
BEGIN
  SELECT u.clinica_id, true INTO _clinica, _found
  FROM public.usuarios u WHERE u.id = NEW.id;

  IF _found THEN
    NEW.clinic_id := _clinica;
  END IF;
  RETURN NEW;
END;
$$;

-- Nome começa com "z" para rodar depois de guard_profiles_clinic_id (triggers BEFORE disparam em
-- ordem alfabética): o guard continua rejeitando tentativas do cliente de trocar de clínica.
DROP TRIGGER IF EXISTS zz_mirror_profiles_clinic_id ON public.profiles;
CREATE TRIGGER zz_mirror_profiles_clinic_id
  BEFORE INSERT OR UPDATE OF clinic_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.mirror_profiles_clinic_id();

DROP TRIGGER IF EXISTS sync_profiles_to_usuarios ON public.profiles;

CREATE OR REPLACE FUNCTION public.sync_usuarios_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET clinic_id = NEW.clinica_id
  WHERE id = NEW.id
    AND clinic_id IS DISTINCT FROM NEW.clinica_id;
  RETURN NEW;
END;
$$;

-- 3. Dono da clínica nova vira admin dela (se ainda não pertence a nenhuma clínica)
CREATE OR REPLACE FUNCTION public.link_owner_to_new_clinic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nome text;
  _email text;
BEGIN
  IF NEW.owner_user_id IS NULL OR public.is_super_admin(NEW.owner_user_id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = NEW.owner_user_id AND clinica_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(p.full_name, ''), 'Administrador'), COALESCE(p.email, au.email)
  INTO _nome, _email
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE au.id = NEW.owner_user_id;

  IF _email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usuarios (id, clinica_id, nome, email, perfil)
  VALUES (NEW.owner_user_id, NEW.id, _nome, _email, 'admin')
  ON CONFLICT (id) DO UPDATE
    SET clinica_id = EXCLUDED.clinica_id,
        perfil = 'admin'
    WHERE public.usuarios.clinica_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_owner_to_new_clinic ON public.clinicas;
CREATE TRIGGER link_owner_to_new_clinic
  AFTER INSERT ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.link_owner_to_new_clinic();
