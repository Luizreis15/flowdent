-- 20261118100000_revogar_exposicao_rpc
-- Tira do endpoint /rest/v1/rpc/ as funções SECURITY DEFINER que nunca deveriam
-- ser chamáveis de fora. Hoje as 22 estão expostas a anon e a authenticated.
--
-- O QUE NÃO É TOCADO, E POR QUÊ: get_user_clinic_id, get_user_perfil, has_role,
-- is_clinic_admin, is_portal_patient e is_super_admin aparecem dentro de 182
-- policies de RLS. Expressão de policy é avaliada com o privilégio de quem
-- consulta, então revogar EXECUTE de `authenticated` nelas derruba o acesso a
-- todas as tabelas de uma vez. Ficam como estão.
--
-- As de gatilho abaixo são seguras: o PostgreSQL verifica EXECUTE em função de
-- gatilho na criação do trigger, não a cada disparo.
--
-- Verificado antes de escrever: o front não faz nenhuma chamada .rpc(), e o
-- onboarding grava direto em clinicas/profiles/usuarios/profissionais/user_roles.

BEGIN;

-- Funções de gatilho: nenhuma é chamada diretamente.
REVOKE EXECUTE ON FUNCTION public.create_payable_expense_transaction() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_plano_item_procedimento() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_procedimentos_codigo() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_owner_to_new_clinic() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_protese_movimentacao() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_role_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_system_audit() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mirror_profiles_clinic_id() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_plano_padrao() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profiles_to_usuarios() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_usuarios_to_profiles() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_seed_clinic_permissions() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_budget_item_status_on_evolution() FROM anon, authenticated, PUBLIC;

-- Chamada apenas por trigger_seed_clinic_permissions, que é SECURITY DEFINER.
REVOKE EXECUTE ON FUNCTION public.seed_default_permissions(uuid) FROM anon, authenticated, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.seed_default_permissions(uuid) TO service_role;

-- Cria clínica. Exposta a anon, qualquer um criava tenant pelo endpoint REST.
REVOKE EXECUTE ON FUNCTION public.complete_user_onboarding(text, text, text) FROM anon, authenticated, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.complete_user_onboarding(text, text, text) TO service_role;

COMMIT;
