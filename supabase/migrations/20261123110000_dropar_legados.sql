-- Pendência P3, passo 2 de 2: remove os objetos renomeados em 20261123100000_renomear_legados.
-- Verificado em produção imediatamente antes (2026-11-23): as duas tabelas com 0 linhas,
-- _legacy_duracao_minutos idêntica a duration_minutes nas 80 linhas, nenhuma view/FK dependente.
-- Nenhum dado é perdido.
--
-- Rollback: supabase/rollbacks/20261123110000_dropar_legados.down.sql

BEGIN;

DROP TABLE public._legacy_whatsapp_config;
DROP TABLE public._legacy_tenant_feature_overrides;
ALTER TABLE public.appointments DROP COLUMN _legacy_duracao_minutos;

COMMIT;
