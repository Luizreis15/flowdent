import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Carregamento de lista ou tabela no desenho da lista pronta (linhas com borda fina),
 * no lugar de "Carregando..." ou de um spinner no meio da tela.
 */
export const EsqueletoLista = ({
  linhas = 6,
  avatar = false,
  colunas = 0,
  className,
}: {
  linhas?: number;
  /** Círculo à esquerda, como na lista de pacientes */
  avatar?: boolean;
  /** Colunas extras à direita (tabelas) */
  colunas?: number;
  className?: string;
}) => (
  <div className={cn("divide-y overflow-hidden rounded-lg border bg-card", className)} aria-busy="true" aria-label="Carregando">
    {Array.from({ length: linhas }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        {avatar && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5" style={{ width: `${45 + ((i * 17) % 30)}%` }} />
          <Skeleton className="h-3 w-1/3" />
        </div>
        {Array.from({ length: colunas }).map((_, c) => (
          <Skeleton key={c} className="hidden h-3.5 w-16 shrink-0 sm:block" />
        ))}
      </div>
    ))}
  </div>
);
