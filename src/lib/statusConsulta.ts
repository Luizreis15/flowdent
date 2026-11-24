/**
 * Status de consulta: rótulo e tom, num lugar só. Os tons usam apenas tokens da paleta
 * fechada (sinais, tinta e bone), como na referência aprovada: selo com fundo tênue e
 * texto na cor do sinal, barra vertical na linha da agenda.
 */
export type TomStatus = "neutro" | "tinta" | "ok" | "espera" | "alerta";

export const STATUS_CONSULTA: Record<string, { rotulo: string; tom: TomStatus }> = {
  scheduled: { rotulo: "Agendado", tom: "neutro" },
  confirmed: { rotulo: "Confirmado", tom: "ok" },
  waiting: { rotulo: "Aguardando", tom: "espera" },
  in_progress: { rotulo: "Em atendimento", tom: "tinta" },
  completed: { rotulo: "Finalizado", tom: "neutro" },
  cancelled: { rotulo: "Cancelado", tom: "alerta" },
  no_show: { rotulo: "Faltou", tom: "alerta" },
};

export const statusConsulta = (status?: string | null) => STATUS_CONSULTA[status || "scheduled"] ?? STATUS_CONSULTA.scheduled;

export const CLASSE_SELO: Record<TomStatus, string> = {
  neutro: "bg-muted text-muted-foreground",
  tinta: "bg-acao-tenue text-acao",
  ok: "bg-sinal-ok-tenue text-sinal-ok",
  espera: "bg-sinal-espera-tenue text-sinal-espera",
  alerta: "bg-sinal-alerta-tenue text-sinal-alerta",
};

/** Barra vertical da linha: confirmado em tinta (a marca), os demais no sinal correspondente. */
export const CLASSE_BARRA: Record<TomStatus, string> = {
  neutro: "bg-bone-300",
  tinta: "bg-tinta-500",
  ok: "bg-tinta-700",
  espera: "bg-sinal-espera",
  alerta: "bg-sinal-alerta",
};
