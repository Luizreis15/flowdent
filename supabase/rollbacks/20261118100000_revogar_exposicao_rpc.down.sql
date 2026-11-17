-- rollback de 20261118100000_revogar_exposicao_rpc
BEGIN;
GRANT EXECUTE ON FUNCTION public.create_payable_expense_transaction() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_plano_item_procedimento() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_procedimentos_codigo() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_owner_to_new_clinic() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_protese_movimentacao() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_role_change() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_system_audit() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mirror_profiles_clinic_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_plano_padrao() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profiles_to_usuarios() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_usuarios_to_profiles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_seed_clinic_permissions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_budget_item_status_on_evolution() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_permissions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_onboarding(text, text, text) TO anon, authenticated;
COMMIT;
