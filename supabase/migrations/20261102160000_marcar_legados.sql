-- Auditoria itens 1, 3 e 4: marca colunas/tabelas legadas sem apagar nada.
-- Remoção (DROP) só depois de validado em produção — ver docs/AUDITORIA-CONSISTENCIA.md.
--
-- Rollback: supabase/rollbacks/20261102160000_marcar_legados.down.sql

-- Item 3: appointments.duracao_minutos duplica duration_minutes e nada grava nela.
-- Garante que nenhum valor se perca antes de o app parar de ler a coluna (0 linhas em 2026-11-02).
UPDATE public.appointments
SET duration_minutes = duracao_minutos
WHERE duration_minutes IS NULL
  AND duracao_minutos IS NOT NULL;

COMMENT ON COLUMN public.appointments.duracao_minutos IS
  'LEGADO: use duration_minutes. Não é lida nem gravada pelo app desde 2026-11-02; candidata a DROP.';

-- Item 1: whatsapp_config foi substituída por whatsapp_configs (usada pelo CRM e pelas edge functions).
-- Só era referenciada por WhatsAppConfigModal.tsx, que não é montado em nenhuma tela. 0 linhas em 2026-11-02.
COMMENT ON TABLE public.whatsapp_config IS
  'LEGADO: substituída por whatsapp_configs. Sem uso ativo desde 2026-11-02; candidata a DROP.';

-- Item 4: sem uso no app, em funções ou em triggers. 0 linhas em 2026-11-02.
COMMENT ON TABLE public.tenant_feature_overrides IS
  'SEM USO: nenhuma referência no app, funções ou triggers (auditoria 2026-11-02).';
