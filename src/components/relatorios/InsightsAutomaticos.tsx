import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format } from "date-fns";
import type { ReportFilters } from "./RelatorioFilters";
import { STATUS, intervaloDoFiltro } from "./dados";

interface Props {
  clinicId: string;
  filters: ReportFilters;
}

const InsightsAutomaticos = ({ clinicId, filters }: Props) => {
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const generate = async () => {
      const atual = intervaloDoFiltro(filters);
      const anterior = intervaloDoFiltro({
        startDate: subMonths(filters.startDate, 1),
        endDate: subMonths(filters.endDate, 1),
      });

      const { data: profs } = await supabase.from("profissionais").select("id").eq("clinica_id", clinicId);
      const profIds = profs?.map((p) => p.id) || [];
      if (!profIds.length) {
        setInsights([]);
        return;
      }

      const { data: currentAppts } = await supabase
        .from("appointments")
        .select("status")
        .in("dentist_id", profIds)
        .gte("appointment_date", atual.inicio)
        .lt("appointment_date", atual.fim);

      const { data: prevAppts } = await supabase
        .from("appointments")
        .select("status")
        .in("dentist_id", profIds)
        .gte("appointment_date", anterior.inicio)
        .lt("appointment_date", anterior.fim);

      // Pacientes sem consulta nos últimos 12 meses
      const twelveMonthsAgo = format(subMonths(new Date(), 12), "yyyy-MM-dd");
      const { data: allPatients } = await supabase.from("patients").select("id").eq("clinic_id", clinicId);
      const { data: recentAppts } = await supabase
        .from("appointments")
        .select("patient_id")
        .in("dentist_id", profIds)
        .gte("appointment_date", twelveMonthsAgo);

      const recentPatientIds = new Set(recentAppts?.map((a) => a.patient_id) || []);
      const noReturnCount = (allPatients || []).filter((p) => !recentPatientIds.has(p.id)).length;

      const msgs: string[] = [];
      const curr = currentAppts || [];
      const prev = prevAppts || [];
      const currTotal = curr.length;
      const prevTotal = prev.length;

      if (currTotal > 0 && prevTotal > 0) {
        const currRate = (curr.filter((a) => a.status === STATUS.cancelado).length / currTotal) * 100;
        const prevRate = (prev.filter((a) => a.status === STATUS.cancelado).length / prevTotal) * 100;
        const diff = Math.round(currRate - prevRate);
        if (Math.abs(diff) > 2) {
          msgs.push(
            `A taxa de cancelamento ${diff > 0 ? "subiu" : "caiu"} ${Math.abs(diff)} pontos em relação ao mês anterior`,
          );
        }
      }

      const currFaltas = curr.filter((a) => a.status === STATUS.faltou).length;
      if (currTotal > 0 && currFaltas > 0) {
        msgs.push(
          `${Math.round((currFaltas / currTotal) * 100)}% das consultas do período terminaram em falta (${currFaltas} de ${currTotal})`,
        );
      }

      if (noReturnCount > 0) {
        msgs.push(
          `${noReturnCount} ${noReturnCount === 1 ? "paciente está" : "pacientes estão"} há mais de 1 ano sem consulta`,
        );
      }

      if (currTotal > 0 && prevTotal > 0) {
        const volumeDiff = Math.round(((currTotal - prevTotal) / prevTotal) * 100);
        if (Math.abs(volumeDiff) > 5) {
          msgs.push(
            `O volume de consultas ${volumeDiff > 0 ? "cresceu" : "caiu"} ${Math.abs(volumeDiff)}% em relação ao mês anterior`,
          );
        }
      }

      if (msgs.length === 0) msgs.push("Nenhuma variação relevante no período selecionado");
      setInsights(msgs);
    };

    generate();
  }, [clinicId, filters]);

  if (!insights.length) return null;

  return (
    <section className="rounded-lg border bg-card px-5 py-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">Destaques do período</h2>
      <ul className="mt-2 space-y-1.5">
        {insights.map((msg) => (
          <li key={msg} className="flex items-start gap-2.5 text-sm text-foreground">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-tinta-700" aria-hidden />
            {msg}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default InsightsAutomaticos;
