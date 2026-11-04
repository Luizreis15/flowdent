-- Reverte 20261102120000_guard_clinic_membership_and_billing.sql
-- (fica fora de supabase/migrations para o CLI não aplicar automaticamente)

DROP TRIGGER IF EXISTS guard_profiles_clinic_id ON public.profiles;
DROP TRIGGER IF EXISTS guard_usuarios_clinica_id ON public.usuarios;
DROP TRIGGER IF EXISTS guard_clinicas_billing ON public.clinicas;

DROP FUNCTION IF EXISTS public.guard_profiles_clinic_id();
DROP FUNCTION IF EXISTS public.guard_usuarios_clinica_id();
DROP FUNCTION IF EXISTS public.guard_clinicas_billing();
