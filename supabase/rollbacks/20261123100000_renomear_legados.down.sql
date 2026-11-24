-- Reverte 20261123100000_renomear_legados.sql

BEGIN;

ALTER TABLE public._legacy_whatsapp_config RENAME TO whatsapp_config;
ALTER TABLE public._legacy_tenant_feature_overrides RENAME TO tenant_feature_overrides;
ALTER TABLE public.appointments RENAME COLUMN _legacy_duracao_minutos TO duracao_minutos;

COMMIT;
