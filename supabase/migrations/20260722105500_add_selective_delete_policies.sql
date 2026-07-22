-- Passo 8: DELETE policies — decisões de higiene RLS
--
-- INTENCIONALMENTE SEM DELETE (imutáveis / integridade):
--   audit_logs, patient_financial_audit_logs, role_audit_log,
--   profissional_agenda_audit, system_audit_log,
--   stock_moves, protese_movimentacoes, comissoes_ajustes, batches,
--   payment_plans, payment_plan_allocations, receipt_documents,
--   profiles (exclusão de conta só via service_role),
--   planos, reviews
-- Ausência de policy = negação por padrão (fail-closed). OK.
--
-- ADICIONADAS abaixo: CRM + settings + itens de compra (alinhado ao fluxo existente).

-- CRM: usuários da clínica podem apagar conversas da própria clínica
CREATE POLICY "Users can delete their clinic conversations"
ON public.crm_conversations
FOR DELETE
TO authenticated
USING (clinica_id = public.get_user_clinic_id(auth.uid()));

-- CRM: mensagens só se a conversa for da clínica do usuário
CREATE POLICY "Users can delete messages from their clinic conversations"
ON public.crm_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.crm_conversations c
    WHERE c.id = crm_messages.conversation_id
      AND c.clinica_id = public.get_user_clinic_id(auth.uid())
  )
);

-- Preferências de notificação: cada usuário gerencia as próprias
CREATE POLICY "Users can delete their own notification settings"
ON public.user_notifications_settings
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Itens de NF de compra: mesma clínica da invoice (admins já apagam invoices)
CREATE POLICY "Users can delete purchase items from their clinic"
ON public.purchase_items
FOR DELETE
TO authenticated
USING (
  invoice_id IN (
    SELECT id
    FROM public.purchase_invoices
    WHERE clinica_id = public.get_user_clinic_id(auth.uid())
  )
);
