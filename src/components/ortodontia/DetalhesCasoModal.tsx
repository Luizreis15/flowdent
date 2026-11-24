import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, User, Calendar, Clock, Stethoscope, DollarSign, AlertTriangle, SmilePlus, ImageIcon, ExternalLink } from "lucide-react";
import { AlignerTrackingTab } from "./AlignerTrackingTab";
import { OrthoImagesTab } from "./OrthoImagesTab";
import { OrthoFinanceiroTab } from "./OrthoFinanceiroTab";
import { format, parseISO, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConsultaManutencaoModal } from "./ConsultaManutencaoModal";
import { toast } from "sonner";

interface DetalhesCasoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casoId: string | null;
  onRefresh: () => void;
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
  alinhadores: "Alinhadores Invisíveis",
  movel: "Aparelho Móvel",
  contencao: "Contenção",
  ortopedia: "Ortopedia Funcional",
};

const ANGLE_MAP: Record<string, string> = {
  classe_i: "Classe I",
  classe_ii_div1: "Classe II - Div 1",
  classe_ii_div2: "Classe II - Div 2",
  classe_iii: "Classe III",
};

const MORDIDA_MAP: Record<string, string> = {
  normal: "Normal",
  aberta: "Aberta",
  profunda: "Profunda",
  cruzada: "Cruzada",
  topo: "Topo a Topo",
};

const TIPO_CONSULTA_MAP: Record<string, string> = {
  ativacao: "Ativação",
  colagem: "Colagem",
  troca_fio: "Troca de Fio",
  troca_alinhador: "Troca de Alinhador",
  emergencia: "Emergência",
  documentacao: "Documentação",
  moldagem: "Moldagem",
  contencao: "Contenção",
  remocao: "Remoção",
};

export function DetalhesCasoModal({ open, onOpenChange, casoId, onRefresh }: DetalhesCasoModalProps) {
  const navigate = useNavigate();
  const [consultaModalOpen, setConsultaModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  const { data: caso, refetch: refetchCaso } = useQuery({
    queryKey: ["ortho-case-detail", casoId],
    queryFn: async () => {
      if (!casoId) return null;
      const { data, error } = await supabase
        .from("ortho_cases")
        .select(`
          *,
          patient:patients!ortho_cases_patient_id_fkey(full_name, cpf, phone),
          professional:profissionais!ortho_cases_professional_id_fkey(nome),
          responsible:patient_contacts!ortho_cases_responsible_contact_id_fkey(name, phone, cpf, relation)
        `)
        .eq("id", casoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!casoId && open,
  });

  const { data: consultas, refetch: refetchConsultas } = useQuery({
    queryKey: ["ortho-appointments", casoId],
    queryFn: async () => {
      if (!casoId) return [];
      const { data, error } = await supabase
        .from("ortho_appointments")
        .select(`
          *,
          professional:profissionais!ortho_appointments_professional_id_fkey(nome)
        `)
        .eq("case_id", casoId)
        .order("data_consulta", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!casoId && open,
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!casoId) return;
    const updateData: any = { status: newStatus };
    if (newStatus === "finalizado") {
      updateData.data_termino = new Date().toISOString().split("T")[0];
    }
    const { error } = await supabase.from("ortho_cases").update(updateData).eq("id", casoId);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado");
      refetchCaso();
      onRefresh();
      setEditingStatus(false);
    }
  };

  const handleConsultaSuccess = () => {
    refetchConsultas();
    refetchCaso();
  };

  if (!caso) return null;

  const statusInfo = STATUS_MAP[caso.status] || { label: caso.status, variant: "outline" as const };
  const progresso = caso.total_meses && caso.data_inicio
    ? { atual: Math.min(differenceInMonths(new Date(), parseISO(caso.data_inicio)), caso.total_meses), total: caso.total_meses }
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-10">
              <div>
                <DialogTitle>{caso.patient?.full_name}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {TIPO_MAP[caso.tipo_tratamento] || caso.tipo_tratamento}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingStatus ? (
                  <Select value={caso.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejamento">Planejamento</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="contencao">Contenção</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="abandonado">Abandonado</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant={statusInfo.variant}
                    className="cursor-pointer"
                    onClick={() => setEditingStatus(true)}
                  >
                    {statusInfo.label}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="resumo" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="resumo" className="flex-1">Resumo</TabsTrigger>
              <TabsTrigger value="consultas" className="flex-1">
                Consultas ({consultas?.length || 0})
              </TabsTrigger>
              {caso.tipo_tratamento === "alinhadores" && (
                <TabsTrigger value="alinhadores" className="flex-1">
                  <SmilePlus className="w-3.5 h-3.5 mr-1" />
                  Alinhadores
                </TabsTrigger>
              )}
              <TabsTrigger value="imagens" className="flex-1">
                <ImageIcon className="w-3.5 h-3.5 mr-1" />
                Imagens
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex-1">
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Financeiro
              </TabsTrigger>
            </TabsList>

            {/* ===== RESUMO TAB ===== */}
            <TabsContent value="resumo" className="space-y-4">
              {/* Progresso */}
              {progresso && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">Progresso do Tratamento</span>
                      <span className="text-muted-foreground">{progresso.atual}/{progresso.total} meses</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-primary rounded-full h-3 transition-[width] duration-300"
                        style={{ width: `${Math.min((progresso.atual / progresso.total) * 100, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dados Clínicos */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" /> Dados Clínicos
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Classificação de Angle:</span>
                      <p className="font-medium">{caso.classificacao_angle ? ANGLE_MAP[caso.classificacao_angle] || caso.classificacao_angle : "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo de Mordida:</span>
                      <p className="font-medium">{caso.tipo_mordida ? MORDIDA_MAP[caso.tipo_mordida] || caso.tipo_mordida : "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Apinhamento:</span>
                      <p className="font-medium capitalize">{caso.apinhamento || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Arcada:</span>
                      <p className="font-medium capitalize">{caso.arcada}</p>
                    </div>
                    {caso.marca_aparelho && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Marca do Aparelho:</span>
                        <p className="font-medium">{caso.marca_aparelho}</p>
                      </div>
                    )}
                  </div>
                  {caso.observacoes_clinicas && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-sm">Observações:</span>
                      <p className="text-sm mt-1">{caso.observacoes_clinicas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Profissional e Responsável */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <User className="w-4 h-4" /> Profissional
                    </h4>
                    <p className="text-sm">Dr(a). {caso.professional?.nome}</p>
                  </CardContent>
                </Card>

                {caso.responsible && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-sinal-espera" /> Responsável financeiro
                      </h4>
                      <p className="text-sm font-medium">{caso.responsible.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {caso.responsible.relation}
                        {caso.responsible.phone && ` • ${caso.responsible.phone}`}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Datas */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Datas
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Início:</span>
                      <p className="font-medium">{format(parseISO(caso.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    {caso.previsao_termino && (
                      <div>
                        <span className="text-muted-foreground">Previsão:</span>
                        <p className="font-medium">{format(parseISO(caso.previsao_termino), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    )}
                    {caso.data_termino && (
                      <div>
                        <span className="text-muted-foreground">Término:</span>
                        <p className="font-medium">{format(parseISO(caso.data_termino), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Financeiro resumo */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Financeiro
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valor Total:</span>
                      <p className="font-medium">R$ {Number(caso.valor_total).toFixed(2)}</p>
                    </div>
                    {caso.valor_entrada != null && (
                      <div>
                        <span className="text-muted-foreground">Entrada:</span>
                        <p className="font-medium">R$ {Number(caso.valor_entrada).toFixed(2)}</p>
                      </div>
                    )}
                    {caso.valor_mensalidade != null && (
                      <div>
                        <span className="text-muted-foreground">Mensalidade:</span>
                        <p className="font-medium">R$ {Number(caso.valor_mensalidade).toFixed(2)}</p>
                      </div>
                    )}
                    {caso.dia_vencimento != null && (
                      <div>
                        <span className="text-muted-foreground">Vencimento:</span>
                        <p className="font-medium">Dia {caso.dia_vencimento}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== CONSULTAS TAB ===== */}
            <TabsContent value="consultas" className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setConsultaModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Consulta
                </Button>
              </div>

              {(!consultas || consultas.length === 0) ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">Nenhuma consulta registrada</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="relative pl-6 space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                  {consultas.map((consulta: any, index: number) => (
                    <div key={consulta.id} className="relative pb-6 last:pb-0">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 w-[14px] h-[14px] rounded-full border-2 border-primary bg-background z-10" />

                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge variant="outline" className="text-xs">
                                {TIPO_CONSULTA_MAP[consulta.tipo_consulta] || consulta.tipo_consulta}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(consulta.data_consulta), "dd/MM/yyyy", { locale: ptBR })}
                                {consulta.professional && ` — Dr(a). ${consulta.professional.nome}`}
                              </p>
                            </div>
                            {consulta.numero_alinhador && (
                              <Badge variant="secondary" className="text-xs">
                                Alinhador #{consulta.numero_alinhador}
                              </Badge>
                            )}
                          </div>

                          {(consulta.fio_utilizado || consulta.elasticos) && (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {consulta.fio_utilizado && (
                                <span className="bg-muted px-2 py-0.5 rounded">Fio: {consulta.fio_utilizado}</span>
                              )}
                              {consulta.elasticos && (
                                <span className="bg-muted px-2 py-0.5 rounded">Elásticos: {consulta.elasticos}</span>
                              )}
                            </div>
                          )}

                          {consulta.procedimentos_realizados && (
                            <p className="text-sm">{consulta.procedimentos_realizados}</p>
                          )}

                          {consulta.observacoes && (
                            <p className="text-xs text-muted-foreground italic">{consulta.observacoes}</p>
                          )}

                          {consulta.proxima_consulta_prevista && (
                            <p className="text-xs text-muted-foreground">
                              Próx. consulta: {format(parseISO(consulta.proxima_consulta_prevista), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1 h-7 text-xs gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dateStr = format(parseISO(consulta.proxima_consulta_prevista || consulta.data_consulta), "yyyy-MM-dd");
                              onOpenChange(false);
                              navigate(`/dashboard/agenda?date=${dateStr}`);
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver na Agenda
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ===== ALINHADORES TAB ===== */}
            {caso.tipo_tratamento === "alinhadores" && (
              <TabsContent value="alinhadores">
                <AlignerTrackingTab casoId={casoId!} />
              </TabsContent>
            )}

            {/* ===== IMAGENS TAB ===== */}
            <TabsContent value="imagens">
              <OrthoImagesTab casoId={casoId!} patientId={caso.patient_id} />
            </TabsContent>

            {/* ===== FINANCEIRO TAB ===== */}
            <TabsContent value="financeiro">
              <OrthoFinanceiroTab
                casoId={casoId!}
                budgetId={caso.budget_id}
                valorTotal={caso.valor_total}
                valorEntrada={caso.valor_entrada}
                valorMensalidade={caso.valor_mensalidade}
                diaVencimento={caso.dia_vencimento}
                totalMeses={caso.total_meses}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ConsultaManutencaoModal
        open={consultaModalOpen}
        onOpenChange={setConsultaModalOpen}
        casoId={casoId}
        tipoTratamento={caso.tipo_tratamento}
        onSuccess={handleConsultaSuccess}
      />
    </>
  );
}
