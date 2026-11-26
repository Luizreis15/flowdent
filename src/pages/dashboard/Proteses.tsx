import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Palette, Layers, FlaskConical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NovaProteseModal } from "@/components/proteses/NovaProteseModal";
import { DetalhesProteseModal } from "@/components/proteses/DetalhesProteseModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLUNAS = [
  { id: "moldagem", titulo: "Coleta de moldagem", cor: "bg-tinta-500" },
  { id: "enviado_lab", titulo: "Enviado ao laboratório", cor: "bg-acento-500" },
  { id: "em_execucao", titulo: "Em execução", cor: "bg-sinal-espera" },
  { id: "pronto_instalacao", titulo: "Pronto para instalação", cor: "bg-sinal-ok" },
  { id: "instalado", titulo: "Instalado", cor: "bg-bone-400" },
];

export default function Proteses() {
  // Antes a lista não filtrava por clínica (o super admin via próteses de todas ao visualizar uma clínica)
  const { clinicId } = useAuth();
  const [novaProteseOpen, setNovaProteseOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [proteseSelecionada, setProteseSelecionada] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  // Buscar próteses com etapa atual
  const { data: proteses, refetch, isLoading, isError } = useQuery({
    queryKey: ["proteses", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proteses")
        .select(`
          *,
          paciente:patients!proteses_paciente_id_fkey(full_name),
          profissional:profissionais!proteses_profissional_id_fkey(nome),
          laboratorio:laboratorios(nome),
          etapa_atual:protese_etapas!proteses_etapa_atual_id_fkey(
            id, ordem, nome_etapa, status, cor
          )
        `)
        .eq("clinica_id", clinicId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Buscar total de etapas por prótese
  const { data: etapasCount } = useQuery({
    queryKey: ["proteses-etapas-count", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protese_etapas")
        .select("protese_id, proteses!inner(clinica_id)")
        .eq("proteses.clinica_id", clinicId!);

      if (error) throw error;

      // Contar etapas por prótese
      const countMap: Record<string, number> = {};
      data?.forEach((etapa) => {
        countMap[etapa.protese_id] = (countMap[etapa.protese_id] || 0) + 1;
      });
      return countMap;
    },
  });

  const handleDragStart = (e: React.DragEvent, proteseId: string) => {
    e.dataTransfer.setData("proteseId", proteseId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, novoStatus: string) => {
    e.preventDefault();
    const proteseId = e.dataTransfer.getData("proteseId");

    const { error } = await supabase
      .from("proteses")
      .update({ 
        status: novoStatus as "moldagem" | "enviado_lab" | "em_execucao" | "pronto_instalacao" | "instalado" 
      })
      .eq("id", proteseId);

    if (!error) {
      refetch();
    }
  };

  const filtrarProteses = (status: string) => {
    return proteses?.filter((p: any) => {
      const matchStatus = p.status === status;
      const matchBusca = busca === "" || 
        p.paciente?.full_name?.toLowerCase().includes(busca.toLowerCase()) ||
        p.procedimento_nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.profissional?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.laboratorio?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.dente_elemento?.toLowerCase().includes(busca.toLowerCase()) ||
        p.cor_final?.toLowerCase().includes(busca.toLowerCase());
      
      return matchStatus && matchBusca;
    }) || [];
  };

  const abrirDetalhes = (proteseId: string) => {
    setProteseSelecionada(proteseId);
    setDetalhesOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <CabecalhoPagina
        titulo="Próteses"
        subtitulo="Fluxo protético por etapa, do molde à instalação"
        acoes={
          <Button onClick={() => setNovaProteseOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova prótese
          </Button>
        }
      />

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por paciente, procedimento, dentista, laboratório, dente ou cor..."
          className="pl-10"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isError ? (
        <div className="rounded-lg border bg-card">
          <EstadoErro titulo="Não foi possível carregar as próteses" onTentarDeNovo={() => refetch()} />
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5" aria-busy="true" aria-label="Carregando">
          {COLUNAS.map((c) => (
            <div key={c.id} className="space-y-2 rounded-md border bg-muted/40 p-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ))}
        </div>
      ) : !proteses?.length ? (
        <div className="rounded-lg border bg-card">
          <EstadoVazio
            icone={FlaskConical}
            titulo="Nenhuma prótese em andamento"
            descricao="Cadastre uma prótese para acompanhar cada etapa com o laboratório."
            acao={
              <Button size="sm" onClick={() => setNovaProteseOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nova prótese
              </Button>
            }
          />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {COLUNAS.map((coluna) => {
          const protesesColuna = filtrarProteses(coluna.id);
          
          return (
            <div
              key={coluna.id}
              className="min-w-[280px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, coluna.id)}
            >
              <div className="flex items-center gap-2 rounded-t-md border border-b-0 bg-card px-3 py-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${coluna.cor}`} aria-hidden />
                <h3 className="flex-1 text-sm font-medium text-foreground">{coluna.titulo}</h3>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{protesesColuna.length}</span>
              </div>
              
              <div className="bg-muted/40 rounded-b-md border border-t-0 p-2 min-h-[500px] space-y-2">
                {protesesColuna.map((protese: any) => {
                  const totalEtapas = etapasCount?.[protese.id] || 0;
                  const etapaAtual = protese.etapa_atual;
                  
                  return (
                    <Card
                      key={protese.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, protese.id)}
                      className="cursor-move transition-colors duration-150 hover:border-primary/40"
                      onClick={() => abrirDetalhes(protese.id)}
                    >
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span className="truncate">{protese.paciente?.full_name}</span>
                          {protese.dente_elemento && (
                            <Badge variant="outline" className="text-xs ml-1 shrink-0">
                              {protese.dente_elemento}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {protese.procedimento_nome}
                        </p>
                        
                        {/* Etapa Atual */}
                        {etapaAtual && totalEtapas > 0 && (
                          <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded px-2 py-1">
                            <Layers className="w-3 h-3" />
                            <span className="truncate">{etapaAtual.nome_etapa}</span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {etapaAtual.ordem}/{totalEtapas}
                            </Badge>
                          </div>
                        )}

                        {/* Cor e Material */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {(protese.cor_final || etapaAtual?.cor) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Palette className="w-3 h-3" />
                              <span>{protese.cor_final || etapaAtual?.cor}</span>
                            </div>
                          )}
                          {protese.material && (
                            <Badge variant="outline" className="text-[10px]">
                              {protese.material}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-xs space-y-1">
                          <p className="text-muted-foreground">
                            <strong>Dr(a):</strong> {protese.profissional?.nome}
                          </p>
                          {protese.laboratorio && (
                            <p className="text-muted-foreground">
                              <strong>Lab:</strong> {protese.laboratorio.nome}
                            </p>
                          )}
                        </div>

                        {protese.data_entrega_prevista && (
                          <div className="flex items-center justify-between">
                            <Badge variant={protese.atrasado ? "destructive" : "outline"} className="text-xs">
                              {format(new Date(protese.data_entrega_prevista), "dd/MM/yyyy", { locale: ptBR })}
                            </Badge>
                            {protese.custo_laboratorial && (
                              <span className="text-xs font-semibold">
                                R$ {Number(protese.custo_laboratorial).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}

                        {protese.atrasado && (
                          <Badge variant="destructive" className="text-xs w-full justify-center">
                            Atrasado
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <NovaProteseModal
        open={novaProteseOpen}
        onOpenChange={setNovaProteseOpen}
        onSuccess={refetch}
      />

      {proteseSelecionada && (
        <DetalhesProteseModal
          open={detalhesOpen}
          onOpenChange={setDetalhesOpen}
          proteseId={proteseSelecionada}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
