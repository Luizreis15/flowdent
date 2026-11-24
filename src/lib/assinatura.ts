import type { TomStatus } from "@/lib/statusConsulta";

/** Planos e situação da assinatura num lugar só (Configurações, Perfil e Assinatura). */
export const NOME_PLANO: Record<string, string> = {
  solo: "Solo",
  crescimento: "Crescimento",
  premium: "Premium",
  teste: "Teste",
  starter: "Teste gratuito",
  enterprise: "Visualização de administrador",
};

export const nomePlano = (plano?: string | null) =>
  plano ? (NOME_PLANO[plano] ?? plano) : "Não definido";

export const STATUS_ASSINATURA: Record<string, { rotulo: string; tom: TomStatus }> = {
  active: { rotulo: "Ativa", tom: "ok" },
  trialing: { rotulo: "Em teste", tom: "tinta" },
  past_due: { rotulo: "Pagamento pendente", tom: "espera" },
  expired: { rotulo: "Teste encerrado", tom: "alerta" },
  canceled: { rotulo: "Cancelada", tom: "alerta" },
  no_subscription: { rotulo: "Sem assinatura", tom: "neutro" },
  admin_impersonation: { rotulo: "Super admin", tom: "neutro" },
};

export const statusAssinatura = (status?: string | null) =>
  STATUS_ASSINATURA[status || "no_subscription"] ?? { rotulo: status ?? "Sem assinatura", tom: "neutro" as TomStatus };
