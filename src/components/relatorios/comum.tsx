import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { pct } from "./dados";

export const CartaoGrafico = ({
  titulo,
  nota,
  acoes,
  children,
  className,
}: {
  titulo: string;
  nota?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
      <div>
        <CardTitle className="text-[15px]">{titulo}</CardTitle>
        {nota && <p className="mt-0.5 text-[13px] text-muted-foreground">{nota}</p>}
      </div>
      {acoes && <div className="flex shrink-0 gap-2">{acoes}</div>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

/**
 * Participação como lista ranqueada com barra fina: lê melhor que pizza e usa uma cor só.
 * O primeiro item leva a cor de destaque; os demais, o neutro da paleta.
 */
export const ListaRanqueada = ({
  itens,
  unidade,
  tom = "destaque",
}: {
  itens: { nome: string; valor: number }[];
  unidade?: string;
  /** "alerta" quando a lista conta um problema, como faltas */
  tom?: "destaque" | "alerta";
}) => {
  const total = itens.reduce((s, i) => s + i.valor, 0);
  const maior = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <ul className="space-y-3">
      {itens.map((item, i) => (
        <li key={item.nome}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-foreground">{item.nome}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">{item.valor}</span>
              {unidade && ` ${unidade}`} · {pct(item.valor, total)}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                i === 0 ? (tom === "alerta" ? "bg-sinal-alerta" : "bg-tinta-700") : "bg-bone-400",
              )}
              style={{ width: `${(item.valor / maior) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Um botão de exportação com os três formatos no menu, no lugar de três botões lado a lado */
export const BotaoExportar = ({
  onCSV,
  onExcel,
  onPDF,
}: {
  onCSV: () => void;
  onExcel: () => void;
  onPDF: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Exportar
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onCSV}>CSV</DropdownMenuItem>
      <DropdownMenuItem onClick={onExcel}>Excel</DropdownMenuItem>
      <DropdownMenuItem onClick={onPDF}>PDF</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
