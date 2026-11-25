-- Rollback de 20261124100000_aceite_convite_portal.sql
-- Remove só as duas funções. Acessos ao portal já criados por elas continuam (são dados do paciente);
-- para desfazê-los, desativar em patient_portal_access (active = false), não apagar.

DROP FUNCTION IF EXISTS public.vincular_convite_portal(text);
DROP FUNCTION IF EXISTS public.validar_convite_portal(text);
