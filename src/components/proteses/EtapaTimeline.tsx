import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock, Send, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Etapa {
  id: string;
  ordem: number;
  nome_etapa: string;
  status: "pendente" | "enviado" | "em_execucao" | "concluida" | "cancelada";
  laboratorio?: { nome: string } | null;
  cor?: string | null;
  data_envio?: string | null;
  data_retorno_prevista?: string | null;
  data_retorno_real?: string | null;
  custo?: number | null;
  observacoes?: string | null;
  created_at: string;
}

interface EtapaTimelineProps {
  etapas: Etapa[];
  etapaAtualId?: string | null;
}

const STATUS_CONFIG = {
  pendente: {
    label: "Pendente",
    icon: Clock,
    color: "bg-gray-400",
    badgeVariant: "outline" as const,
  },
  enviado: {
    label: "Enviado",
    icon: Send,
    color: "bg-tinta-500",
    badgeVariant: "default" as const,
  },
  em_execucao: {
    label: "Em Execução",
    icon: Loader2,
    color: "bg-sinal-espera",
    badgeVariant: "secondary" as const,
  },
  concluida: {
    label: "Concluída",
    icon: Check,
    color: "bg-sinal-ok",
    badgeVariant: "default" as const,
  },
  cancelada: {
    label: "Cancelada",
    icon: XCircle,
    color: "bg-sinal-alerta",
    badgeVariant: "destructive" as const,
  },
};

export function EtapaTimeline({ etapas, etapaAtualId }: EtapaTimelineProps) {
  if (!etapas || etapas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhuma etapa registrada ainda.
      </p>
    );
  }

  const sortedEtapas = [...etapas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-4">
      {sortedEtapas.map((etapa, index) => {
        const config = STATUS_CONFIG[etapa.status];
        const Icon = config.icon;
        const isAtual = etapa.id === etapaAtualId;
        const isLast = index === sortedEtapas.length - 1;

        return (
          <div key={etapa.id} className="relative flex gap-4">
            {/* Linha de conexão */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)]",
                  etapa.status === "concluida" ? "bg-sinal-ok" : "bg-muted"
                )}
              />
            )}

            {/* Ícone */}
            <div
              className={cn(
                "relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white shrink-0",
                config.color,
                isAtual && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>

            {/* Conteúdo */}
            <div className={cn(
              "flex-1 pb-4 border rounded-lg p-3",
              isAtual ? "border-primary bg-primary/5" : "border-muted"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {etapa.ordem}. {etapa.nome_etapa}
                  </span>
                  {isAtual && (
                    <Badge variant="default" className="text-xs">
                      ATUAL
                    </Badge>
                  )}
                </div>
                <Badge variant={config.badgeVariant} className="text-xs">
                  {config.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {etapa.laboratorio?.nome && (
                  <p>
                    <strong>Lab:</strong> {etapa.laboratorio.nome}
                  </p>
                )}
                {etapa.cor && (
                  <p>
                    <strong>Cor:</strong> {etapa.cor}
                  </p>
                )}
                {etapa.data_envio && (
                  <p>
                    <strong>Enviado:</strong>{" "}
                    {format(new Date(etapa.data_envio), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
                {etapa.data_retorno_prevista && (
                  <p>
                    <strong>Previsão:</strong>{" "}
                    {format(new Date(etapa.data_retorno_prevista), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
                {etapa.data_retorno_real && (
                  <p>
                    <strong>Retornou:</strong>{" "}
                    {format(new Date(etapa.data_retorno_real), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
                {etapa.custo && (
                  <p>
                    <strong>Custo:</strong> R$ {Number(etapa.custo).toFixed(2)}
                  </p>
                )}
              </div>

              {etapa.observacoes && (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  {etapa.observacoes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
