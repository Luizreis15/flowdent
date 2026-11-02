-- CRÍTICO (auditoria A1): usuário autenticado podia trocar o próprio profiles.clinic_id
-- (policy de UPDATE em profiles não restringe colunas) e, como get_user_clinic_id()
-- lê profiles primeiro, passava a acessar dados de qualquer clínica.
-- (auditoria A7): admin de clínica podia alterar plano/assinatura/vencimento em clinicas,
-- e o INSERT do onboarding aceitava status/vencimento escolhidos pelo cliente.
--
-- Requisições privilegiadas passam livres: service_role (edge functions), conexões diretas
-- (SQL editor, migrations) e funções SECURITY DEFINER — em todas, current_user não é
-- 'authenticated'/'anon'. As funções de trigger abaixo NÃO são SECURITY DEFINER de propósito,
-- para que current_user reflita o papel real da requisição.
--
-- Rollback: supabase/rollbacks/20261102120000_guard_clinic_membership_and_billing.down.sql

-- 1. profiles.clinic_id / usuarios.clinica_id: só NULL -> clínica da qual o usuário é dono
CREATE OR REPLACE FUNCTION public.guard_profiles_clinic_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.clinic_id IS NOT DISTINCT FROM OLD.clinic_id THEN
    RETURN NEW;
  END IF;

  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Onboarding: usuário sem clínica se vincula à clínica que acabou de criar
  IF OLD.clinic_id IS NULL AND EXISTS (
    SELECT 1 FROM public.clinicas c
    WHERE c.id = NEW.clinic_id
      AND c.owner_user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Alteração de clínica do usuário não permitida'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_clinic_id ON public.profiles;
CREATE TRIGGER guard_profiles_clinic_id
  BEFORE UPDATE OF clinic_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_clinic_id();

CREATE OR REPLACE FUNCTION public.guard_usuarios_clinica_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.clinica_id IS NOT DISTINCT FROM OLD.clinica_id THEN
    RETURN NEW;
  END IF;

  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF OLD.clinica_id IS NULL
    AND NEW.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.clinicas c
      WHERE c.id = NEW.clinica_id
        AND c.owner_user_id = auth.uid()
    ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Alteração de clínica do usuário não permitida'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS guard_usuarios_clinica_id ON public.usuarios;
CREATE TRIGGER guard_usuarios_clinica_id
  BEFORE UPDATE OF clinica_id ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.guard_usuarios_clinica_id();

-- 2. clinicas: colunas de cobrança/propriedade só via service_role ou super admin
CREATE OR REPLACE FUNCTION public.guard_clinicas_billing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon')
    OR public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Onboarding pelo cliente: sempre trial padrão, independente do que foi enviado
    NEW.plano := 'starter';
    NEW.status_assinatura := 'trialing';
    NEW.current_period_end := now() + interval '14 days';
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.plano IS DISTINCT FROM OLD.plano
    OR NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura
    OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'Alteração de assinatura/proprietário da clínica não permitida'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_clinicas_billing ON public.clinicas;
CREATE TRIGGER guard_clinicas_billing
  BEFORE INSERT OR UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.guard_clinicas_billing();
