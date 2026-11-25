import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Carregamento de uma seção ou aba: título, linha de apoio e um bloco no lugar do conteúdo. */
export const EsqueletoSecao = ({ linhas = 3, className }: { linhas?: number; className?: string }) => (
  <div className={cn("space-y-4", className)} aria-busy="true" aria-label="Carregando">
    <div className="space-y-2">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
    <div className="space-y-2 rounded-lg border bg-card p-5">
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  </div>
);
