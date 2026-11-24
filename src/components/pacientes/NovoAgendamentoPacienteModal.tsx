import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { HorarioFuncionamento, DEFAULT_HORARIO } from "@/components/configuracoes/HorarioFuncionamentoCard";

const appointmentSchema = z.object({
  dentistId: z.string().uuid("Selecione um dentista válido"),
  title: z.string().min(1, "Tipo de consulta é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Horário é obrigatório"),
  duration: z.string().min(1, "Duração é obrigatória"),
});

const DAY_KEYS: (keyof HorarioFuncionamento["dias"])[] = [
  "domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"
];

const generateDynamicTimeSlots = (
  diaKey: keyof HorarioFuncionamento["dias"],
  config: HorarioFuncionamento
): string[] => {
  const diaConfig = config.dias[diaKey];
  if (!diaConfig?.ativo) return [];
  const slots: string[] = [];
  const intervalo = config.intervalo_padrao || 30;
  const [inicioH, inicioM] = diaConfig.inicio.split(':').map(Number);
  const [fimH, fimM] = diaConfig.fim.split(':').map(Number);
  let current = inicioH * 60 + inicioM;
  const end = fimH * 60 + fimM;
  while (current < end) {
    const hour = Math.floor(current / 60);
    const min = current % 60;
    if (diaConfig.almoco_inicio && diaConfig.almoco_fim) {
      const [aIH, aIM] = diaConfig.almoco_inicio.split(':').map(Number);
      const [aFH, aFM] = diaConfig.almoco_fim.split(':').map(Number);
      if (current >= aIH * 60 + aIM && current < aFH * 60 + aFM) {
        current += intervalo;
        continue;
      }
    }
    slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    current += intervalo;
  }
  return slots;
};

interface NovoAgendamentoPacienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  clinicId: string;
  onSuccess?: () => void;
}

export const NovoAgendamentoPacienteModal = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  clinicId,
  onSuccess,
}: NovoAgendamentoPacienteModalProps) => {
  const [saving, setSaving] = useState(false);
  const [dentists, setDentists] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clinicConfig, setClinicConfig] = useState<HorarioFuncionamento>(DEFAULT_HORARIO);
  const [dentistConfigs, setDentistConfigs] = useState<Record<string, HorarioFuncionamento>>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    dentistId: "",
    title: "",
    date: todayStr,
    time: "",
    duration: "30",
  });

  useEffect(() => {
    if (open && !dataLoaded) {
      loadData();
    }
    if (!open) {
      setFormData({ dentistId: "", title: "", date: todayStr, time: "", duration: "30" });
      setDataLoaded(false);
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [configRes, dentistsRes] = await Promise.all([
        supabase.from("configuracoes_clinica").select("horario_funcionamento").eq("clinica_id", clinicId).maybeSingle(),
        supabase.from("profissionais").select("id, nome, cro, especialidade, cor").eq("clinica_id", clinicId).eq("ativo", true).order("nome"),
      ]);

      if (configRes.data?.horario_funcionamento) {
        setClinicConfig(configRes.data.horario_funcionamento as unknown as HorarioFuncionamento);
      }
      if (dentistsRes.data) setDentists(dentistsRes.data);

      if (dentistsRes.data?.length) {
        const { data: agendaConfigs } = await supabase
          .from("profissional_agenda_config")
          .select("*")
          .in("profissional_id", dentistsRes.data.map(d => d.id));

        if (agendaConfigs?.length) {
          const configMap: Record<string, HorarioFuncionamento> = {};
          const grouped: Record<string, typeof agendaConfigs> = {};
          agendaConfigs.forEach(c => {
            if (!grouped[c.profissional_id]) grouped[c.profissional_id] = [];
            grouped[c.profissional_id].push(c);
          });
          const dayKeyMap: Record<number, keyof HorarioFuncionamento["dias"]> = {
            0: "domingo", 1: "segunda", 2: "terca", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sabado"
          };
          Object.entries(grouped).forEach(([profId, profConfigs]) => {
            const dias = { ...DEFAULT_HORARIO.dias };
            let intervalo = 30;
            profConfigs.forEach(pc => {
              const dayKey = dayKeyMap[pc.dia_semana];
              if (dayKey) {
                dias[dayKey] = {
                  ativo: pc.ativo,
                  inicio: pc.hora_inicio,
                  fim: pc.hora_fim,
                  almoco_inicio: pc.almoco_inicio || undefined,
                  almoco_fim: pc.almoco_fim || undefined,
                };
                if (pc.ativo) intervalo = pc.duracao_consulta_minutos;
              }
            });
            configMap[profId] = { dias, intervalo_padrao: intervalo };
          });
          setDentistConfigs(configMap);
        }
      }

      const { data: aptsData } = await supabase
        .from("appointments")
        .select("id, appointment_date, duration_minutes, status, dentist_id")
        .gte("appointment_date", `${todayStr}T00:00:00`)
        .order("appointment_date");

      if (aptsData) setAppointments(aptsData);
      setDataLoaded(true);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    }
  };

  const getAvailableSlots = () => {
    const formDentistConfig = formData.dentistId ? dentistConfigs[formData.dentistId] : null;
    const config = formDentistConfig || clinicConfig;
    const formDate = formData.date ? new Date(`${formData.date}T12:00:00`) : null;
    const formDayKey = formDate ? DAY_KEYS[formDate.getDay()] : null;
    const durationMin = parseInt(formData.duration) || 30;
    const interval = config.intervalo_padrao || 30;

    if (!formDayKey) return [];

    const allSlots = generateDynamicTimeSlots(formDayKey, config);
    const nowDate = new Date();
    const isFormToday = formData.date === format(nowDate, "yyyy-MM-dd");

    const dayAppts = appointments.filter(apt => {
      if (formData.dentistId && apt.dentist_id !== formData.dentistId) return false;
      return apt.appointment_date.startsWith(formData.date) && apt.status !== "cancelled";
    });

    const occupiedMinutes = new Set<number>();
    dayAppts.forEach(apt => {
      const aptDate = parseISO(apt.appointment_date);
      const startMin = aptDate.getHours() * 60 + aptDate.getMinutes();
      const dur = apt.duration_minutes || interval;
      for (let m = startMin; m < startMin + dur; m++) {
        occupiedMinutes.add(m);
      }
    });

    return allSlots.filter(slot => {
      const [h, m] = slot.split(":").map(Number);
      const slotMin = h * 60 + m;
      if (isFormToday && slotMin <= nowDate.getHours() * 60 + nowDate.getMinutes()) return false;
      for (let offset = 0; offset < durationMin; offset++) {
        if (occupiedMinutes.has(slotMin + offset)) return false;
      }
      return true;
    });
  };

  const handleSubmit = async () => {
    try {
      const validatedData = appointmentSchema.parse(formData);
      setSaving(true);
      const appointmentDateTime = new Date(`${validatedData.date}T${validatedData.time}`);
      const { error } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          dentist_id: validatedData.dentistId,
          title: validatedData.title,
          appointment_date: appointmentDateTime.toISOString(),
          duration_minutes: parseInt(validatedData.duration),
          status: "scheduled",
        });

      if (error) throw error;
      toast.success("Agendamento criado com sucesso");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao criar agendamento: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const availableSlots = getAvailableSlots();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Novo Agendamento
          </DialogTitle>
          <DialogDescription>
            Agendar consulta para <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dentista */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dentista *</Label>
            <Select value={formData.dentistId} onValueChange={(value) => {
              const dentistConfig = dentistConfigs[value];
              const defaultDuration = dentistConfig?.intervalo_padrao || 30;
              setFormData(prev => ({ ...prev, dentistId: value, duration: String(defaultDuration), time: "" }));
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dentista" />
              </SelectTrigger>
              <SelectContent>
                {dentists.map((dentist) => (
                  <SelectItem key={dentist.id} value={dentist.id}>
                    {dentist.nome} {dentist.especialidade ? `(${dentist.especialidade})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Consulta */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Consulta *</Label>
            <Select value={formData.title} onValueChange={(value) => setFormData(prev => ({ ...prev, title: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Consulta inicial">Consulta inicial</SelectItem>
                <SelectItem value="Retorno">Retorno</SelectItem>
                <SelectItem value="Continuação de tratamento">Continuação de tratamento</SelectItem>
                <SelectItem value="Limpeza">Limpeza</SelectItem>
                <SelectItem value="Canal">Canal</SelectItem>
                <SelectItem value="Clareamento">Clareamento</SelectItem>
                <SelectItem value="Ortodontia">Ortodontia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data *</Label>
              <Input
                type="date"
                value={formData.date}
                min={todayStr}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value, time: "" }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Horário *</Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
                disabled={!formData.date || !formData.dentistId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.dentistId ? "Dentista?" : !formData.date ? "Data?" : "Horário"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum horário disponível</div>
                  ) : (
                    availableSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Duração</Label>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60].map((val) => (
                <Button
                  key={val}
                  type="button"
                  size="sm"
                  variant={formData.duration === String(val) ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, duration: String(val), time: "" }))}
                >
                  {val}min
                </Button>
              ))}
              {[15, 30, 60].map((inc) => (
                <Button
                  key={`inc-${inc}`}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const current = parseInt(formData.duration) || 30;
                    setFormData(prev => ({ ...prev, duration: String(current + inc), time: "" }));
                  }}
                >
                  +{inc}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Total: {formData.duration} minutos</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Criar Agendamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
