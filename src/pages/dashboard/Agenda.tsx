import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Filter, X, UserPlus, ArrowLeft, Users, Check, ChevronsUpDown, Search, RefreshCw, Printer, LayoutGrid, List, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth, parseISO, isToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CadastroRapidoPacienteModal } from "@/components/agenda/CadastroRapidoPacienteModal";
import { DetalhesAgendamentoModal } from "@/components/agenda/DetalhesAgendamentoModal";
import { HorarioFuncionamento, DiaConfig, DEFAULT_HORARIO } from "@/components/configuracoes/HorarioFuncionamentoCard";

const appointmentSchema = z.object({
  patientId: z.string().uuid("Selecione um paciente válido"),
  dentistId: z.string().uuid("Selecione um dentista válido"),
  title: z.string().min(1, "Tipo de consulta é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Horário é obrigatório"),
  duration: z.string().min(1, "Duração é obrigatória"),
});

// Map day index to day key
const DAY_KEYS: (keyof HorarioFuncionamento["dias"])[] = [
  "domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"
];

const DAY_LABELS: Record<keyof HorarioFuncionamento["dias"], string> = {
  domingo: "Domingo", segunda: "Segunda", terca: "Terça", quarta: "Quarta",
  quinta: "Quinta", sexta: "Sexta", sabado: "Sábado"
};

// Generate time slots dynamically based on clinic config
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
    
    // Check if slot is in lunch break
    if (diaConfig.almoco_inicio && diaConfig.almoco_fim) {
      const [almocoInicioH, almocoInicioM] = diaConfig.almoco_inicio.split(':').map(Number);
      const [almocoFimH, almocoFimM] = diaConfig.almoco_fim.split(':').map(Number);
      const almocoInicio = almocoInicioH * 60 + almocoInicioM;
      const almocoFim = almocoFimH * 60 + almocoFimM;
      
      if (current >= almocoInicio && current < almocoFim) {
        current += intervalo;
        continue;
      }
    }
    
    slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    current += intervalo;
  }
  
  return slots;
};

// Get all unique time slots for multiple days (for week view)
const getAllTimeSlotsForDays = (
  dayKeys: (keyof HorarioFuncionamento["dias"])[],
  config: HorarioFuncionamento
): string[] => {
  const allSlots = new Set<string>();
  dayKeys.forEach(dayKey => {
    const slots = generateDynamicTimeSlots(dayKey, config);
    slots.forEach(slot => allSlots.add(slot));
  });
  return Array.from(allSlots).sort();
};

// Check if a slot is in lunch break
const isLunchBreak = (time: string, diaConfig: DiaConfig): boolean => {
  if (!diaConfig.almoco_inicio || !diaConfig.almoco_fim) return false;
  
  const [h, m] = time.split(':').map(Number);
  const currentMin = h * 60 + m;
  
  const [almocoInicioH, almocoInicioM] = diaConfig.almoco_inicio.split(':').map(Number);
  const [almocoFimH, almocoFimM] = diaConfig.almoco_fim.split(':').map(Number);
  const almocoInicio = almocoInicioH * 60 + almocoInicioM;
  const almocoFim = almocoFimH * 60 + almocoFimM;
  
  return currentMin >= almocoInicio && currentMin < almocoFim;
};

// Helper to check if a date is in the past
const isPastDate = (date: Date) => {
  return isBefore(startOfDay(date), startOfDay(new Date()));
};

// Helper to check if a specific time slot has passed
const isPastSlot = (date: Date, time: string) => {
  if (isPastDate(date)) return true;
  
  // If it's today, check if the time has passed
  if (isSameDay(date, new Date())) {
    const now = new Date();
    const [hour, minute] = time.split(":").map(Number);
    const slotTime = new Date(date);
    slotTime.setHours(hour, minute, 0, 0);
    return slotTime < now;
  }
  
  return false;
};

const Agenda = () => {
  const { clinicId: authClinicId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "week" | "day-slots">("calendar");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [openPatientCombobox, setOpenPatientCombobox] = useState(false);
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patientNoShowStats, setPatientNoShowStats] = useState<Record<string, number>>({});
  const [clinicConfig, setClinicConfig] = useState<HorarioFuncionamento>(DEFAULT_HORARIO);
  const [dentistConfigs, setDentistConfigs] = useState<Record<string, HorarioFuncionamento>>({});
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    dentistId: "all",
  });
  
  // Filter patients based on search
  const pacientesFiltrados = patients.filter((p) =>
    p.full_name.toLowerCase().includes(buscaPaciente.toLowerCase())
  );
  const [formData, setFormData] = useState({
    patientId: "",
    dentistId: "",
    title: "",
    date: "",
    time: "",
    duration: "30",
  });

  // Determine active config: per-dentist when filtered, otherwise clinic-wide
  const activeConfig = (() => {
    if (filters.dentistId !== "all" && dentistConfigs[filters.dentistId]) {
      return dentistConfigs[filters.dentistId];
    }
    return clinicConfig;
  })();

  // Compute TIME_SLOTS based on selected date and active config
  const selectedDayKey = DAY_KEYS[selectedDate.getDay()];
  const TIME_SLOTS = generateDynamicTimeSlots(selectedDayKey, activeConfig);

  // Handle URL params for pre-selecting date/time
  useEffect(() => {
    const dateParam = searchParams.get("date");
    const timeParam = searchParams.get("time");
    
    const isNew = searchParams.get("new") === "true";

    if (isNew) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setSelectedDate(now);
      setCurrentMonth(now);
      setViewMode("day-slots");
      setFormData(prev => ({
        ...prev,
        date: today,
        time: "",
      }));
      setTimeout(() => setIsSheetOpen(true), 100);
      setSearchParams({}, { replace: true });
    } else if (dateParam) {
      const parsedDate = parseISO(dateParam);
      setSelectedDate(parsedDate);
      setCurrentMonth(parsedDate);
      setViewMode("day-slots");
      
      if (timeParam) {
        if (!isPastSlot(parsedDate, timeParam)) {
          setFormData(prev => ({
            ...prev,
            date: dateParam,
            time: timeParam,
          }));
          setIsSheetOpen(true);
        } else {
          toast.info("Este horário já passou. Selecione outro horário disponível.");
        }
      }
      
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (authClinicId) loadData();
  }, [authClinicId]);

  useEffect(() => {
    if (authClinicId) loadAppointments();
  }, [currentMonth, authClinicId]);

  // Re-fetch appointments when user returns to the page (e.g. from Ortodontia)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && authClinicId) {
        loadAppointments();
      }
    };
    const handleFocus = () => {
      if (authClinicId) loadAppointments();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [authClinicId]);

  // Compute pending finalizations: confirmed/scheduled appointments that are past or today
  const pendingFinalizations = useMemo(() => {
    return appointments.filter(apt => {
      const date = parseISO(apt.appointment_date);
      const isPastTime = isBefore(date, new Date());
      return isPastTime && (apt.status === "scheduled" || apt.status === "confirmed");
    });
  }, [appointments]);

  // Warn user before closing browser if there are pending finalizations
  useEffect(() => {
    if (pendingFinalizations.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingFinalizations.length]);

  const loadData = async () => {
    if (!authClinicId) return;
    try {
      setLoading(true);
      
      // Load patients filtered by clinic
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("clinic_id", authClinicId)
        .order("full_name");
      
      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      setClinicId(authClinicId);

      // Load clinic config
      const { data: configData } = await supabase
        .from("configuracoes_clinica")
        .select("horario_funcionamento")
        .eq("clinica_id", authClinicId)
        .maybeSingle();

      if (configData?.horario_funcionamento) {
        setClinicConfig(configData.horario_funcionamento as unknown as HorarioFuncionamento);
      }

      const { data: dentistsData, error: dentistsError } = await supabase
        .from("profissionais")
        .select("id, nome, cro, especialidade, cor")
        .eq("clinica_id", authClinicId)
        .eq("ativo", true)
        .order("nome");
      
      if (dentistsError) throw dentistsError;
      setDentists(dentistsData || []);

      // Load per-dentist agenda configs
      if (dentistsData?.length) {
        const { data: agendaConfigs } = await supabase
          .from("profissional_agenda_config")
          .select("*")
          .in("profissional_id", dentistsData.map(d => d.id));

        if (agendaConfigs?.length) {
          const configMap: Record<string, HorarioFuncionamento> = {};
          // Group by profissional_id
          const grouped: Record<string, typeof agendaConfigs> = {};
          agendaConfigs.forEach(c => {
            if (!grouped[c.profissional_id]) grouped[c.profissional_id] = [];
            grouped[c.profissional_id].push(c);
          });

          // Convert each dentist's config to HorarioFuncionamento format
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

      // Show info if no data
      if (!patientsData?.length) {
        toast.info("Cadastre pacientes no Prontuário antes de criar agendamentos");
      }
      if (!dentistsData?.length) {
        toast.info("Cadastre profissionais no CRM antes de criar agendamentos");
      }

      // Load appointments
      await loadAppointments();
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    if (!authClinicId) return;
    try {
      // Filter by visible month range (with buffer for week view)
      const rangeStart = format(startOfWeek(startOfMonth(currentMonth), { locale: ptBR }), "yyyy-MM-dd'T'00:00:00");
      const rangeEnd = format(endOfWeek(endOfMonth(currentMonth), { locale: ptBR }), "yyyy-MM-dd'T'23:59:59");

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          title,
          description,
          appointment_date,
          duration_minutes,
          status,
          patient_id,
          patient:patients!inner(id, full_name, clinic_id),
          dentist:profissionais(id, nome, cor)
        `)
        .eq("patient.clinic_id", authClinicId)
        .gte("appointment_date", rangeStart)
        .lte("appointment_date", rangeEnd)
        .order("appointment_date");
      
      if (error) throw error;
      setAppointments(data || []);
      
      // Calcular estatísticas de faltas por paciente
      const noShowCounts: Record<string, number> = {};
      data?.forEach(apt => {
        if (apt.status === 'cancelled' && apt.patient_id) {
          noShowCounts[apt.patient_id] = (noShowCounts[apt.patient_id] || 0) + 1;
        }
      });
      setPatientNoShowStats(noShowCounts);
    } catch (error: any) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error("Erro ao carregar agendamentos: " + error.message);
    }
  };

  const getFilteredAppointments = () => {
    let filtered = [...appointments];

    // Filtro por status
    if (filters.status !== "all") {
      filtered = filtered.filter(apt => apt.status === filters.status);
    }

    // Filtro por dentista - corrigido para usar apt.dentist?.id
    if (filters.dentistId !== "all") {
      filtered = filtered.filter(apt => apt.dentist?.id === filters.dentistId);
    }

    return filtered;
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      dentistId: "all",
    });
  };

  const getAppointmentsForDate = (date: Date) => {
    return getFilteredAppointments().filter(apt => 
      isSameDay(parseISO(apt.appointment_date), date)
    );
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const todayAppointments = getAppointmentsForDate(new Date());
  const weekStart = startOfWeek(new Date(), { locale: ptBR });
  const weekEnd = endOfWeek(new Date(), { locale: ptBR });
  const weekAppointments = getFilteredAppointments().filter(apt => {
    const aptDate = parseISO(apt.appointment_date);
    return aptDate >= weekStart && aptDate <= weekEnd;
  });

  const statusColors: Record<string, string> = {
    confirmed: "bg-sinal-ok-tenue text-sinal-ok",
    scheduled: "bg-acao-tenue text-acao",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-sinal-alerta-tenue text-sinal-alerta",
    no_show: "bg-sinal-alerta-tenue text-sinal-alerta",
  };

  const statusLabels: Record<string, string> = {
    confirmed: "Confirmado",
    scheduled: "Agendado",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Faltou",
  };

  // Handle appointment click to open details modal
  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  // Handle slot click - pre-fill form and open sheet
  const handleSlotClick = (date: Date, time: string) => {
    // Block scheduling in past dates/times
    if (isPastSlot(date, time)) {
      toast.error("Não é possível agendar em horários passados");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      date: format(date, "yyyy-MM-dd"),
      time: time,
    }));
    setIsSheetOpen(true);
  };

  // Handle day click from calendar - switch to slots view
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setViewMode("day-slots");
  };

  // Get appointment for a specific time slot (filtrado por dentista se selecionado)
  const getAppointmentForSlot = (time: string, dentistId?: string) => {
    const dayAppointments = getAppointmentsForDate(selectedDate);
    return dayAppointments.find(apt => {
      // Se há filtro de dentista, ignorar agendamentos de outros profissionais
      if (dentistId && apt.dentist?.id !== dentistId) {
        return false;
      }
      const aptTime = format(parseISO(apt.appointment_date), "HH:mm");
      return aptTime === time;
    });
  };

  // Check if slot is within an appointment duration (filtrado por dentista se selecionado)
  const isSlotOccupied = (time: string, dentistId?: string) => {
    const dayAppointments = getAppointmentsForDate(selectedDate);
    const [slotHour, slotMinute] = time.split(":").map(Number);
    const slotMinutes = slotHour * 60 + slotMinute;
    
    return dayAppointments.some(apt => {
      // Se há filtro de dentista, ignorar agendamentos de outros profissionais
      if (dentistId && apt.dentist?.id !== dentistId) {
        return false;
      }
      const aptDate = parseISO(apt.appointment_date);
      const aptStartMinutes = aptDate.getHours() * 60 + aptDate.getMinutes();
      const aptEndMinutes = aptStartMinutes + (apt.duration_minutes || 30);
      return slotMinutes >= aptStartMinutes && slotMinutes < aptEndMinutes;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate date/time before proceeding
    const appointmentDate = parseISO(formData.date);
    if (isPastSlot(appointmentDate, formData.time)) {
      toast.error("Não é possível criar agendamentos em datas/horários passados");
      return;
    }
    
    try {
      // Validate form data
      const validatedData = appointmentSchema.parse({
        patientId: formData.patientId,
        dentistId: formData.dentistId,
        title: formData.title,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
      });

      setSaving(true);

      // Combine date and time into timestamp
      const appointmentDateTime = new Date(`${validatedData.date}T${validatedData.time}`);

      // Save to database
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
      setIsSheetOpen(false);
      setFormData({
        patientId: "",
        dentistId: "",
        title: "",
        date: "",
        time: "",
        duration: "30",
      });

      // Reload appointments
      await loadAppointments();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Erro ao criar agendamento:", error);
        toast.error("Erro ao criar agendamento: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedDayAppointments = getAppointmentsForDate(selectedDate);

  const handlePatientCreated = async (patientId: string) => {
    // Recarregar lista de pacientes
    await loadData();
    // Selecionar automaticamente o novo paciente
    setFormData({ ...formData, patientId });
  };

  // Day Slots View Component
  const DayTimeSlotsView = () => {
    // Usar o dentista filtrado (se houver) para verificar disponibilidade
    const selectedDentistId = filters.dentistId !== "all" ? filters.dentistId : undefined;
    const availableSlots = TIME_SLOTS.filter(time => !isSlotOccupied(time, selectedDentistId)).length;
    const occupiedSlots = TIME_SLOTS.length - availableSlots;
    const occupancyRate = Math.round((occupiedSlots / TIME_SLOTS.length) * 100);
    
    // Detectar gaps de horários ociosos (mais de 2 slots consecutivos vazios = 1h+)
    const findIdleGaps = () => {
      const gaps: { start: string; end: string; slots: number }[] = [];
      let currentGap: { start: string; slots: number } | null = null;
      
      TIME_SLOTS.forEach((time, index) => {
        const isOccupied = isSlotOccupied(time, selectedDentistId);
        const isPast = isPastSlot(selectedDate, time);
        
        if (!isOccupied && !isPast) {
          if (!currentGap) {
            currentGap = { start: time, slots: 1 };
          } else {
            currentGap.slots++;
          }
        } else {
          if (currentGap && currentGap.slots >= 3) { // 1.5h+ de gap
            gaps.push({
              start: currentGap.start,
              end: TIME_SLOTS[index - 1] || time,
              slots: currentGap.slots
            });
          }
          currentGap = null;
        }
      });
      
      // Verificar último gap
      if (currentGap && currentGap.slots >= 3) {
        gaps.push({
          start: currentGap.start,
          end: TIME_SLOTS[TIME_SLOTS.length - 1],
          slots: currentGap.slots
        });
      }
      
      return gaps;
    };
    
    const idleGaps = findIdleGaps();
    
    return (
      <Card>
        <CardHeader className="pb-3 space-y-3">
          {/* Taxa de Ocupação */}
          {filters.status !== "all" && (
            <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-2 rounded-lg">
              <Filter className="h-4 w-4" />
              <span>Filtro ativo: <strong>{statusLabels[filters.status as keyof typeof statusLabels] || filters.status}</strong> — mostrando apenas agendamentos com este status</span>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxa de ocupação do dia</span>
              <span className={cn(
                "font-semibold",
                occupancyRate >= 70 ? "text-sinal-ok" : 
                occupancyRate >= 40 ? "text-yellow-500" : "text-destructive"
              )}>
                {occupancyRate}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-[width] duration-500 rounded-full",
                  occupancyRate >= 70 ? "bg-sinal-ok" : 
                  occupancyRate >= 40 ? "bg-yellow-500" : "bg-destructive"
                )}
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>
          
          {/* Alerta de Horários Ociosos */}
          {idleGaps.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-600">
                    {idleGaps.length} período{idleGaps.length !== 1 && "s"} ocioso{idleGaps.length !== 1 && "s"} detectado{idleGaps.length !== 1 && "s"}
                  </p>
                  <p className="text-muted-foreground">
                    {idleGaps.map((gap, i) => (
                      <span key={i}>
                        {gap.start}-{gap.end} ({gap.slots * 30}min)
                        {i < idleGaps.length - 1 && ", "}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Legenda de Slots */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-sm border border-dashed border-bone-400" />
                <span className="text-muted-foreground">{availableSlots} disponíveis</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded bg-muted border" />
                <span className="text-muted-foreground">{occupiedSlots} ocupados</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {selectedDayAppointments.length} agendamento{selectedDayAppointments.length !== 1 && "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {TIME_SLOTS.map((time) => {
              const appointment = getAppointmentForSlot(time, selectedDentistId);
              const occupied = isSlotOccupied(time, selectedDentistId);
              const slotPassed = isPastSlot(selectedDate, time);
              
              // When a status filter is active, hide slots without a matching appointment
              if (filters.status !== "all" && !appointment) {
                return null;
              }
              
              if (appointment) {
                // Slot with appointment - usar cor do profissional
                const dentistColor = appointment.dentist?.cor || '#3b82f6';
                const patientNoShows = patientNoShowStats[appointment.patient_id] || 0;
                
                return (
                  <div
                    key={time}
                    className="flex items-center gap-4 p-4 rounded-md border border-l-4 bg-card transition-colors duration-150 hover:bg-muted/40 cursor-pointer"
                    style={{ borderLeftColor: dentistColor }}
                    onClick={() => handleAppointmentClick(appointment)}
                  >
                    <div className="flex items-center justify-center w-16 shrink-0">
                      <span className="text-lg font-bold" style={{ color: dentistColor }}>{time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: dentistColor }}
                        />
                        <p 
                          className="font-semibold text-primary hover:underline cursor-pointer truncate"
                          title="Abrir prontuário"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/prontuario/${appointment.patient_id}`);
                          }}
                        >
                          {appointment.patient?.full_name}
                        </p>
                        <Badge className={statusColors[appointment.status as keyof typeof statusColors]}>
                          {statusLabels[appointment.status as keyof typeof statusLabels]}
                        </Badge>
                        {/* Indicador de histórico de faltas */}
                        {patientNoShows >= 2 && (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-destructive/10 text-destructive"
                            title={`Este paciente tem ${patientNoShows} falta(s) registrada(s)`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {patientNoShows} falta{patientNoShows !== 1 && "s"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.title} • {appointment.dentist?.nome} • {appointment.duration_minutes} min
                      </p>
                    </div>
                  </div>
                );
              }
              
              if (occupied) {
                // Slot is within another appointment's duration - show as disabled
                return (
                  <div
                    key={time}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 opacity-50"
                  >
                    <div className="flex items-center justify-center w-16 shrink-0">
                      <span className="text-sm font-medium text-muted-foreground">{time}</span>
                    </div>
                    <span className="text-sm text-muted-foreground italic">Em consulta</span>
                  </div>
                );
              }
              
              // Past slot - show as unavailable
              if (slotPassed) {
                return (
                  <div
                    key={time}
                    className="flex items-center gap-4 px-4 py-2"
                  >
                    <div className="w-16 shrink-0">
                      <span className="text-sm tabular-nums text-muted-foreground/60">{time}</span>
                    </div>
                    <span className="text-[13px] text-muted-foreground/60">Passado</span>
                  </div>
                );
              }
              
              // Available slot - clickable
              return (
                <button
                  key={time}
                  onClick={() => handleSlotClick(selectedDate, time)}
                  className={cn(
                    "group w-full flex items-center gap-4 rounded-md border border-dashed border-border px-4 py-3 cursor-pointer",
                    "transition-colors duration-150 hover:border-primary/40 hover:bg-acao-tenue"
                  )}
                >
                  <div className="w-16 shrink-0 text-left">
                    <span className="text-[15px] font-medium tabular-nums text-foreground">{time}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground">
                      Horário livre
                    </span>
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      — Clique para agendar
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Week View Slots Component (Estilo Clinicorp)
  const WeekViewSlots = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const selectedDentistId = filters.dentistId !== "all" ? filters.dentistId : undefined;
    
    // Get active days from active config (per-dentist or clinic-wide)
    const activeDayKeys = (Object.entries(activeConfig.dias) as [keyof HorarioFuncionamento["dias"], DiaConfig][])
      .filter(([_, cfg]) => cfg.ativo)
      .map(([key]) => key);
    
    // Map day keys to their corresponding offsets from Monday (weekStart)
    const dayOffsets: Record<keyof HorarioFuncionamento["dias"], number> = {
      segunda: 0, terca: 1, quarta: 2, quinta: 3, sexta: 4, sabado: 5, domingo: 6
    };
    
    // Get all unique time slots for active days
    const weekTimeSlots = getAllTimeSlotsForDays(activeDayKeys, activeConfig);
    
    // Helper para obter agendamento para data e horário específicos
    const getAppointmentForDateTime = (date: Date, time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      
      return appointments.find(apt => {
        const aptDate = new Date(apt.appointment_date);
        const matchesTime = aptDate.getHours() === hours && aptDate.getMinutes() === minutes;
        const matchesDate = isSameDay(aptDate, date);
        const matchesDentist = !selectedDentistId || apt.dentist_id === selectedDentistId;
        return matchesTime && matchesDate && matchesDentist;
      });
    };
    
    // Check if time slot is valid for a specific day
    const isSlotValidForDay = (dayKey: keyof HorarioFuncionamento["dias"], time: string): boolean => {
      const daySlots = generateDynamicTimeSlots(dayKey, activeConfig);
      return daySlots.includes(time);
    };
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${100 + activeDayKeys.length * 140}px` }}>
              {/* Header com dias da semana */}
              <div 
                className="grid gap-1 mb-2 sticky top-0 bg-card z-10"
                style={{ gridTemplateColumns: `80px repeat(${activeDayKeys.length}, 1fr)` }}
              >
                <div className="text-center text-sm font-medium text-muted-foreground py-3 border-b">
                  Horário
                </div>
                {activeDayKeys.map((dayKey) => {
                  const date = addDays(weekStart, dayOffsets[dayKey]);
                  const isTodayDate = isSameDay(date, new Date());
                  return (
                    <div 
                      key={dayKey} 
                      className={cn(
                        "text-center py-2 rounded-t border-b",
                        isTodayDate && "bg-primary/10"
                      )}
                    >
                      <div className="text-sm font-semibold">{DAY_LABELS[dayKey]}</div>
                      <div className={cn(
                        "text-sm",
                        isTodayDate ? "text-primary font-bold" : "text-muted-foreground"
                      )}>
                        {format(date, "dd/MM")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid de horários */}
              <div className="space-y-1">
                {weekTimeSlots.map((time) => (
                  <div 
                    key={time} 
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `80px repeat(${activeDayKeys.length}, 1fr)` }}
                  >
                    {/* Coluna de horário à esquerda */}
                    <div className="flex items-center justify-center text-sm font-medium text-muted-foreground bg-muted/30 rounded py-3">
                      {time}
                    </div>
                    
                    {/* Slots para cada dia */}
                    {activeDayKeys.map((dayKey) => {
                      const targetDate = addDays(weekStart, dayOffsets[dayKey]);
                      const apt = getAppointmentForDateTime(targetDate, time);
                      const slotPassed = isPastSlot(targetDate, time);
                      
                      // When status filter active, only show slots with matching appointments
                      if (filters.status !== "all" && !apt) {
                        return (
                          <div key={dayKey} className="min-h-[48px]" />
                        );
                      }
                      if (filters.status !== "all" && apt && apt.status !== filters.status) {
                        return (
                          <div key={dayKey} className="min-h-[48px]" />
                        );
                      }
                      const dentistColor = apt?.dentist?.cor || '#3b82f6';
                      const patientNoShows = apt?.patient_id ? (patientNoShowStats[apt.patient_id] || 0) : 0;
                      const isValidSlot = isSlotValidForDay(dayKey, time);
                      const isLunch = isLunchBreak(time, activeConfig.dias[dayKey]);
                      
                      // Slot não disponível para este dia (horário de almoço ou fora do expediente)
                      if (!isValidSlot || isLunch) {
                        return (
                          <div
                            key={dayKey}
                            className="min-h-[48px] rounded border bg-muted/20 border-muted/30 flex items-center justify-center"
                          >
                            {isLunch && (
                              <span className="text-[10px] text-muted-foreground">Almoço</span>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <div
                          key={dayKey}
                          onClick={() => apt ? handleAppointmentClick(apt) : (!slotPassed && handleSlotClick(targetDate, time))}
                          className={cn(
                            "min-h-[48px] rounded border transition-colors duration-150 p-1.5 relative",
                            apt 
                              ? "cursor-pointer hover:brightness-[0.98]" 
                              : slotPassed
                                ? "bg-muted/30 border-transparent cursor-not-allowed"
                                : "bg-card border-border hover:border-primary/40 hover:bg-acao-tenue cursor-pointer group"
                          )}
                          style={apt ? { 
                            borderLeftColor: dentistColor, 
                            borderLeftWidth: '3px',
                            backgroundColor: `${dentistColor}15`
                          } : {}}
                        >
                          {apt ? (
                            <div className="h-full flex flex-col justify-center">
                              <div className="flex items-center gap-1">
                              <div 
                                className="text-xs font-semibold truncate text-primary hover:underline cursor-pointer" 
                                title="Abrir prontuário"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/dashboard/prontuario/${apt.patient_id}`);
                                }}
                              >
                                  {apt.patient?.full_name?.split(' ').slice(0, 2).join(' ')}
                                </div>
                                {patientNoShows >= 2 && (
                                  <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {apt.title}
                              </div>
                            </div>
                          ) : !slotPassed && (
                            <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-4 w-4 text-sinal-ok" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Legenda */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm border border-dashed border-bone-400"></div>
              <span className="text-muted-foreground">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted/40"></div>
              <span className="text-muted-foreground">Almoço/Fechado</span>
            </div>
            {dentists.slice(0, 3).map(dentist => (
              <div key={dentist.id} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: dentist.cor || '#3b82f6' }}
                />
                <span className="text-muted-foreground">{dentist.nome}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Banner de pendências de finalização */}
      {pendingFinalizations.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {pendingFinalizations.length} atendimento{pendingFinalizations.length > 1 ? "s" : ""} pendente{pendingFinalizations.length > 1 ? "s" : ""} de finalização
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Clique nos agendamentos abaixo para registrar as observações e finalizar.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {pendingFinalizations.slice(0, 5).map(apt => (
                <Button
                  key={apt.id}
                  variant="outline"
                  size="sm"
                  className="border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  onClick={() => {
                    setSelectedAppointment(apt);
                    setIsDetailsModalOpen(true);
                  }}
                >
                  {apt.patient?.full_name} — {format(parseISO(apt.appointment_date), "HH:mm")}
                </Button>
              ))}
              {pendingFinalizations.length > 5 && (
                <span className="text-xs text-amber-600 self-center">+{pendingFinalizations.length - 5} mais</span>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header Estilo Clinicorp */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        {/* Linha 1: Data atual + Navegação + Ações */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Data e Navegação */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => {
                if (viewMode === "day-slots") {
                  setSelectedDate(addDays(selectedDate, -1));
                } else if (viewMode === "week") {
                  setSelectedDate(addDays(selectedDate, -7));
                } else {
                  setCurrentMonth(subMonths(currentMonth, 1));
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center min-w-[200px]">
              <h2 className="text-lg font-semibold first-letter:uppercase">
                {viewMode === "day-slots" 
                  ? format(selectedDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR })
                  : viewMode === "week"
                    ? `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM")} - ${format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 4), "dd/MM/yyyy")}`
                    : format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })
                }
              </h2>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => {
                if (viewMode === "day-slots") {
                  setSelectedDate(addDays(selectedDate, 1));
                } else if (viewMode === "week") {
                  setSelectedDate(addDays(selectedDate, 7));
                } else {
                  setCurrentMonth(addMonths(currentMonth, 1));
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => {
                setSelectedDate(new Date());
                setCurrentMonth(new Date());
              }}
            >
              Hoje
            </Button>
          </div>
          
          {/* Ações Rápidas */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => loadAppointments()}
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => window.print()}
              title="Imprimir"
            >
              <Printer className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-px bg-border mx-1" />
            
            {/* Alternância de Visão */}
            <div className="flex items-center border rounded-lg p-1 bg-muted/30">
              <Button 
                variant={viewMode === "calendar" ? "secondary" : "ghost"} 
                size="sm"
                className="h-7 px-3"
                onClick={() => setViewMode("calendar")}
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Mês
              </Button>
              <Button 
                variant={viewMode === "week" ? "secondary" : "ghost"} 
                size="sm"
                className="h-7 px-3"
                onClick={() => setViewMode("week")}
              >
                <CalendarIcon className="h-4 w-4 mr-1.5" />
                Semana
              </Button>
              <Button 
                variant={viewMode === "day-slots" ? "secondary" : "ghost"} 
                size="sm"
                className="h-7 px-3"
                onClick={() => setViewMode("day-slots")}
              >
                <List className="h-4 w-4 mr-1.5" />
                Dia
              </Button>
            </div>
          </div>
        </div>
        
        {/* Linha 2: Filtros + Novo Agendamento */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t">
          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro por Profissional */}
            <Select 
              value={filters.dentistId} 
              onValueChange={(value) => setFilters({ ...filters, dentistId: value })}
            >
              <SelectTrigger className="w-[200px] h-9">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Todos Profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Profissionais</SelectItem>
                {dentists.map(dentist => (
                  <SelectItem key={dentist.id} value={dentist.id}>
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: dentist.cor || '#3b82f6' }}
                      />
                      {dentist.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filtro por Status */}
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="no_show">Faltou</SelectItem>
              </SelectContent>
            </Select>
            
            {(filters.status !== "all" || filters.dentistId !== "all") && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 text-muted-foreground"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          
          {/* Legenda de Profissionais */}
          {dentists.length > 0 && filters.dentistId === "all" && (
            <div className="hidden md:flex items-center gap-3 flex-wrap">
              {dentists.slice(0, 5).map(dentist => (
                <button
                  key={dentist.id}
                  onClick={() => setFilters({ ...filters, dentistId: dentist.id })}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: dentist.cor || '#3b82f6' }}
                  />
                  {dentist.nome}
                </button>
              ))}
              {dentists.length > 5 && (
                <span className="text-xs text-muted-foreground">+{dentists.length - 5}</span>
              )}
            </div>
          )}
          
          {/* Sheet para Novo Agendamento (acionado ao clicar em slot vazio) */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-[500px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Novo Agendamento</SheetTitle>
                <SheetDescription>
                  {formData.date && formData.time 
                    ? `Agendando para ${format(parseISO(formData.date), "dd/MM/yyyy", { locale: ptBR })} às ${formData.time}`
                    : "Preencha os dados para criar um novo agendamento"
                  }
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="patient">Paciente *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsNewPatientModalOpen(true)}
                      className="h-7 text-xs"
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Novo Paciente
                    </Button>
                  </div>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                      onClick={() => setOpenPatientCombobox(!openPatientCombobox)}
                    >
                      {formData.patientId
                        ? patients.find((p) => p.id === formData.patientId)?.full_name
                        : "Pesquisar paciente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    
                    {openPatientCombobox && (
                      <div className="absolute top-full left-0 mt-1 w-full min-w-[400px] border rounded-lg bg-popover shadow-lg z-[9999] max-h-[350px] overflow-hidden">
                        <div className="flex items-center border-b px-3 bg-popover">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <input
                            placeholder="Digite o nome do paciente..."
                            value={buscaPaciente}
                            onChange={(e) => setBuscaPaciente(e.target.value)}
                            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-[300px] overflow-auto p-1 bg-popover">
                          {pacientesFiltrados.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Nenhum paciente encontrado.
                            </div>
                          ) : (
                            pacientesFiltrados.map((patient) => (
                              <div
                                key={patient.id}
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, patientId: patient.id }));
                                  setOpenPatientCombobox(false);
                                  setBuscaPaciente("");
                                }}
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.patientId === patient.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {patient.full_name}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dentist">Dentista *</Label>
                  <Select value={formData.dentistId} onValueChange={(value) => {
                    const dentistConfig = dentistConfigs[value];
                    const defaultDuration = dentistConfig?.intervalo_padrao || 30;
                    setFormData({
                      ...formData,
                      dentistId: value,
                      duration: String(defaultDuration),
                      time: "",
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dentista" />
                    </SelectTrigger>
                    <SelectContent>
                      {dentists.map((dentist) => (
                        <SelectItem key={dentist.id} value={dentist.id}>
                          {dentist.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Consulta *</Label>
                  <Select value={formData.title} onValueChange={(value) => setFormData({ ...formData, title: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value, time: "" })}
                      className=""
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Horário *</Label>
                    {(() => {
                      // Calculate available slots for the form
                      const formDentistConfig = formData.dentistId ? dentistConfigs[formData.dentistId] : null;
                      const formConfig = formDentistConfig || clinicConfig;
                      const formDate = formData.date ? new Date(`${formData.date}T12:00:00`) : null;
                      const formDayKey = formDate ? DAY_KEYS[formDate.getDay()] : null;
                      const durationMin = parseInt(formData.duration) || 30;
                      const interval = formConfig.intervalo_padrao || 30;

                      let availableSlots: string[] = [];
                      if (formDayKey) {
                        const allSlots = generateDynamicTimeSlots(formDayKey, formConfig);
                        const now = new Date();
                        const isFormToday = formData.date === format(now, "yyyy-MM-dd");

                        // Get appointments for this dentist on this date
                        const dayAppts = formData.date ? appointments.filter(apt => {
                          if (formData.dentistId && apt.dentist?.id !== formData.dentistId) return false;
                          return apt.appointment_date.startsWith(formData.date) && apt.status !== "cancelled";
                        }) : [];

                        // Build occupied minutes set
                        const occupiedMinutes = new Set<number>();
                        dayAppts.forEach(apt => {
                          const aptDate = parseISO(apt.appointment_date);
                          const startMin = aptDate.getHours() * 60 + aptDate.getMinutes();
                          const dur = apt.duration_minutes || interval;
                          for (let m = startMin; m < startMin + dur; m++) {
                            occupiedMinutes.add(m);
                          }
                        });

                        availableSlots = allSlots.filter(slot => {
                          const [h, m] = slot.split(":").map(Number);
                          const slotMin = h * 60 + m;

                          // Filter past slots
                          if (isFormToday && slotMin <= now.getHours() * 60 + now.getMinutes()) return false;

                          // Check if all minutes needed for this duration are free
                          for (let offset = 0; offset < durationMin; offset++) {
                            if (occupiedMinutes.has(slotMin + offset)) return false;
                          }

                          return true;
                        });
                      }

                      return (
                        <Select
                          value={formData.time}
                          onValueChange={(value) => setFormData({ ...formData, time: value })}
                          disabled={!formData.date || !formData.dentistId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={!formData.dentistId ? "Selecione dentista" : !formData.date ? "Selecione data" : "Selecione horário"} />
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
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Duração *</Label>
                  <div className="flex flex-wrap gap-2">
                    {[15, 30, 45, 60].map((val) => (
                      <Button
                        key={val}
                        type="button"
                        size="sm"
                        variant={formData.duration === String(val) ? "default" : "outline"}
                        onClick={() => setFormData({ ...formData, duration: String(val), time: "" })}
                      >
                        {val}min
                      </Button>
                    ))}
                    <div className="w-px bg-border mx-1" />
                    {[15, 30, 60].map((inc) => (
                      <Button
                        key={`inc-${inc}`}
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const current = parseInt(formData.duration) || 30;
                          setFormData({ ...formData, duration: String(current + inc), time: "" });
                        }}
                      >
                        +{inc}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Total: {formData.duration} minutos
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsSheetOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? "Salvando..." : "Criar Agendamento"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Conditional rendering based on view mode */}
      {viewMode === "day-slots" ? (
        <DayTimeSlotsView />
      ) : viewMode === "week" ? (
        <WeekViewSlots />
      ) : (
        <div className="grid lg:grid-cols-[1fr_350px] gap-4">
          {/* Calendário Visual */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Clique em um dia para ver os horários disponíveis</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Carregando calendário...
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Cabeçalho dos dias da semana */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Grid de dias do mês */}
                  <div className="grid grid-cols-7 gap-2">
                    {getCalendarDays().map((day, idx) => {
                      const dayAppointments = getAppointmentsForDate(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isSelected = isSameDay(day, selectedDate);
                      const isTodayDate = isToday(day);
                      // Calculate available slots for this day
                      const occupiedCount = dayAppointments.length;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleDayClick(day)}
                          className={cn(
                            "relative min-h-[80px] p-2 rounded-md border transition-colors duration-150",
                            "flex flex-col items-start justify-start",
                            "hover:border-primary/50",
                            isCurrentMonth ? "bg-card" : "bg-muted/30",
                            isSelected && "border-primary bg-acao-tenue",
                            !isSelected && "border-border",
                            isTodayDate && "ring-2 ring-primary/20"
                          )}
                        >
                          <span className={cn(
                            "text-sm font-medium mb-1",
                            !isCurrentMonth && "text-muted-foreground",
                            isSelected && "text-primary font-bold",
                            isTodayDate && !isSelected && "text-primary"
                          )}>
                            {format(day, "d")}
                          </span>
                          
                          {dayAppointments.length > 0 && (
                            <div className="space-y-1 w-full">
                              {dayAppointments.slice(0, 2).map((apt) => (
                                <div
                                  key={apt.id}
                                  className={cn(
                                    "text-xs px-1.5 py-0.5 rounded truncate",
                                    apt.status === "confirmed" && "bg-secondary/80 text-secondary-foreground",
                                    apt.status === "scheduled" && "bg-primary/20 text-primary",
                                    apt.status === "completed" && "bg-muted text-muted-foreground",
                                    apt.status === "cancelled" && "bg-destructive/20 text-destructive"
                                  )}
                                >
                                  {format(parseISO(apt.appointment_date), "HH:mm")} {apt.patient?.full_name?.split(' ').slice(0, 2).join(' ')}
                                </div>
                              ))}
                              {dayAppointments.length > 2 && (
                                <div className="text-xs text-muted-foreground px-1.5">
                                  +{dayAppointments.length - 2} mais
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Badge showing slots info */}
                          {isCurrentMonth && occupiedCount === 0 && (
                            <div className="absolute bottom-1 right-1">
                              <span className="text-[10px] text-muted-foreground">Livre</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Painel lateral com detalhes do dia selecionado */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl first-letter:uppercase">
                      {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </CardTitle>
                    <CardDescription className="first-letter:uppercase">
                      {format(selectedDate, "EEEE", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {selectedDayAppointments.length} consulta{selectedDayAppointments.length !== 1 && "s"}
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => setViewMode("day-slots")}
                    >
                      Ver Horários
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                    <p className="text-muted-foreground mb-4">Nenhum agendamento neste dia</p>
                    <Button 
                      onClick={() => setViewMode("day-slots")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agendar Consulta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {selectedDayAppointments
                      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                      .map((apt) => {
                        const aptTime = format(parseISO(apt.appointment_date), "HH:mm");
                        
                          return (
                          <div
                            key={apt.id}
                            className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow space-y-2 cursor-pointer"
                            onClick={() => handleAppointmentClick(apt)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-semibold">{aptTime}</span>
                              </div>
                              <Badge className={statusColors[apt.status as keyof typeof statusColors]}>
                                {statusLabels[apt.status as keyof typeof statusLabels]}
                              </Badge>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{apt.patient?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {apt.title} • {apt.dentist?.nome}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Duração: {apt.duration_minutes} min
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    
                    {/* Button to see all slots */}
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => setViewMode("day-slots")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ver Todos os Horários
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <CadastroRapidoPacienteModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
        onPatientCreated={handlePatientCreated}
      />

      <DetalhesAgendamentoModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        appointment={selectedAppointment}
        dentists={dentists}
        onUpdate={loadAppointments}
      />
    </div>
  );
};

export default Agenda;
