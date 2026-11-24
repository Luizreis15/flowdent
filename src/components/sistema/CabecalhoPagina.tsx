import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CabecalhoPaginaProps {
  titulo: string;
  /** Linha de contexto abaixo do título, como a data ou o período */
  subtitulo?: ReactNode;
  /** Ações à direita: no máximo uma primária e uma secundária */
  acoes?: ReactNode;
  className?: string;
}

/** Cabeçalho de página: título h1 da escala aprovada, contexto em texto secundário e ações à direita. */
export const CabecalhoPagina = ({ titulo, subtitulo, acoes, className }: CabecalhoPaginaProps) => (
  <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
    <div className="min-w-0">
      <h1 className="text-h1 text-foreground">{titulo}</h1>
      {subtitulo && <p className="mt-0.5 text-sm text-muted-foreground">{subtitulo}</p>}
    </div>
    {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
  </div>
);
