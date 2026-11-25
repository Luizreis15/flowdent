import { supabase } from "@/integrations/supabase/client";

/*
 * Portal do paciente: o convite é conferido e aceito por duas funções no banco (migration 20261124100000):
 * validar_convite_portal (sem login) e vincular_convite_portal (com login, e-mail igual ao do convite).
 * Antes a tela lia e gravava as tabelas direto e as policies barravam o paciente.
 */

export type ConvitePortal = { email: string; primeiro_nome: string; clinica: string | null };

const ERRO_VINCULO: Record<string, string> = {
  convite_invalido: "Este convite expirou ou já foi usado. Peça um novo link à clínica.",
  email_diferente: "Entre com o mesmo e-mail que recebeu o convite.",
  email_nao_confirmado: "Confirme seu e-mail pelo link que enviamos e tente de novo.",
  conta_da_equipe: "Este e-mail é de uma conta da equipe da clínica. Peça à clínica um convite com outro e-mail.",
  paciente_ja_vinculado: "Este paciente já tem acesso ao portal com outra conta.",
  conta_ja_vinculada: "Esta conta já está ligada a outro paciente.",
};

export const mensagemVinculo = (codigo: string | null) =>
  (codigo && ERRO_VINCULO[codigo]) || "Não foi possível liberar o acesso. Tente de novo.";

/** Liga a conta logada ao paciente do convite. Devolve o código de erro, ou null se deu certo. */
export const vincularConvite = async (token: string): Promise<string | null> => {
  const { error } = await supabase.rpc("vincular_convite_portal", { _token: token });
  if (!error) return null;
  const codigo = Object.keys(ERRO_VINCULO).find((c) => error.message?.includes(c));
  return codigo ?? "erro";
};

export const temAcessoAtivo = async (userId: string) => {
  const { data } = await supabase
    .from("patient_portal_access")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  return !!data;
};

/** Confere o convite sem login. Devolve null se não existe, expirou ou já foi usado. */
export const validarConvite = async (token: string): Promise<ConvitePortal | null> => {
  const { data, error } = await supabase.rpc("validar_convite_portal", { _token: token });
  return (!error && data?.[0]) || null;
};
