import { useState, useEffect } from "react";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { EsqueletoLista } from "@/components/sistema/EsqueletoLista";
import { NovoAgendamentoPacienteModal } from "./NovoAgendamentoPacienteModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus,
  User,
  ClipboardCheck,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast, isToday, isFuture, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgendamentosTabProps {
  patientId: string;
}

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  appointment_date: string;
  duration_minutes: number | null;
  status: string | null;
  dentist_id: string;
  profissional?: {
    nome: string;
  };
}

export const AgendamentosTab = ({ patientId }: AgendamentosTabProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [activeTab, setActiveTab] = useState("todos");
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeTarget, setFinalizeTarget] = useState<Appointment | null>(null);
  const [finalizeNotes, setFinalizeNotes] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [novoAgendamentoOpen, setNovoAgendamentoOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [clinicId, setClinicId] = useState("");

  useEffect(() => {
    loadAppointments();
    loadPatientInfo();
  }, [patientId]);

  const loadPatientInfo = async () => {
    const { data } = await supabase
      .from("patients")
      .select("full_name, clinic_id")
      .eq("id", patientId)
      .single();
    if (data) {
      setPatientName(data.full_name);
      setClinicId(data.clinic_id);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setErroCarregar(false);
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          profissional:profissionais!appointments_dentist_id_fkey(nome)
        `)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar agendamentos:", error);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const date = parseISO(apt.appointment_date);
    switch (activeTab) {
      case "proximos":
        return isFuture(date) || isToday(date);
      case "realizados":
        return apt.status === "completed" || apt.status === "confirmed";
      case "cancelados":
        return apt.status === "cancelled" || apt.status === "no_show";
      default:
        return true;
    }
  });

  const totalAgendamentos = appointments.length;
  const agendamentosRealizados = appointments.filter(a => 
    a.status === "completed" || a.status === "confirmed"
  ).length;
  const agendamentosCancelados = appointments.filter(a => 
    a.status === "cancelled" || a.status === "no_show"
  ).length;
  const proximosAgendamentos = appointments.filter(a => {
    const date = parseISO(a.appointment_date);
    return isFuture(date) || isToday(date);
  }).length;

  const canFinalize = (apt: Appointment) => {
    const date = parseISO(apt.appointment_date);
    const pastOrToday = isPast(date) || isToday(date);
    return pastOrToday && (apt.status === "scheduled" || apt.status === "confirmed" || !apt.status);
  };

  const handleOpenFinalize = (apt: Appointment) => {
    setFinalizeTarget(apt);
    setFinalizeNotes("");
    setFinalizeOpen(true);
  };

  const handleFinalize = async () => {
    if (!finalizeTarget || !finalizeNotes.trim()) {
      toast.error("Preencha as observações do atendimento");
      return;
    }
    try {
      setFinalizing(true);
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed", description: finalizeNotes.trim() })
        .eq("id", finalizeTarget.id);
      if (error) throw error;
      toast.success("Atendimento finalizado com sucesso");
      setFinalizeOpen(false);
      loadAppointments();
    } catch (error: any) {
      console.error("Erro ao finalizar atendimento:", error);
      toast.error("Erro ao finalizar atendimento");
    } finally {
      setFinalizing(false);
    }
  };

  const getStatusBadge = (status: string | null, date: string) => {
    const appointmentDate = parseISO(date);
    switch (status) {
      case "completed":
        return <Badge className="border-transparent bg-sinal-ok-tenue text-sinal-ok">Realizado</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-500 text-white">Confirmado</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      case "no_show":
        return <Badge className="border-transparent bg-sinal-alerta-tenue text-sinal-alerta">Não compareceu</Badge>;
      case "scheduled":
        if (isPast(appointmentDate) && !isToday(appointmentDate)) {
          return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
        }
        return <Badge variant="secondary">Agendado</Badge>;
      default:
        return <Badge variant="secondary">{status || "Agendado"}</Badge>;
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (erroCarregar) {
    return (
      <Card>
        <EstadoErro titulo="Não foi possível carregar os agendamentos" onTentarDeNovo={loadAppointments} />
      </Card>
    );
  }

  if (loading) {
    return <EsqueletoLista linhas={5} colunas={3} />;
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{totalAgendamentos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximos</p>
                <p className="text-xl font-bold text-blue-600">{proximosAgendamentos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Realizados</p>
                <p className="text-xl font-bold text-green-600">{agendamentosRealizados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cancelados</p>
                <p className="text-xl font-bold text-red-600">{agendamentosCancelados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs e Lista */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Histórico de Agendamentos</CardTitle>
          <Button
            size="sm"
            onClick={() => setNovoAgendamentoOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="proximos">Próximos</TabsTrigger>
              <TabsTrigger value="realizados">Realizados</TabsTrigger>
              <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {filteredAppointments.length === 0 ? (
                <EstadoVazio
                  icone={Calendar}
                  titulo={
                    activeTab === "todos"
                      ? "Nenhum agendamento"
                      : `Nenhum agendamento ${activeTab === "proximos" ? "próximo" : activeTab}`
                  }
                  descricao="As consultas deste paciente aparecem aqui."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Procedimento</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => {
                        const date = parseISO(appointment.appointment_date);
                        const isUpcoming = isFuture(date) || isToday(date);
                        
                        return (
                          <TableRow 
                            key={appointment.id}
                            className={isUpcoming ? "bg-blue-50/50" : ""}
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {format(date, "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {format(date, "HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{appointment.title}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{appointment.profissional?.nome || "Não informado"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDuration(appointment.duration_minutes)}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {appointment.description ? (
                                <span className="text-sm text-muted-foreground line-clamp-2">
                                  {appointment.description}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(appointment.status, appointment.appointment_date)}
                            </TableCell>
                            <TableCell className="text-right">
                              {canFinalize(appointment) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenFinalize(appointment)}
                                  title="Finalizar atendimento"
                                >
                                  <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                                  Finalizar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Próximo Agendamento Destacado */}
      {proximosAgendamentos > 0 && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-1">Próximo Agendamento</h4>
                {(() => {
                  const next = appointments.find(a => {
                    const d = parseISO(a.appointment_date);
                    return isFuture(d) || isToday(d);
                  });
                  if (!next) return null;
                  const d = parseISO(next.appointment_date);
                  return (
                    <div className="space-y-1">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{next.title}</span>
                        {" com "}
                        <span className="font-medium text-foreground">
                          {next.profissional?.nome || "profissional não informado"}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold text-blue-600">
                          {isToday(d) ? "Hoje" : format(d, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        {" às "}
                        <span className="font-semibold text-blue-600">
                          {format(d, "HH:mm", { locale: ptBR })}
                        </span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Finalizar Atendimento */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Finalizar Atendimento
            </DialogTitle>
            <DialogDescription>
              Registre o que foi realizado nesta consulta. Este campo é obrigatório para gerar o histórico do paciente.
            </DialogDescription>
          </DialogHeader>

          {finalizeTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p><strong>Procedimento:</strong> {finalizeTarget.title}</p>
                <p><strong>Data:</strong> {format(parseISO(finalizeTarget.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                <p><strong>Profissional:</strong> {finalizeTarget.profissional?.nome || "Não informado"}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Observações do atendimento *
                </label>
                <Textarea
                  value={finalizeNotes}
                  onChange={(e) => setFinalizeNotes(e.target.value)}
                  placeholder="Descreva o que foi realizado nesta consulta... Ex: Limpeza completa, aplicação de flúor, orientações de higiene bucal."
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeOpen(false)} disabled={finalizing}>
              Cancelar
            </Button>
            <Button onClick={handleFinalize} disabled={finalizing || !finalizeNotes.trim()}>
              {finalizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Finalização
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Agendamento inline */}
      {clinicId && (
        <NovoAgendamentoPacienteModal
          open={novoAgendamentoOpen}
          onOpenChange={setNovoAgendamentoOpen}
          patientId={patientId}
          patientName={patientName}
          clinicId={clinicId}
          onSuccess={loadAppointments}
        />
      )}
    </div>
  );
};
