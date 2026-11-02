-- Reverte 20261102150000_vinculo_clinica_fonte_unica.sql (restaura funções e triggers anteriores).
-- Linhas de usuarios criadas pelo trigger de onboarding são mantidas (não apaga dados).

DROP TRIGGER IF EXISTS link_owner_to_new_clinic ON public.clinicas;
DROP FUNCTION IF EXISTS public.link_owner_to_new_clinic();

DROP TRIGGER IF EXISTS zz_mirror_profiles_clinic_id ON public.profiles;
DROP FUNCTION IF EXISTS public.mirror_profiles_clinic_id();

CREATE OR REPLACE FUNCTION public.sync_usuarios_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clinica_id IS NOT NULL THEN
    UPDATE public.profiles
    SET clinic_id = NEW.clinica_id
    WHERE id = NEW.id
    AND (clinic_id IS DISTINCT FROM NEW.clinica_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_profiles_to_usuarios ON public.profiles;
CREATE TRIGGER sync_profiles_to_usuarios
AFTER INSERT OR UPDATE OF clinic_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_to_usuarios();

CREATE OR REPLACE FUNCTION public.get_user_clinic_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT clinic_id FROM public.profiles WHERE id = _user_id LIMIT 1),
    (SELECT clinica_id FROM public.usuarios WHERE id = _user_id LIMIT 1)
  );
$function$;
