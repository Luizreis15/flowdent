-- Reverte 20261102140000_isolamento_audit_reviews_whatsapp.sql (restaura policies e grants anteriores)

-- A3
DROP POLICY IF EXISTS "Admins can view audit logs for their clinic" ON public.role_audit_log;
CREATE POLICY "Admins can view audit logs for their clinic"
ON public.role_audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::perfil_usuario));

-- A4
DROP POLICY IF EXISTS "Clinic users can create reviews for their clinic" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- A6
DROP POLICY IF EXISTS "whatsapp_configs_select" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "whatsapp_configs_insert" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "whatsapp_configs_update" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "whatsapp_configs_delete" ON public.whatsapp_configs;

CREATE POLICY "Usuários podem ver config de sua clínica" ON public.whatsapp_configs
FOR SELECT USING (clinica_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Usuários podem inserir config de sua clínica" ON public.whatsapp_configs
FOR INSERT WITH CHECK (clinica_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Usuários podem atualizar config de sua clínica" ON public.whatsapp_configs
FOR UPDATE USING (clinica_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Usuários podem deletar config de sua clínica" ON public.whatsapp_configs
FOR DELETE USING (clinica_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

GRANT SELECT ON public.whatsapp_configs TO anon, authenticated;
