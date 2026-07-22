-- CRÍTICO 1: impedir que admin de clínica se promova (ou promova outros) a super_admin
-- via PostgREST. A policy antiga só validava "alvo é da minha clínica", sem restringir
-- qual valor de role podia ser escrito; WITH CHECK ausente reaproveitava o USING.
--
-- Concessão de super_admin: apenas service_role (edge functions / SQL privilegiado).
-- O JWT service_role do Supabase tem BYPASSRLS; a policy TO service_role documenta a
-- intenção e cobre ambientes onde RLS seja forçada para esse role.

DROP POLICY IF EXISTS "Admins can manage roles in their clinic" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can grant super_admin" ON public.user_roles;

-- Admins de clínica: gerenciam apenas roles de clínica (nunca super_admin).
-- USING e WITH CHECK explícitos: cobre SELECT/UPDATE/DELETE (USING) e INSERT/UPDATE (WITH CHECK).
CREATE POLICY "Admins can manage roles in their clinic"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::perfil_usuario)
  AND role <> 'super_admin'::perfil_usuario
  AND user_id IN (
    SELECT id
    FROM public.usuarios
    WHERE clinica_id IN (
      SELECT clinica_id
      FROM public.usuarios
      WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::perfil_usuario)
  AND role <> 'super_admin'::perfil_usuario
  AND user_id IN (
    SELECT id
    FROM public.usuarios
    WHERE clinica_id IN (
      SELECT clinica_id
      FROM public.usuarios
      WHERE id = auth.uid()
    )
  )
);

-- Somente service_role pode inserir/atualizar/apagar linhas com role = super_admin.
-- Chamadas autenticadas (anon/authenticated) nunca passam por esta policy.
CREATE POLICY "Service role can grant super_admin"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
