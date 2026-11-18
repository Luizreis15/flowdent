-- rollback de 20261118110000_fixar_search_path
BEGIN;
ALTER FUNCTION public.update_updated_at_column() RESET search_path;
COMMIT;
