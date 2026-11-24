import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { CadastroRapidoPacienteModal } from "@/components/agenda/CadastroRapidoPacienteModal";
import { HorarioFuncionamento, DEFAULT_HORARIO } from "@/components/configuracoes/HorarioFuncionamentoCard";

const appointmentSchema = z.object({
  patientId: z.string().uuid("Selecione um paciente válido"),
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

interface NovoAgendamentoMobileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  onSuccess?: () => void;
}

const NovoAgendamentoMobileModal = ({ open, onOpenChange, clinicId, onSuccess }: NovoAgendamentoMobileModalProps) => {
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clinicConfig, setClinicConfig] = useState<HorarioFuncionamento>(DEFAULT_HORARIO);
  const [dentistConfigs, setDentistConfigs] = useState<Record<string, HorarioFuncionamento>>({});
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [openPatientCombobox, setOpenPatientCombobox] = useState(false);
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    patientId: "",
    dentistId: "",
    title: "",
    date: todayStr,
    time: "",
    duration: "30",
  });

  const pacientesFiltrados = patients.filter((p) =>
    p.full_name.toLowerCase().includes(buscaPaciente.toLowerCase())
  );

  // Load data when modal opens
  useEffect(() => {
    if (open && !dataLoaded) {
      loadData();
    }
    if (!open) {
      // Reset form when closing
      setFormData({
        patientId: "",
        dentistId: "",
        title: "",
        date: todayStr,
        time: "",
        duration: "30",
      });
      setOpenPatientCombobox(false);
      setBuscaPaciente("");
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [patientsRes, configRes, dentistsRes] = await Promise.all([
        supabase.from("patients").select("id, full_name").eq("clinic_id", clinicId).order("full_name"),
        supabase.from("configuracoes_clinica").select("horario_funcionamento").eq("clinica_id", clinicId).maybeSingle(),
        supabase.from("profissionais").select("id, nome, cro, especialidade, cor").eq("clinica_id", clinicId).eq("ativo", true).order("nome"),
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (configRes.data?.horario_funcionamento) {
        setClinicConfig(configRes.data.horario_funcionamento as unknown as HorarioFuncionamento);
      }
      if (dentistsRes.data) setDentists(dentistsRes.data);

      // Load dentist agenda configs
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

      // Load today's appointments for slot validation
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
    const formConfig = formDentistConfig || clinicConfig;
    const formDate = formData.date ? new Date(`${formData.date}T12:00:00`) : null;
    const formDayKey = formDate ? DAY_KEYS[formDate.getDay()] : null;
    const durationMin = parseInt(formData.duration) || 30;
    const interval = formConfig.intervalo_padrao || 30;

    if (!formDayKey) return [];

    const allSlots = generateDynamicTimeSlots(formDayKey, formConfig);
    const now = new Date();
    const isFormToday = formData.date === format(now, "yyyy-MM-dd");

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
      if (isFormToday && slotMin <= now.getHours() * 60 + now.getMinutes()) return false;
      for (let offset = 0; offset < durationMin; offset++) {
        if (occupiedMinutes.has(slotMin + offset)) return false;
      }
      return true;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = appointmentSchema.parse(formData);
      setSaving(true);
      const appointmentDateTime = new Date(`${validatedData.date}T${validatedData.time}`);
      const { error } = await supabase
        .from("appointments")
        .insert({
          patient_id: validatedData.patientId,
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[100vw] w-full h-[100dvh] max-h-[100dvh] m-0 p-0 rounded-none border-none flex flex-col [&>button]:hidden">
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
            <DialogHeader className="flex-1 text-center space-y-0">
              <DialogTitle className="text-base font-semibold">Novo Agendamento</DialogTitle>
            </DialogHeader>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>

          {/* Scrollable Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Paciente */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Paciente *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewPatientModalOpen(true)}
                  className="h-7 text-xs text-primary"
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Novo Paciente
                </Button>
              </div>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal h-11"
                  onClick={() => setOpenPatientCombobox(!openPatientCombobox)}
                >
                  {formData.patientId
                    ? patients.find((p) => p.id === formData.patientId)?.full_name
                    : "Pesquisar paciente..."}
                </Button>
                {openPatientCombobox && (
                  <div className="absolute top-full left-0 mt-1 w-full border rounded-lg bg-popover shadow-lg z-50 max-h-[250px] overflow-hidden">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        placeholder="Digite o nome..."
                        value={buscaPaciente}
                        onChange={(e) => setBuscaPaciente(e.target.value)}
                        className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-[200px] overflow-auto p-1">
                      {pacientesFiltrados.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          Nenhum paciente encontrado.
                        </div>
                      ) : (
                        pacientesFiltrados.map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, patientId: patient.id }));
                              setOpenPatientCombobox(false);
                              setBuscaPaciente("");
                            }}
                            className="flex cursor-pointer items-center rounded-md px-2 py-2.5 text-sm hover:bg-accent"
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.patientId === patient.id ? "opacity-100" : "opacity-0")} />
                            {patient.full_name}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dentista */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dentista *</Label>
              <Select value={formData.dentistId} onValueChange={(value) => {
                const dentistConfig = dentistConfigs[value];
                const defaultDuration = dentistConfig?.intervalo_padrao || 30;
                setFormData(prev => ({ ...prev, dentistId: value, duration: String(defaultDuration), time: "" }));
              }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o dentista" />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map((dentist) => (
                    <SelectItem key={dentist.id} value={dentist.id}>{dentist.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Consulta */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Consulta *</Label>
              <Select value={formData.title} onValueChange={(value) => setFormData(prev => ({ ...prev, title: value }))}>
                <SelectTrigger className="h-11">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value, time: "" }))}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Horário *</Label>
                <Select
                  value={formData.time}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
                  disabled={!formData.date || !formData.dentistId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={!formData.dentistId ? "Dentista?" : !formData.date ? "Data?" : "Horário"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum horário</div>
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
              <Label className="text-sm font-medium">Duração *</Label>
              <div className="flex flex-wrap gap-2">
                {[15, 30, 45, 60].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    size="sm"
                    variant={formData.duration === String(val) ? "default" : "outline"}
                    onClick={() => setFormData(prev => ({ ...prev, duration: String(val), time: "" }))}
                    className="h-10 px-4"
                  >
                    {val}min
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
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
                    className="h-10 px-4"
                  >
                    +{inc}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Total: {formData.duration} minutos</p>
            </div>
          </form>

          {/* Fixed Bottom Buttons */}
          <div className="flex gap-3 px-4 py-4 border-t bg-card shrink-0 pb-safe">
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1 h-12" disabled={saving} onClick={handleSubmit}>
              {saving ? "Salvando..." : "Criar Agendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CadastroRapidoPacienteModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
        onPatientCreated={(patientId) => {
          // Reload patients to get the new one
          supabase.from("patients").select("id, full_name").eq("clinic_id", clinicId).order("full_name")
            .then(({ data }) => {
              if (data) {
                setPatients(data);
                setFormData(prev => ({ ...prev, patientId }));
              }
            });
        }}
      />
    </>
  );
};

export default NovoAgendamentoMobileModal;
