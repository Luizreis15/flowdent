-- 20261118120000_vinculo_clinica_fonte_unica_fase2
-- Termina o que 20261102150000_vinculo_clinica_fonte_unica começou.
--
-- O PROBLEMA: o vínculo usuário<->clínica tem três fontes de verdade. 182 policies
-- passam por get_user_clinic_id(), 35 leem usuarios.clinica_id direto e estas 17
-- leem profiles.clinic_id. Em `patients`, SELECT e UPDATE filtram por profiles
-- enquanto DELETE filtra por usuarios: o isolamento de prontuário está pendurado
-- nos gatilhos de espelhamento continuarem funcionando.
--
-- Hoje não há divergência (0 linhas), mas já existe 1 profile sem usuario — a
-- borda começou a abrir. Depois desta migration, get_user_clinic_id() (que lê
-- usuarios.clinica_id) passa a ser a única fonte nessas 17.
--
-- Equivalência: `clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())`
-- vira `clinic_id = get_user_clinic_id(...)`. profiles.id é PK, então o subselect
-- devolve no máximo uma linha; com NULL, ambos resultam em falso.
--
-- De brinde, auth.uid() vira (select auth.uid()): deixa de ser reavaliado por linha.
--
-- ANTES DE APLICAR: rodar os testes de supabase/verificacoes/ contra uma clínica 2.

BEGIN;

DROP POLICY IF EXISTS "Users can view automated messages from their clinic" ON public.automated_messages;
CREATE POLICY "Users can view automated messages from their clinic" ON public.automated_messages
  AS PERMISSIVE FOR SELECT TO public
  USING (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can insert budgets to their clinic" ON public.budgets;
CREATE POLICY "Users can insert budgets to their clinic" ON public.budgets
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can update budgets from their clinic" ON public.budgets;
CREATE POLICY "Users can update budgets from their clinic" ON public.budgets
  AS PERMISSIVE FOR UPDATE TO public
  USING (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can view budgets from their clinic" ON public.budgets;
CREATE POLICY "Users can view budgets from their clinic" ON public.budgets
  AS PERMISSIVE FOR SELECT TO public
  USING (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can view financial transactions from their clinic" ON public.financial_transactions;
CREATE POLICY "Users can view financial transactions from their clinic" ON public.financial_transactions
  AS PERMISSIVE FOR SELECT TO public
  USING (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can create documents for their clinic patients" ON public.patient_documents;
CREATE POLICY "Users can create documents for their clinic patients" ON public.patient_documents
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (patient_id IN (SELECT patients.id FROM patients WHERE patients.clinic_id = public.get_user_clinic_id((select auth.uid()))) AND created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update documents from their clinic" ON public.patient_documents;
CREATE POLICY "Users can update documents from their clinic" ON public.patient_documents
  AS PERMISSIVE FOR UPDATE TO public
  USING (patient_id IN (SELECT patients.id FROM patients WHERE patients.clinic_id = public.get_user_clinic_id((select auth.uid()))));

DROP POLICY IF EXISTS "Users can view documents from their clinic" ON public.patient_documents;
CREATE POLICY "Users can view documents from their clinic" ON public.patient_documents
  AS PERMISSIVE FOR SELECT TO public
  USING (patient_id IN (SELECT patients.id FROM patients WHERE patients.clinic_id = public.get_user_clinic_id((select auth.uid()))));

DROP POLICY IF EXISTS "Users can insert patients to their clinic" ON public.patients;
CREATE POLICY "Users can insert patients to their clinic" ON public.patients
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can update patients from their clinic" ON public.patients;
CREATE POLICY "Users can update patients from their clinic" ON public.patients
  AS PERMISSIVE FOR UPDATE TO public
  USING (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can view patients from their clinic" ON public.patients;
CREATE POLICY "Users can view patients from their clinic" ON public.patients
  AS PERMISSIVE FOR SELECT TO public
  USING (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can view payments from their clinic" ON public.payments;
CREATE POLICY "Users can view payments from their clinic" ON public.payments
  AS PERMISSIVE FOR SELECT TO public
  USING (patient_id IN (SELECT patients.id FROM patients WHERE patients.clinic_id = public.get_user_clinic_id((select auth.uid()))));

DROP POLICY IF EXISTS "Enable insert for authenticated users with clinic" ON public.profissionais;
CREATE POLICY "Enable insert for authenticated users with clinic" ON public.profissionais
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinicas WHERE clinicas.id = profissionais.clinica_id AND clinicas.owner_user_id = (select auth.uid())) OR profissionais.clinica_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can view reviews from their clinic" ON public.reviews;
CREATE POLICY "Users can view reviews from their clinic" ON public.reviews
  AS PERMISSIVE FOR SELECT TO public
  USING (clinic_id = public.get_user_clinic_id((select auth.uid())));

DROP POLICY IF EXISTS "Users can view evolutions from their clinic" ON public.treatment_evolutions;
CREATE POLICY "Users can view evolutions from their clinic" ON public.treatment_evolutions
  AS PERMISSIVE FOR SELECT TO public
  USING (patient_id IN (SELECT patients.id FROM patients WHERE patients.clinic_id = public.get_user_clinic_id((select auth.uid()))));

DROP POLICY IF EXISTS "Users can view treatments from their clinic" ON public.treatments;
CREATE POLICY "Users can view treatments from their clinic" ON public.treatments
  AS PERMISSIVE FOR SELECT TO public
  USING (patient_id IN (SELECT patients.id FROM patients WHERE patients.clinic_id = public.get_user_clinic_id((select auth.uid()))));

DROP POLICY IF EXISTS "Users can view integrations from their clinic" ON public.user_integrations;
CREATE POLICY "Users can view integrations from their clinic" ON public.user_integrations
  AS PERMISSIVE FOR SELECT TO public
  USING (clinic_id = public.get_user_clinic_id((select auth.uid())));

COMMIT;
