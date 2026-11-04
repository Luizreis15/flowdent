-- Auditoria item 5 + A2: procedimentos era um catálogo global gravável por qualquer clínica
-- (INSERT por qualquer usuário com clínica; ALL para admin de qualquer clínica via has_role,
-- que não considera a clínica; SELECT aberto inclusive para anon).
--
-- Novo modelo:
--   clinica_id IS NULL      -> catálogo do sistema (leitura para todos autenticados, escrita só super admin)
--   clinica_id = <clínica>  -> procedimento próprio da clínica (visível e editável só por ela)
-- Os 335 procedimentos existentes permanecem como catálogo do sistema (clinica_id NULL).
--
-- Rollback: supabase/rollbacks/20261102130000_procedimentos_por_clinica.down.sql

-- 1. A2: admin da clínica informada (has_role sozinho vale para admin de qualquer clínica)
CREATE OR REPLACE FUNCTION public.is_clinic_admin(_user_id uuid, _clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _clinic_id IS NOT NULL
    AND public.get_user_clinic_id(_user_id) = _clinic_id
    AND public.has_role(_user_id, 'admin'::perfil_usuario)
$$;

-- 2. Dono do procedimento. Linhas existentes ficam NULL (catálogo do sistema);
-- DEFAULT = clínica de quem cria, para os inserts atuais do app que não enviam clinica_id.
ALTER TABLE public.procedimentos
  ADD COLUMN IF NOT EXISTS clinica_id uuid
    REFERENCES public.clinicas(id) ON DELETE CASCADE;

ALTER TABLE public.procedimentos
  ALTER COLUMN clinica_id SET DEFAULT public.get_user_clinic_id(auth.uid());

CREATE INDEX IF NOT EXISTS procedimentos_clinica_id_idx ON public.procedimentos (clinica_id);

-- 3. Unicidade de código: global no catálogo do sistema, por clínica nos próprios
ALTER TABLE public.procedimentos DROP CONSTRAINT IF EXISTS procedimentos_codigo_sistema_key;

CREATE UNIQUE INDEX IF NOT EXISTS procedimentos_codigo_sistema_global_key
  ON public.procedimentos (codigo_sistema) WHERE clinica_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS procedimentos_codigo_sistema_clinica_key
  ON public.procedimentos (clinica_id, codigo_sistema) WHERE clinica_id IS NOT NULL;

-- Código de clínica não pode repetir um código do catálogo do sistema: o app busca por
-- codigo_sistema com maybeSingle() e precisa encontrar no máximo uma linha visível.
CREATE OR REPLACE FUNCTION public.guard_procedimentos_codigo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.clinica_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.procedimentos p
    WHERE p.clinica_id IS NULL
      AND p.codigo_sistema = NEW.codigo_sistema
      AND p.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Código de procedimento já existe no catálogo do sistema'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_procedimentos_codigo ON public.procedimentos;
CREATE TRIGGER guard_procedimentos_codigo
  BEFORE INSERT OR UPDATE OF codigo_sistema, clinica_id ON public.procedimentos
  FOR EACH ROW EXECUTE FUNCTION public.guard_procedimentos_codigo();

-- 4. Policies
DROP POLICY IF EXISTS "Todos podem ver procedimentos base" ON public.procedimentos;
DROP POLICY IF EXISTS "Authenticated users can read procedimentos" ON public.procedimentos;
DROP POLICY IF EXISTS "Admins podem gerenciar procedimentos base" ON public.procedimentos;
DROP POLICY IF EXISTS "Usuarios com clinica podem inserir procedimentos" ON public.procedimentos;

CREATE POLICY "procedimentos_select"
ON public.procedimentos FOR SELECT
TO authenticated
USING (
  clinica_id IS NULL
  OR clinica_id = public.get_user_clinic_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "procedimentos_insert"
ON public.procedimentos FOR INSERT
TO authenticated
WITH CHECK (
  (clinica_id IS NOT NULL AND clinica_id = public.get_user_clinic_id(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "procedimentos_update"
ON public.procedimentos FOR UPDATE
TO authenticated
USING (
  (clinica_id IS NOT NULL AND clinica_id = public.get_user_clinic_id(auth.uid()))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (clinica_id IS NOT NULL AND clinica_id = public.get_user_clinic_id(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "procedimentos_delete"
ON public.procedimentos FOR DELETE
TO authenticated
USING (
  public.is_clinic_admin(auth.uid(), clinica_id)
  OR public.is_super_admin(auth.uid())
);

-- 5. Item de plano só pode apontar para procedimento do sistema ou da mesma clínica do plano
-- (a FK ignora RLS, então sem isso daria para vincular um procedimento de outra clínica pelo id)
CREATE OR REPLACE FUNCTION public.guard_plano_item_procedimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.procedimentos pr
    JOIN public.planos_procedimentos pl ON pl.id = NEW.plano_id
    WHERE pr.id = NEW.procedimento_id
      AND pr.clinica_id IS NOT NULL
      AND pr.clinica_id <> pl.clinica_id
  ) THEN
    RAISE EXCEPTION 'Procedimento pertence a outra clínica'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_plano_item_procedimento ON public.planos_procedimentos_itens;
CREATE TRIGGER guard_plano_item_procedimento
  BEFORE INSERT OR UPDATE OF procedimento_id, plano_id ON public.planos_procedimentos_itens
  FOR EACH ROW EXECUTE FUNCTION public.guard_plano_item_procedimento();
