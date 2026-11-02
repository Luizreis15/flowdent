-- Auditoria A3, A4, A6.
--   A3: role_audit_log era legível por admin de qualquer clínica (has_role sem clínica).
--   A4: reviews aceitava INSERT de qualquer autenticado em qualquer clínica/paciente.
--   A6: whatsapp_configs (tokens da Z-API) legível e gravável por qualquer perfil da clínica.
--
-- Rollback: supabase/rollbacks/20261102140000_isolamento_audit_reviews_whatsapp.down.sql

-- A3 ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs for their clinic" ON public.role_audit_log;

CREATE POLICY "Admins can view audit logs for their clinic"
ON public.role_audit_log FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = role_audit_log.user_id
      AND public.is_clinic_admin(auth.uid(), u.clinica_id)
  )
);

-- A4 ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;

CREATE POLICY "Clinic users can create reviews for their clinic"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id = public.get_user_clinic_id(auth.uid())
  AND (
    patient_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = reviews.patient_id
        AND p.clinic_id = reviews.clinic_id
    )
  )
);

-- A6 ---------------------------------------------------------------------------
-- Escrita só por admin da clínica; leitura (sem colunas secretas) pela equipe da clínica.
DROP POLICY IF EXISTS "Usuários podem ver config de sua clínica" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Usuários podem inserir config de sua clínica" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Usuários podem atualizar config de sua clínica" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Usuários podem deletar config de sua clínica" ON public.whatsapp_configs;

CREATE POLICY "whatsapp_configs_select"
ON public.whatsapp_configs FOR SELECT
TO authenticated
USING (clinica_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "whatsapp_configs_insert"
ON public.whatsapp_configs FOR INSERT
TO authenticated
WITH CHECK (public.is_clinic_admin(auth.uid(), clinica_id));

CREATE POLICY "whatsapp_configs_update"
ON public.whatsapp_configs FOR UPDATE
TO authenticated
USING (public.is_clinic_admin(auth.uid(), clinica_id))
WITH CHECK (public.is_clinic_admin(auth.uid(), clinica_id));

CREATE POLICY "whatsapp_configs_delete"
ON public.whatsapp_configs FOR DELETE
TO authenticated
USING (public.is_clinic_admin(auth.uid(), clinica_id));

-- Colunas secretas não podem ser lidas pelo cliente (nem por admin): só edge functions
-- (service_role) leem tokens. INSERT/UPDATE continuam permitidos para o admin gravar.
REVOKE SELECT ON public.whatsapp_configs FROM anon, authenticated;
GRANT SELECT (
  id, clinica_id, connection_type, instance_id, is_active, connected_at, last_seen_at,
  phone_number_id, business_account_id, created_at, updated_at
) ON public.whatsapp_configs TO authenticated;
