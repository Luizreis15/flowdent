import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";

interface ConsultaManutencaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casoId: string | null;
  tipoTratamento: string;
  onSuccess: () => void;
}

const TIPO_CONSULTA_LABELS: Record<string, string> = {
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

export function ConsultaManutencaoModal({ open, onOpenChange, casoId, tipoTratamento, onSuccess }: ConsultaManutencaoModalProps) {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataConsulta, setDataConsulta] = useState(new Date().toISOString().split("T")[0]);
  const [horarioConsulta, setHorarioConsulta] = useState("");
  const [tipoConsulta, setTipoConsulta] = useState("ativacao");
  const [professionalId, setProfessionalId] = useState("");
  const [fioUtilizado, setFioUtilizado] = useState("");
  const [elasticos, setElasticos] = useState("");
  const [numeroAlinhador, setNumeroAlinhador] = useState("");
  const [procedimentos, setProcedimentos] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [proximaConsulta, setProximaConsulta] = useState("");
  const [horarioProximaConsulta, setHorarioProximaConsulta] = useState("");

  const { availableSlots: slotsConsulta } = useAvailableSlots(
    professionalId || undefined,
    dataConsulta || undefined,
    clinicId || undefined
  );

  const { availableSlots: slotsProxima } = useAvailableSlots(
    professionalId || undefined,
    proximaConsulta || undefined,
    clinicId || undefined
  );

  const { data: professionals } = useQuery({
    queryKey: ["professionals-list", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("clinica_id", clinicId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: casoData } = useQuery({
    queryKey: ["ortho-case-patient", casoId],
    queryFn: async () => {
      if (!casoId) return null;
      const { data, error } = await supabase
        .from("ortho_cases")
        .select("patient_id, clinic_id")
        .eq("id", casoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!casoId,
  });

  const resetForm = () => {
    setDataConsulta(new Date().toISOString().split("T")[0]);
    setHorarioConsulta("");
    setTipoConsulta("ativacao");
    setProfessionalId("");
    setFioUtilizado("");
    setElasticos("");
    setNumeroAlinhador("");
    setProcedimentos("");
    setObservacoes("");
    setProximaConsulta("");
    setHorarioProximaConsulta("");
  };

  const createGeneralAppointment = async (
    patientId: string,
    dentistId: string,
    dateStr: string,
    timeStr: string,
    tipo: string,
    durationMinutes: number = 30
  ): Promise<string | null> => {
    const appointmentDate = new Date(`${dateStr}T${timeStr}:00`);
    const title = `Ortodontia - ${TIPO_CONSULTA_LABELS[tipo] || tipo}`;

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        patient_id: patientId,
        dentist_id: dentistId,
        title,
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: durationMinutes,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao criar agendamento na agenda geral:", error);
      toast.error("Erro ao sincronizar com a agenda: " + error.message);
      return null;
    }
    return data.id;
  };

  const handleSubmit = async () => {
    if (!casoId || !professionalId) {
      toast.error("Selecione o profissional");
      return;
    }
    if (!horarioConsulta) {
      toast.error("Selecione o horário da consulta");
      return;
    }
    if (!casoData?.patient_id) {
      toast.error("Não foi possível identificar o paciente do caso");
      return;
    }

    setLoading(true);
    try {
      const appointmentId = await createGeneralAppointment(
        casoData.patient_id,
        professionalId,
        dataConsulta,
        horarioConsulta,
        tipoConsulta
      );

      const { error } = await supabase.from("ortho_appointments").insert({
        case_id: casoId,
        data_consulta: dataConsulta,
        tipo_consulta: tipoConsulta,
        professional_id: professionalId,
        fio_utilizado: fioUtilizado || null,
        elasticos: elasticos || null,
        numero_alinhador: numeroAlinhador ? parseInt(numeroAlinhador) : null,
        procedimentos_realizados: procedimentos || null,
        observacoes: observacoes || null,
        proxima_consulta_prevista: proximaConsulta || null,
        appointment_id: appointmentId,
      });

      if (error) throw error;

      if (proximaConsulta && horarioProximaConsulta) {
        await createGeneralAppointment(
          casoData.patient_id,
          professionalId,
          proximaConsulta,
          horarioProximaConsulta,
          "ativacao"
        );
      }

      toast.success("Consulta registrada e agendamento sincronizado");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao registrar consulta: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAlinhadores = tipoTratamento === "alinhadores";
  const canSelectTime = !!professionalId && !!dataConsulta;
  const canSelectProximaTime = !!professionalId && !!proximaConsulta;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Consulta de Manutenção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profissional first - needed to load slots */}
          <div className="space-y-2">
            <Label>Profissional *</Label>
            <Select value={professionalId} onValueChange={(v) => {
              setProfessionalId(v);
              setHorarioConsulta("");
              setHorarioProximaConsulta("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Consulta *</Label>
              <Input
                type="date"
                value={dataConsulta}
                onChange={(e) => {
                  setDataConsulta(e.target.value);
                  setHorarioConsulta("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Horário *</Label>
              <Select
                value={horarioConsulta}
                onValueChange={setHorarioConsulta}
                disabled={!canSelectTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !canSelectTime
                      ? "Selecione profissional e data"
                      : slotsConsulta.length === 0
                        ? "Nenhum horário disponível"
                        : "Selecione o horário"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {slotsConsulta.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canSelectTime && slotsConsulta.length === 0 && (
                <p className="text-xs text-destructive">Nenhum horário disponível neste dia</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Consulta *</Label>
            <Select value={tipoConsulta} onValueChange={setTipoConsulta}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativacao">Ativação</SelectItem>
                <SelectItem value="colagem">Colagem</SelectItem>
                <SelectItem value="troca_fio">Troca de Fio</SelectItem>
                {isAlinhadores && <SelectItem value="troca_alinhador">Troca de Alinhador</SelectItem>}
                <SelectItem value="emergencia">Emergência</SelectItem>
                <SelectItem value="documentacao">Documentação</SelectItem>
                <SelectItem value="moldagem">Moldagem</SelectItem>
                <SelectItem value="contencao">Contenção</SelectItem>
                <SelectItem value="remocao">Remoção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isAlinhadores && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fio Utilizado</Label>
                <Input
                  value={fioUtilizado}
                  onChange={(e) => setFioUtilizado(e.target.value)}
                  placeholder="Ex: NiTi .014, Aço .019x.025"
                />
              </div>
              <div className="space-y-2">
                <Label>Elásticos</Label>
                <Input
                  value={elasticos}
                  onChange={(e) => setElasticos(e.target.value)}
                  placeholder="Ex: Classe II 3/16"
                />
              </div>
            </div>
          )}

          {isAlinhadores && (
            <div className="space-y-2">
              <Label>Nº do Alinhador</Label>
              <Input
                type="number"
                value={numeroAlinhador}
                onChange={(e) => setNumeroAlinhador(e.target.value)}
                placeholder="Ex: 12"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Procedimentos Realizados</Label>
            <Textarea
              value={procedimentos}
              onChange={(e) => setProcedimentos(e.target.value)}
              placeholder="Descreva os procedimentos..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas adicionais..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Próxima Consulta Prevista</Label>
              <Input
                type="date"
                value={proximaConsulta}
                onChange={(e) => {
                  setProximaConsulta(e.target.value);
                  setHorarioProximaConsulta("");
                }}
              />
            </div>
            {proximaConsulta && (
              <div className="space-y-2">
                <Label>Horário Próxima</Label>
                <Select
                  value={horarioProximaConsulta}
                  onValueChange={setHorarioProximaConsulta}
                  disabled={!canSelectProximaTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      slotsProxima.length === 0
                        ? "Sem horários"
                        : "Selecione"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {slotsProxima.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !horarioConsulta}>
            {loading ? "Salvando..." : "Registrar Consulta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
