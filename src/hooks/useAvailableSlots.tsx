import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DAY_KEYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;

interface SlotConfig {
  inicio: string;
  fim: string;
  almoco_inicio?: string | null;
  almoco_fim?: string | null;
  intervalo: number;
  ativo: boolean;
}

function generateSlots(config: SlotConfig): string[] {
  if (!config.ativo) return [];
  const slots: string[] = [];
  const [inicioH, inicioM] = config.inicio.split(":").map(Number);
  const [fimH, fimM] = config.fim.split(":").map(Number);
  let current = inicioH * 60 + inicioM;
  const end = fimH * 60 + fimM;

  while (current < end) {
    const hour = Math.floor(current / 60);
    const min = current % 60;

    if (config.almoco_inicio && config.almoco_fim) {
      const [aIH, aIM] = config.almoco_inicio.split(":").map(Number);
      const [aFH, aFM] = config.almoco_fim.split(":").map(Number);
      if (current >= aIH * 60 + aIM && current < aFH * 60 + aFM) {
        current += config.intervalo;
        continue;
      }
    }

    slots.push(`${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    current += config.intervalo;
  }
  return slots;
}

export function useAvailableSlots(
  professionalId: string | undefined,
  dateStr: string | undefined,
  clinicId: string | undefined
) {
  const dayOfWeek = useMemo(() => {
    if (!dateStr) return undefined;
    return new Date(`${dateStr}T12:00:00`).getDay();
  }, [dateStr]);

  // Fetch professional agenda config for that day
  const { data: profConfig } = useQuery({
    queryKey: ["prof-agenda-config", professionalId, dayOfWeek],
    enabled: !!professionalId && dayOfWeek !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissional_agenda_config")
        .select("*")
        .eq("profissional_id", professionalId!)
        .eq("dia_semana", dayOfWeek!)
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fallback: clinic config
  const { data: clinicConfig } = useQuery({
    queryKey: ["clinic-config-horario", clinicId],
    enabled: !!clinicId && !profConfig && dayOfWeek !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_clinica")
        .select("horario_funcionamento")
        .eq("clinica_id", clinicId!)
        .maybeSingle();
      if (error) throw error;
      return data?.horario_funcionamento as any;
    },
  });

  // Fetch existing appointments for that professional on that date
  const { data: existingAppointments } = useQuery({
    queryKey: ["existing-appointments", professionalId, dateStr],
    enabled: !!professionalId && !!dateStr,
    queryFn: async () => {
      const startOfDay = `${dateStr}T00:00:00`;
      const endOfDay = `${dateStr}T23:59:59`;
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_date, duration_minutes")
        .eq("dentist_id", professionalId!)
        .gte("appointment_date", startOfDay)
        .lte("appointment_date", endOfDay)
        .neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
  });

  const availableSlots = useMemo(() => {
    if (!dateStr || dayOfWeek === undefined) return [];

    let slotConfig: SlotConfig | null = null;

    if (profConfig) {
      slotConfig = {
        inicio: profConfig.hora_inicio,
        fim: profConfig.hora_fim,
        almoco_inicio: profConfig.almoco_inicio,
        almoco_fim: profConfig.almoco_fim,
        intervalo: profConfig.duracao_consulta_minutos || 30,
        ativo: true,
      };
    } else if (clinicConfig) {
      const dayKey = DAY_KEYS[dayOfWeek];
      const diaConfig = clinicConfig?.dias?.[dayKey];
      if (!diaConfig?.ativo) return [];
      slotConfig = {
        inicio: diaConfig.inicio,
        fim: diaConfig.fim,
        almoco_inicio: diaConfig.almoco_inicio,
        almoco_fim: diaConfig.almoco_fim,
        intervalo: clinicConfig.intervalo_padrao || 30,
        ativo: true,
      };
    }

    if (!slotConfig) return [];

    const allSlots = generateSlots(slotConfig);

    // Build set of occupied slot start times
    const occupiedMinutes = new Set<number>();
    existingAppointments?.forEach((apt) => {
      const aptDate = new Date(apt.appointment_date);
      const startMin = aptDate.getHours() * 60 + aptDate.getMinutes();
      const duration = apt.duration_minutes || slotConfig!.intervalo;
      for (let m = startMin; m < startMin + duration; m += slotConfig!.intervalo) {
        occupiedMinutes.add(m);
      }
    });

    // Filter out occupied and past slots
    const now = new Date();
    const isToday = dateStr === now.toISOString().split("T")[0];

    return allSlots.filter((slot) => {
      const [h, m] = slot.split(":").map(Number);
      const slotMin = h * 60 + m;

      if (occupiedMinutes.has(slotMin)) return false;
      if (isToday && slotMin <= now.getHours() * 60 + now.getMinutes()) return false;

      return true;
    });
  }, [profConfig, clinicConfig, existingAppointments, dateStr, dayOfWeek]);

  const isLoading = !dateStr || !professionalId ? false : (!profConfig && !clinicConfig);

  return { availableSlots, isLoading };
}
