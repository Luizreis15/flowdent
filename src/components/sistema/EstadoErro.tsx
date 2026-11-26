import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EstadoErroProps {
  /** Ex.: "Não foi possível carregar os pacientes" */
  titulo?: string;
  descricao?: string;
  /** Mostra o botão "Tentar de novo" */
  onTentarDeNovo?: () => void;
  className?: string;
}

/**
 * Estado de erro de lista, tabela ou gráfico, no mesmo desenho do EstadoVazio. Antes uma falha de rede
 * deixava a lista vazia (parecia "nenhum registro") e só um aviso passageiro dizia o contrário.
 */
export const EstadoErro = ({
  titulo = "Não foi possível carregar",
  descricao = "Verifique a conexão e tente de novo.",
  onTentarDeNovo,
  className,
}: EstadoErroProps) => (
  <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sinal-alerta-tenue">
      <AlertTriangle className="h-5 w-5 text-sinal-alerta" strokeWidth={1.5} />
    </div>
    <p className="text-sm font-medium text-foreground">{titulo}</p>
    {descricao && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{descricao}</p>}
    {onTentarDeNovo && (
      <Button variant="outline" size="sm" className="mt-4" onClick={onTentarDeNovo}>
        Tentar de novo
      </Button>
    )}
  </div>
);
