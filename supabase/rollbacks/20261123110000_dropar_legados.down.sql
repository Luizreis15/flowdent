-- Reverte 20261123110000_dropar_legados.sql.
-- As tabelas estavam vazias ao serem removidas; para recriá-las com a estrutura original,
-- reaplicar o DDL de whatsapp_config (20260128221406) e tenant_feature_overrides (20251030222049)
-- e depois 20261123100000_renomear_legados se o nome _legacy_* for desejado.
-- A coluna é recriada com o valor de duration_minutes, que era idêntico.

BEGIN;

ALTER TABLE public.appointments ADD COLUMN _legacy_duracao_minutos integer DEFAULT 30;
UPDATE public.appointments SET _legacy_duracao_minutos = duration_minutes;

COMMIT;
