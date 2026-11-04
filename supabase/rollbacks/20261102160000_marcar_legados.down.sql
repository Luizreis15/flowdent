-- Reverte 20261102160000_marcar_legados.sql (só os comentários; o UPDATE de normalização
-- copiou valores para colunas nulas e não precisa ser desfeito).

COMMENT ON COLUMN public.appointments.duracao_minutos IS 'Duration of the appointment in minutes. Default is 30 minutes.';
COMMENT ON TABLE public.whatsapp_config IS NULL;
COMMENT ON TABLE public.tenant_feature_overrides IS NULL;
