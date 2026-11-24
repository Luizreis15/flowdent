import { addDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { CORES_GRAFICO } from "@/lib/coresGrafico";
import type { ReportFilters } from "./RelatorioFilters";

/**
 * Status gravados em appointments.status (os mesmos de src/lib/statusConsulta.ts).
 * Os relatórios usavam "realizado", "cancelado" e "faltou", que não existem no banco,
 * e por isso comparecimento, faltas e pacientes ativos sempre davam zero.
 */
export const STATUS = {
  realizado: "completed",
  cancelado: "cancelled",
  faltou: "no_show",
} as const;

/**
 * Intervalo do filtro para appointment_date (timestamptz): início do primeiro dia até o
 * início do dia seguinte ao último, exclusivo. Comparar com "yyyy-MM-dd" via lte cortava
 * todas as consultas do último dia.
 */
export const intervaloDoFiltro = (filtros: Pick<ReportFilters, "startDate" | "endDate">) => ({
  inicio: startOfDay(filtros.startDate).toISOString(),
  fim: startOfDay(addDays(filtros.endDate, 1)).toISOString(),
});

/** Data vinda do banco (qualquer formato ISO) dentro de um intervalo de intervaloDoFiltro */
export const dentroDoIntervalo = (data: string, intervalo: { inicio: string; fim: string }) => {
  const t = new Date(data).getTime();
  return t >= new Date(intervalo.inicio).getTime() && t < new Date(intervalo.fim).getTime();
};

/** Dentistas da clínica que passam nos filtros de dentista e especialidade */
export const dentistasFiltrados = async (clinicId: string, filtros: ReportFilters) => {
  const { data: profs } = await supabase.from("profissionais").select("id, especialidade").eq("clinica_id", clinicId);
  return (profs || [])
    .filter((p) => !filtros.dentistId || p.id === filtros.dentistId)
    .filter((p) => !filtros.especialidade || p.especialidade === filtros.especialidade)
    .map((p) => p.id);
};

export const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

/** Props dos eixos e da grade, iguais aos gráficos do Financeiro */
export const EIXO = { stroke: CORES_GRAFICO.eixo, tickLine: false, fontSize: 12 } as const;
export const GRADE = { strokeDasharray: "3 3", stroke: CORES_GRAFICO.grade, vertical: false } as const;
export const DICA = {
  cursor: { fill: "hsl(var(--muted))" },
  contentStyle: {
    borderRadius: 6,
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    fontSize: 13,
    boxShadow: "none",
  },
} as const;
