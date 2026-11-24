import { CLASSE_SELO, type TomStatus } from "@/lib/statusConsulta";

/** Tipos de stock_moves.tipo (enum tipo_movimentacao_estoque): rótulo, tom do selo e sinal da quantidade. */
export const TIPO_MOVIMENTACAO: Record<string, { rotulo: string; tom: TomStatus; sinal: "+" | "-" | "" }> = {
  entrada: { rotulo: "Entrada", tom: "ok", sinal: "+" },
  saida: { rotulo: "Saída", tom: "neutro", sinal: "-" },
  transferencia: { rotulo: "Transferência", tom: "tinta", sinal: "" },
  ajuste: { rotulo: "Ajuste", tom: "espera", sinal: "" },
  devolucao: { rotulo: "Devolução", tom: "neutro", sinal: "+" },
};

export const tipoMovimentacao = (tipo?: string | null) =>
  TIPO_MOVIMENTACAO[tipo ?? ""] ?? { rotulo: tipo ?? "—", tom: "neutro" as TomStatus, sinal: "" as const };

export const classeSeloMovimentacao = (tipo?: string | null) => CLASSE_SELO[tipoMovimentacao(tipo).tom];

/** Quantidade com sinal explícito: entradas com +, saídas com −, as demais como vieram */
export const quantidadeComSinal = (tipo: string | null | undefined, quantidade: number) => {
  const { sinal } = tipoMovimentacao(tipo);
  const abs = Math.abs(Number(quantidade) || 0);
  if (sinal === "+") return `+${abs}`;
  if (sinal === "-") return `−${abs}`;
  return String(quantidade);
};
