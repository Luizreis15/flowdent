import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ReportFilters } from "./RelatorioFilters";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { CORES_GRAFICO } from "@/lib/coresGrafico";
import { CartaoGrafico } from "./comum";
import { DICA, EIXO, GRADE, STATUS, dentistasFiltrados, dentroDoIntervalo, intervaloDoFiltro, pct } from "./dados";

interface Props { clinicId: string; filters: ReportFilters; }

const VisaoGeralTab = ({ clinicId, filters }: Props) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ totalPatients: 0, activePatients: 0, newPatients: 0, totalAppts: 0, attendanceRate: 0, cancelRate: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; realizadas: number; faltas: number }[]>([]);
  const [newPatientsData, setNewPatientsData] = useState<{ month: string; novos: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { inicio, fim } = intervaloDoFiltro(filters);
      const sixMonthsAgo = format(subMonths(new Date(), 6), "yyyy-MM-dd");
      // Os gráficos mostram os 6 meses que terminam no fim do filtro, não só o período filtrado
      const inicioSerie = startOfMonth(subMonths(filters.endDate, 5));
      const serie = intervaloDoFiltro({ startDate: inicioSerie, endDate: filters.endDate });

      const profIds = await dentistasFiltrados(clinicId, filters);

      const { count: totalPatients } = await supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId);
      const { count: newPatients } = await supabase.from("patients").select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId).gte("created_at", inicio).lt("created_at", fim);

      let activeCount = 0;
      let appts: { status: string; appointment_date: string }[] = [];
      let apptsSerie: { status: string; appointment_date: string }[] = [];
      if (profIds.length > 0) {
        const { data: activeAppts } = await supabase.from("appointments").select("patient_id")
          .in("dentist_id", profIds).gte("appointment_date", sixMonthsAgo).eq("status", STATUS.realizado);
        activeCount = new Set(activeAppts?.map((a) => a.patient_id) || []).size;

        let q = supabase.from("appointments").select("status, appointment_date")
          .in("dentist_id", profIds).gte("appointment_date", serie.inicio).lt("appointment_date", serie.fim);
        if (filters.status) q = q.eq("status", filters.status);
        const { data } = await q;
        apptsSerie = data || [];
        appts = apptsSerie.filter((a) => dentroDoIntervalo(a.appointment_date, { inicio, fim }));
      }

      const realized = appts.filter((a) => a.status === STATUS.realizado).length;
      const missed = appts.filter((a) => a.status === STATUS.faltou).length;
      const canceled = appts.filter((a) => a.status === STATUS.cancelado).length;

      setKpis({
        totalPatients: totalPatients || 0,
        activePatients: activeCount,
        newPatients: newPatients || 0,
        totalAppts: appts.length,
        // Comparecimento conta só consultas encerradas: consultas futuras não são falta
        attendanceRate: pct(realized, realized + missed),
        cancelRate: pct(canceled, appts.length),
      });

      const months = eachMonthOfInterval({ start: inicioSerie, end: filters.endDate });
      setMonthlyData(months.map((m) => {
        const mAppts = apptsSerie.filter((a) => format(new Date(a.appointment_date), "yyyy-MM") === format(m, "yyyy-MM"));
        return {
          month: format(m, "MMM", { locale: ptBR }),
          realizadas: mAppts.filter((a) => a.status === STATUS.realizado).length,
          faltas: mAppts.filter((a) => a.status === STATUS.faltou).length,
        };
      }));

      const { data: patientsAll } = await supabase.from("patients").select("created_at").eq("clinic_id", clinicId)
        .gte("created_at", serie.inicio).lt("created_at", serie.fim);
      setNewPatientsData(months.map((m) => ({
        month: format(m, "MMM", { locale: ptBR }),
        novos: (patientsAll || []).filter((p) => format(new Date(p.created_at), "yyyy-MM") === format(m, "yyyy-MM")).length,
      })));

      setLoading(false);
    };
    fetch();
  }, [clinicId, filters]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[92px] rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-[340px] rounded-lg" /><Skeleton className="h-[340px] rounded-lg" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FaixaIndicadores
        compacto
        itens={[
          { rotulo: "Pacientes", valor: kpis.totalPatients, nota: `${kpis.activePatients} ativos em 6 meses` },
          { rotulo: "Novos no período", valor: kpis.newPatients },
          { rotulo: "Consultas", valor: kpis.totalAppts },
          { rotulo: "Comparecimento", valor: kpis.attendanceRate, sufixo: "%", nota: "das consultas encerradas" },
          { rotulo: "Cancelamento", valor: kpis.cancelRate, sufixo: "%", tom: kpis.cancelRate >= 20 ? "alerta" : "padrao" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico titulo="Consultas por mês" nota="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} barGap={2}>
              <CartesianGrid {...GRADE} />
              <XAxis dataKey="month" {...EIXO} />
              <YAxis {...EIXO} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip {...DICA} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="realizadas" name="Finalizadas" fill={CORES_GRAFICO.destaque} radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="faltas" name="Faltas" fill={CORES_GRAFICO.neutra} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </CartaoGrafico>

        <CartaoGrafico titulo="Pacientes novos por mês" nota="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={newPatientsData}>
              <CartesianGrid {...GRADE} />
              <XAxis dataKey="month" {...EIXO} />
              <YAxis {...EIXO} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip {...DICA} cursor={{ stroke: CORES_GRAFICO.grade }} />
              <Line type="monotone" dataKey="novos" name="Novos" stroke={CORES_GRAFICO.destaque} strokeWidth={2} dot={{ r: 3, fill: CORES_GRAFICO.destaque }} />
            </LineChart>
          </ResponsiveContainer>
        </CartaoGrafico>
      </div>
    </div>
  );
};

export default VisaoGeralTab;
