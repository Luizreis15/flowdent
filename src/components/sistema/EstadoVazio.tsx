import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EstadoVazioProps {
  icone?: LucideIcon;
  titulo: string;
  /** Uma frase dizendo o que aparece aqui e como começar */
  descricao?: ReactNode;
  /** No máximo uma ação, normalmente a que cria o primeiro item */
  acao?: ReactNode;
  className?: string;
}

/** Estado vazio de lista, tabela ou gráfico: ícone neutro, título curto, uma frase e uma ação opcional. */
export const EstadoVazio = ({ icone: Icone, titulo, descricao, acao, className }: EstadoVazioProps) => (
  <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
    {Icone && (
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Icone className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
    )}
    <p className="text-sm font-medium text-foreground">{titulo}</p>
    {descricao && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{descricao}</p>}
    {acao && <div className="mt-4">{acao}</div>}
  </div>
);
