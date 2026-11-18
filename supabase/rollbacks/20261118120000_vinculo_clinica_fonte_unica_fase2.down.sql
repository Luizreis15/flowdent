-- rollback de 20261118120000_vinculo_clinica_fonte_unica_fase2
BEGIN;

DROP POLICY IF EXISTS "Users can view automated messages from their clinic" ON public.automated_messages;
CREATE POLICY "Users can view automated messages from their clinic" ON public.automated_messages
  AS PERMISSIVE FOR SELECT TO public
  USING ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can insert budgets to their clinic" ON public.budgets;
CREATE POLICY "Users can insert budgets to their clinic" ON public.budgets
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can update budgets from their clinic" ON public.budgets;
CREATE POLICY "Users can update budgets from their clinic" ON public.budgets
  AS PERMISSIVE FOR UPDATE TO public
  USING ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view budgets from their clinic" ON public.budgets;
CREATE POLICY "Users can view budgets from their clinic" ON public.budgets
  AS PERMISSIVE FOR SELECT TO public
  USING ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view financial transactions from their clinic" ON public.financial_transactions;
CREATE POLICY "Users can view financial transactions from their clinic" ON public.financial_transactions
  AS PERMISSIVE FOR SELECT TO public
  USING ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can create documents for their clinic patients" ON public.patient_documents;
CREATE POLICY "Users can create documents for their clinic patients" ON public.patient_documents
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((patient_id IN ( SELECT patients.id FROM patients WHERE (patients.clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))))) AND (created_by = auth.uid())));

DROP POLICY IF EXISTS "Users can update documents from their clinic" ON public.patient_documents;
CREATE POLICY "Users can update documents from their clinic" ON public.patient_documents
  AS PERMISSIVE FOR UPDATE TO public
  USING ((patient_id IN ( SELECT patients.id FROM patients WHERE (patients.clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))))));

DROP POLICY IF EXISTS "Users can view documents from their clinic" ON public.patient_documents;
CREATE POLICY "Users can view documents from their clinic" ON public.patient_documents
  AS PERMISSIVE FOR SELECT TO public
  USING ((patient_id IN ( SELECT patients.id FROM patients WHERE (patients.clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))))));

DROP POLICY IF EXISTS "Users can insert patients to their clinic" ON public.patients;
CREATE POLICY "Users can insert patients to their clinic" ON public.patients
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can update patients from their clinic" ON public.patients;
CREATE POLICY "Users can update patients from their clinic" ON public.patients
  AS PERMISSIVE FOR UPDATE TO public
  USING ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view patients from their clinic" ON public.patients;
CREATE POLICY "Users can view patients from their clinic" ON public.patients
  AS PERMISSIVE FOR SELECT TO public
  USING ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view payments from their clinic" ON public.payments;
CREATE POLICY "Users can view payments from their clinic" ON public.payments
  AS PERMISSIVE FOR SELECT TO public
  USING ((patient_id IN ( SELECT patients.id FROM patients WHERE (patients.clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))))));

DROP POLICY IF EXISTS "Enable insert for authenticated users with clinic" ON public.profissionais;
CREATE POLICY "Enable insert for authenticated users with clinic" ON public.profissionais
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1 FROM clinicas WHERE ((clinicas.id = profissionais.clinica_id) AND (clinicas.owner_user_id = auth.uid())))) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.clinic_id = profissionais.clinica_id))))));

DROP POLICY IF EXISTS "Users can view reviews from their clinic" ON public.reviews;
CREATE POLICY "Users can view reviews from their clinic" ON public.reviews
  AS PERMISSIVE FOR SELECT TO public
  USING ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view evolutions from their clinic" ON public.treatment_evolutions;
CREATE POLICY "Users can view evolutions from their clinic" ON public.treatment_evolutions
  AS PERMISSIVE FOR SELECT TO public
  USING ((patient_id IN ( SELECT patients.id FROM patients WHERE (patients.clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))))));

DROP POLICY IF EXISTS "Users can view treatments from their clinic" ON public.treatments;
CREATE POLICY "Users can view treatments from their clinic" ON public.treatments
  AS PERMISSIVE FOR SELECT TO public
  USING ((patient_id IN ( SELECT patients.id FROM patients WHERE (patients.clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))))));

DROP POLICY IF EXISTS "Users can view integrations from their clinic" ON public.user_integrations;
CREATE POLICY "Users can view integrations from their clinic" ON public.user_integrations
  AS PERMISSIVE FOR SELECT TO public
  USING ((clinic_id IN ( SELECT profiles.clinic_id FROM profiles WHERE (profiles.id = auth.uid()))));

COMMIT;
