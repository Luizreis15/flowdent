-- Reverte 20261102130000_procedimentos_por_clinica.sql
-- Não apaga dados: a coluna clinica_id é mantida (nullable); apenas policies/triggers voltam ao estado anterior.
-- ATENÇÃO: se já existirem procedimentos de clínica com códigos repetidos entre clínicas,
-- a recriação da constraint UNIQUE(codigo_sistema) falha — verifique antes:
--   select codigo_sistema, count(*) from procedimentos group by 1 having count(*) > 1;

DROP TRIGGER IF EXISTS guard_plano_item_procedimento ON public.planos_procedimentos_itens;
DROP FUNCTION IF EXISTS public.guard_plano_item_procedimento();

DROP POLICY IF EXISTS "procedimentos_select" ON public.procedimentos;
DROP POLICY IF EXISTS "procedimentos_insert" ON public.procedimentos;
DROP POLICY IF EXISTS "procedimentos_update" ON public.procedimentos;
DROP POLICY IF EXISTS "procedimentos_delete" ON public.procedimentos;

CREATE POLICY "Todos podem ver procedimentos base"
ON public.procedimentos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can read procedimentos"
ON public.procedimentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins podem gerenciar procedimentos base"
ON public.procedimentos FOR ALL USING (has_role(auth.uid(), 'admin'::perfil_usuario));

CREATE POLICY "Usuarios com clinica podem inserir procedimentos"
ON public.procedimentos FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.clinic_id IS NOT NULL));

DROP TRIGGER IF EXISTS guard_procedimentos_codigo ON public.procedimentos;
DROP FUNCTION IF EXISTS public.guard_procedimentos_codigo();

DROP INDEX IF EXISTS public.procedimentos_codigo_sistema_clinica_key;
DROP INDEX IF EXISTS public.procedimentos_codigo_sistema_global_key;
ALTER TABLE public.procedimentos
  ADD CONSTRAINT procedimentos_codigo_sistema_key UNIQUE (codigo_sistema);

ALTER TABLE public.procedimentos ALTER COLUMN clinica_id DROP DEFAULT;

DROP FUNCTION IF EXISTS public.is_clinic_admin(uuid, uuid);
