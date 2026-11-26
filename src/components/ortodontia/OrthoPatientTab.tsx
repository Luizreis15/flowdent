import { useState } from "react";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { EsqueletoLista } from "@/components/sistema/EsqueletoLista";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SmilePlus, User, Clock, Calendar } from "lucide-react";
import { DetalhesCasoModal } from "./DetalhesCasoModal";
import { format, parseISO, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrthoPatientTabProps {
  patientId: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planejamento: { label: "Planejamento", variant: "secondary" },
  ativo: { label: "Ativo", variant: "default" },
  contencao: { label: "Contenção", variant: "outline" },
  finalizado: { label: "Finalizado", variant: "secondary" },
  abandonado: { label: "Abandonado", variant: "destructive" },
};

const TIPO_MAP: Record<string, string> = {
  aparelho_fixo: "Aparelho Fixo",
  alinhadores: "Alinhadores",
  movel: "Móvel",
  contencao: "Contenção",
  ortopedia: "Ortopedia",
};

export function OrthoPatientTab({ patientId }: OrthoPatientTabProps) {
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selectedCasoId, setSelectedCasoId] = useState<string | null>(null);

  const { data: casos, refetch, isLoading, isError } = useQuery({
    queryKey: ["ortho-cases-patient", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ortho_cases")
        .select(`
          *,
          professional:profissionais!ortho_cases_professional_id_fkey(nome)
        `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isError) {
    return (
      <Card>
        <EstadoErro titulo="Não foi possível carregar os casos" onTentarDeNovo={() => refetch()} />
      </Card>
    );
  }

  if (isLoading) {
    return <EsqueletoLista linhas={2} colunas={2} />;
  }

  if (!casos || casos.length === 0) {
    return (
      <Card>
        <EstadoVazio
          icone={SmilePlus}
          titulo="Nenhum caso ortodôntico"
          descricao="Os casos deste paciente aparecem aqui. Crie um caso no módulo Ortodontia."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {casos.map((caso: any) => {
          const statusInfo = STATUS_MAP[caso.status] || { label: caso.status, variant: "outline" as const };
          const progresso = caso.total_meses && caso.data_inicio
            ? { atual: Math.min(differenceInMonths(new Date(), parseISO(caso.data_inicio)), caso.total_meses), total: caso.total_meses }
            : null;

          return (
            <Card
              key={caso.id}
              className="cursor-pointer transition-colors duration-150 hover:bg-muted/30"
              onClick={() => { setSelectedCasoId(caso.id); setDetalhesOpen(true); }}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{TIPO_MAP[caso.tipo_tratamento] || caso.tipo_tratamento}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="w-3 h-3" />
                      <span>Dr(a). {caso.professional?.nome}</span>
                    </div>
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>

                {progresso && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span>{progresso.atual}/{progresso.total} meses</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-[width] duration-300"
                        style={{ width: `${Math.min((progresso.atual / progresso.total) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Início: {format(parseISO(caso.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DetalhesCasoModal
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        casoId={selectedCasoId}
        onRefresh={refetch}
      />
    </>
  );
}
