-- 20261118110000_fixar_search_path
-- Única função do schema sem search_path fixo. É SECURITY INVOKER, então o risco
-- é menor que nas DEFINER, mas é o último alerta desse tipo em aberto.
BEGIN;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
COMMIT;
