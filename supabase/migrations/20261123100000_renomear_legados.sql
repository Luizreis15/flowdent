-- Pendência P3: tira de circulação os objetos marcados como LEGADO em 20261102160000.
-- Passo 1 de 2: renomeia (reversível, não apaga nada). O DROP fica para
-- 20261123100001_dropar_legados.sql, a aplicar depois de um ciclo sem erro.
--
-- Verificado em produção (2026-11-23):
--   whatsapp_config: 0 linhas; tenant_feature_overrides: 0 linhas;
--   appointments.duracao_minutos: igual a duration_minutes nas 80 linhas, nada grava nela;
--   nenhuma função, view ou FK referencia os três objetos;
--   no código, só WhatsAppConfigModal.tsx (não montado em nenhuma tela), removido junto.
--
-- Rollback: supabase/rollbacks/20261123100000_renomear_legados.down.sql

BEGIN;

ALTER TABLE public.whatsapp_config RENAME TO _legacy_whatsapp_config;
ALTER TABLE public.tenant_feature_overrides RENAME TO _legacy_tenant_feature_overrides;
ALTER TABLE public.appointments RENAME COLUMN duracao_minutos TO _legacy_duracao_minutos;

COMMIT;
