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
  /** Só quando o número carrega um sinal de verdade (ex.: saldo negativo) */
  tom?: "padrao" | "alerta";
  onClick?: () => void;
}

/**
 * Indicadores numa faixa única com divisórias, como na referência aprovada:
 * rótulo pequeno em caixa alta, número grande em texto primário, sem cor de fundo.
 */
export const FaixaIndicadores = ({ itens, className }: { itens: Indicador[]; className?: string }) => (
  <div
    className={cn(
      "grid divide-y rounded-lg border bg-card sm:divide-x sm:divide-y-0",
      itens.length === 2 && "sm:grid-cols-2",
      itens.length === 3 && "sm:grid-cols-3",
      itens.length >= 4 && "sm:grid-cols-2 lg:grid-cols-4 lg:divide-x",
      className,
    )}
  >
    {itens.map((item) => {
      const Conteudo = (
        <>
          <span className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">{item.rotulo}</span>
          <span
            className={cn(
              "mt-1 flex items-baseline gap-1 tabular-nums",
              item.tom === "alerta" ? "text-sinal-alerta" : "text-foreground",
            )}
          >
            {item.prefixo && <span className="text-base font-medium text-muted-foreground">{item.prefixo}</span>}
            <span className="text-[28px] font-semibold leading-8">{item.valor}</span>
            {item.sufixo && <span className="text-base font-medium text-muted-foreground">{item.sufixo}</span>}
          </span>
          {item.nota && <span className="mt-1 text-[13px] text-muted-foreground tabular-nums">{item.nota}</span>}
        </>
      );
      return item.onClick ? (
        <button
          key={item.rotulo}
          type="button"
          onClick={item.onClick}
          className="flex flex-col items-start px-5 py-4 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {Conteudo}
        </button>
      ) : (
        <div key={item.rotulo} className="flex flex-col px-5 py-4">
          {Conteudo}
        </div>
      );
    })}
  </div>
);

