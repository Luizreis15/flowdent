import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Indicador {
  rotulo: string;
  valor: ReactNode;
  /** Prefixo menor e discreto antes do número, como "R$" */
  prefixo?: string;
  /** Sufixo menor depois do número, como "%" */
  sufixo?: string;
  /** Linha de apoio abaixo do número */
  nota?: ReactNode;
  /** Só quando o número carrega um sinal de verdade (ex.: saldo negativo, título vencido) */
  tom?: "padrao" | "espera" | "alerta";
  /** Indicador que também é filtro: marca o filtro ativo */
  selecionado?: boolean;
  onClick?: () => void;
}

const COLUNAS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4 lg:divide-x",
  5: "sm:grid-cols-3 lg:grid-cols-5 lg:divide-x",
  6: "sm:grid-cols-3 lg:grid-cols-6 lg:divide-x",
};

const COR_TOM = {
  padrao: "text-foreground",
  espera: "text-sinal-espera",
  alerta: "text-sinal-alerta",
};

/**
 * Indicadores numa faixa única com divisórias, como na referência aprovada:
 * rótulo pequeno em caixa alta, número grande em texto primário, sem cor de fundo.
 */
export const FaixaIndicadores = ({
  itens,
  compacto = false,
  className,
}: {
  itens: Indicador[];
  /** Número menor (20px), para faixas com 5 ou 6 indicadores */
  compacto?: boolean;
  className?: string;
}) => (
  <div
    className={cn(
      "grid divide-y overflow-hidden rounded-lg border bg-card sm:divide-x sm:divide-y-0",
      COLUNAS[Math.min(itens.length, 6)],
      className,
    )}
  >
    {itens.map((item) => {
      const Conteudo = (
        <>
          <span className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">{item.rotulo}</span>
          <span className={cn("mt-1 flex items-baseline gap-1 tabular-nums", COR_TOM[item.tom ?? "padrao"])}>
            {item.prefixo && (
              <span className={cn("font-medium text-muted-foreground", compacto ? "text-sm" : "text-base")}>
                {item.prefixo}
              </span>
            )}
            <span className={cn("font-semibold", compacto ? "text-xl leading-7" : "text-[28px] leading-8")}>
              {item.valor}
            </span>
            {item.sufixo && (
              <span className={cn("font-medium text-muted-foreground", compacto ? "text-sm" : "text-base")}>
                {item.sufixo}
              </span>
            )}
          </span>
          {item.nota && <span className="mt-1 text-[13px] text-muted-foreground tabular-nums">{item.nota}</span>}
          {item.selecionado && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden />}
        </>
      );
      const base = cn("relative flex flex-col items-start", compacto ? "px-4 py-3" : "px-5 py-4");
      return item.onClick ? (
        <button
          key={item.rotulo}
          type="button"
          onClick={item.onClick}
          aria-pressed={item.selecionado}
          className={cn(
            base,
            "text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            item.selecionado && "bg-muted/40",
          )}
        >
          {Conteudo}
        </button>
      ) : (
        <div key={item.rotulo} className={base}>
          {Conteudo}
        </div>
      );
    })}
  </div>
);
