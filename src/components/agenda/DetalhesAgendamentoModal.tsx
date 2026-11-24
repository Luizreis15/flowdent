import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Clock, User, Stethoscope, Check, X, RefreshCw, Trash2, Edit2, Save, FileText, ClipboardCheck, MessageSquare, Loader2 } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  title: string;
  description?: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  patient_id: string;
  patient?: { id: string; full_name: string };
  dentist?: { id: string; nome: string; cor?: string };
}

interface DetalhesAgendamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  dentists: { id: string; nome: string; cor?: string }[];
  onUpdate: () => Promise<void>;
}

const statusColors: Record<string, string> = {
  confirmed: "bg-sinal-ok-tenue text-sinal-ok",
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-sinal-alerta-tenue text-sinal-alerta",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

export const DetalhesAgendamentoModal = ({
  open,
  onOpenChange,
  appointment,
  dentists,
  onUpdate,
}: DetalhesAgendamentoModalProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [finalizeNotes, setFinalizeNotes] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editData, setEditData] = useState({
    title: "",
    date: "",
    time: "",
    duration: "30",
    dentistId: "",
  });
  
  const [rescheduleData, setRescheduleData] = useState({
    date: "",
    time: "",
  });

  // Reset state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && appointment) {
      const aptDate = parseISO(appointment.appointment_date);
      setEditData({
        title: appointment.title,
        date: format(aptDate, "yyyy-MM-dd"),
        time: format(aptDate, "HH:mm"),
        duration: String(appointment.duration_minutes),
        dentistId: appointment.dentist?.id || "",
      });
      setRescheduleData({
        date: format(aptDate, "yyyy-MM-dd"),
        time: format(aptDate, "HH:mm"),
      });
    }
    if (!newOpen) {
      setIsEditing(false);
      setIsRescheduling(false);
    }
    onOpenChange(newOpen);
  };

  if (!appointment) return null;

  const aptDate = parseISO(appointment.appointment_date);
  const dentistColor = appointment.dentist?.cor || '#3b82f6';

  const handleUpdateStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointment.id);
      
      if (error) throw error;
      
      toast.success(`Status atualizado para "${statusLabels[newStatus]}"`);
      await onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      toast.error("Selecione data e horário");
      return;
    }
    
    setSaving(true);
    try {
      const newDateTime = new Date(`${rescheduleData.date}T${rescheduleData.time}`);
      
      const { error } = await supabase
        .from("appointments")
        .update({ 
          appointment_date: newDateTime.toISOString(),
          status: "scheduled"
        })
        .eq("id", appointment.id);
      
      if (error) throw error;
      
      toast.success("Agendamento reagendado com sucesso");
      await onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao reagendar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editData.title || !editData.date || !editData.time) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    setSaving(true);
    try {
      const newDateTime = new Date(`${editData.date}T${editData.time}`);
      
      const { error } = await supabase
        .from("appointments")
        .update({ 
          title: editData.title,
          appointment_date: newDateTime.toISOString(),
          duration_minutes: parseInt(editData.duration),
          dentist_id: editData.dentistId || null,
        })
        .eq("id", appointment.id);
      
      if (error) throw error;
      
      toast.success("Agendamento atualizado com sucesso");
      setIsEditing(false);
      await onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointment.id);
      
      if (error) throw error;
      
      toast.success("Agendamento excluído com sucesso");
      await onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const canFinalize = () => {
    const date = parseISO(appointment.appointment_date);
    const pastOrToday = isPast(date) || isToday(date);
    return pastOrToday && (appointment.status === "scheduled" || appointment.status === "confirmed");
  };

  const handleFinalize = async () => {
    if (!finalizeNotes.trim()) {
      toast.error("Preencha as observações do atendimento");
      return;
    }
    setFinalizing(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed", description: finalizeNotes.trim() })
        .eq("id", appointment.id);
      if (error) throw error;
      toast.success("Atendimento finalizado com sucesso");
      setShowFinalize(false);
      setFinalizeNotes("");
      await onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao finalizar atendimento: " + error.message);
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalhes do Agendamento
            </DialogTitle>
            <DialogDescription>
              Visualize, edite ou altere o status do agendamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Info do Paciente */}
            <div 
              className="p-4 rounded-lg border-l-4" 
              style={{ borderLeftColor: dentistColor, backgroundColor: `${dentistColor}10` }}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p 
                    className="font-semibold text-lg text-primary hover:underline cursor-pointer"
                    title="Abrir prontuário"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/dashboard/prontuario/${appointment.patient_id}`);
                    }}
                  >
                    {appointment.patient?.full_name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(aptDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{format(aptDate, "HH:mm")} • {appointment.duration_minutes} minutos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes */}
            {!isEditing && !isRescheduling && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Tipo de Consulta</p>
                  <p className="font-medium">{appointment.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Profissional</p>
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: dentistColor }}
                    />
                    <p className="font-medium">{appointment.dentist?.nome || "Não definido"}</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Status Atual</p>
                  <Badge className={statusColors[appointment.status] || "bg-muted"}>
                    {statusLabels[appointment.status] || appointment.status}
                  </Badge>
                </div>
                {appointment.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Observações
                    </p>
                    <p className="text-sm bg-muted/50 rounded-md p-2.5">{appointment.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Botão Finalizar Atendimento */}
            {!isEditing && !isRescheduling && canFinalize() && (
              <Button
                className="w-full"
                onClick={() => setShowFinalize(true)}
                disabled={saving}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Finalizar Atendimento
              </Button>
            )}

            {/* Form de Edição */}
            {isEditing && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Consulta</Label>
                  <Select value={editData.title} onValueChange={(v) => setEditData({...editData, title: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Limpeza">Limpeza</SelectItem>
                      <SelectItem value="Consulta">Consulta</SelectItem>
                      <SelectItem value="Canal">Canal</SelectItem>
                      <SelectItem value="Clareamento">Clareamento</SelectItem>
                      <SelectItem value="Ortodontia">Ortodontia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input 
                      type="date" 
                      value={editData.date}
                      onChange={(e) => setEditData({...editData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input 
                      type="time" 
                      value={editData.time}
                      onChange={(e) => setEditData({...editData, time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Duração</Label>
                    <Select value={editData.duration} onValueChange={(v) => setEditData({...editData, duration: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                        <SelectItem value="120">120 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Profissional</Label>
                    <Select value={editData.dentistId} onValueChange={(v) => setEditData({...editData, dentistId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {dentists.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            )}

            {/* Form de Reagendamento */}
            {isRescheduling && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <p className="font-medium text-sm">Selecione a nova data e horário:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nova Data</Label>
                    <Input 
                      type="date" 
                      value={rescheduleData.date}
                      onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Novo Horário</Label>
                    <Input 
                      type="time" 
                      value={rescheduleData.time}
                      onChange={(e) => setRescheduleData({...rescheduleData, time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsRescheduling(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button className="flex-1 whitespace-normal" onClick={handleReschedule} disabled={saving}>
                    <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
                    {saving ? "Reagendando..." : "Reagendar"}
                  </Button>
                </div>
              </div>
            )}

            {/* Botões de Status */}
            {!isEditing && !isRescheduling && (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Alterar Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className={cn(
                        "h-auto py-3 flex-col gap-1",
                        appointment.status === "confirmed" && "border-sinal-ok/40 bg-sinal-ok-tenue"
                      )}
                      onClick={() => handleUpdateStatus("confirmed")}
                      disabled={saving || appointment.status === "confirmed"}
                    >
                      <Check className="h-5 w-5 text-sinal-ok" />
                      <span className="text-xs">Confirmar</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-auto py-3 flex-col gap-1",
                        appointment.status === "no_show" && "border-sinal-alerta/40 bg-sinal-alerta-tenue"
                      )}
                      onClick={() => handleUpdateStatus("no_show")}
                      disabled={saving || appointment.status === "no_show"}
                    >
                      <X className="h-5 w-5 text-sinal-alerta" />
                      <span className="text-xs">Faltou</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => setIsRescheduling(true)}
                      disabled={saving}
                    >
                      <RefreshCw className="h-5 w-5 text-primary" />
                      <span className="text-xs">Reagendar</span>
                    </Button>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/dashboard/prontuario/${appointment.patient_id}`);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Prontuário
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(true)}
                    disabled={saving}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Finalizar Atendimento */}
      <Dialog open={showFinalize} onOpenChange={setShowFinalize}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Finalizar Atendimento
            </DialogTitle>
            <DialogDescription>
              Registre o que foi realizado nesta consulta. Este campo é obrigatório.
            </DialogDescription>
          </DialogHeader>

          {appointment && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p><strong>Paciente:</strong> {appointment.patient?.full_name}</p>
                <p><strong>Procedimento:</strong> {appointment.title}</p>
                <p><strong>Data:</strong> {format(parseISO(appointment.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                <p><strong>Profissional:</strong> {appointment.dentist?.nome || "Não informado"}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Observações do atendimento *
                </label>
                <Textarea
                  value={finalizeNotes}
                  onChange={(e) => setFinalizeNotes(e.target.value)}
                  placeholder="Descreva o que foi realizado nesta consulta..."
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalize(false)} disabled={finalizing}>
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
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Confirmar Finalização
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
