import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getDay, getHours } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarX2 } from "lucide-react";
import type { ReportFilters } from "./RelatorioFilters";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { CORES_GRAFICO } from "@/lib/coresGrafico";
import { statusConsulta } from "@/lib/statusConsulta";
import { CartaoGrafico, ListaRanqueada } from "./comum";
import { DICA, EIXO, GRADE, STATUS, dentistasFiltrados, intervaloDoFiltro } from "./dados";

interface Props { clinicId: string; filters: ReportFilters; }

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ConsultasTab = ({ clinicId, filters }: Props) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ total: 0, realized: 0, canceled: 0, missed: 0 });
  const [statusData, setStatusData] = useState<{ nome: string; valor: number }[]>([]);
  const [dayData, setDayData] = useState<{ day: string; consultas: number }[]>([]);
  const [hourData, setHourData] = useState<{ hour: string; consultas: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { inicio, fim } = intervaloDoFiltro(filters);
      const profIds = await dentistasFiltrados(clinicId, filters);

      let list: { status: string; appointment_date: string }[] = [];
      if (profIds.length > 0) {
        let query = supabase.from("appointments").select("status, appointment_date")
          .in("dentist_id", profIds).gte("appointment_date", inicio).lt("appointment_date", fim);
        if (filters.status) query = query.eq("status", filters.status);
        const { data } = await query;
        list = data || [];
      }

      setKpis({
        total: list.length,
        realized: list.filter((a) => a.status === STATUS.realizado).length,
        canceled: list.filter((a) => a.status === STATUS.cancelado).length,
        missed: list.filter((a) => a.status === STATUS.faltou).length,
      });

      const porStatus: Record<string, number> = {};
      list.forEach((a) => {
        const rotulo = statusConsulta(a.status).rotulo;
        porStatus[rotulo] = (porStatus[rotulo] || 0) + 1;
      });
      setStatusData(Object.entries(porStatus).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor));

      const dayCounts = Array(7).fill(0);
      list.forEach((a) => { dayCounts[getDay(new Date(a.appointment_date))]++; });
      // Semana começando na segunda, como na agenda
      setDayData([1, 2, 3, 4, 5, 6, 0].map((i) => ({ day: DAYS[i], consultas: dayCounts[i] })));

      const hourCounts: Record<number, number> = {};
      list.forEach((a) => {
        const h = getHours(new Date(a.appointment_date));
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      });
      setHourData(Object.entries(hourCounts).map(([h, c]) => ({ hour: `${h}h`, consultas: c })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour)));

      setLoading(false);
    };
    fetch();
  }, [clinicId, filters]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[92px] rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[320px] rounded-lg" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FaixaIndicadores
        compacto
        itens={[
          { rotulo: "Consultas", valor: kpis.total },
          { rotulo: "Finalizadas", valor: kpis.realized },
          { rotulo: "Canceladas", valor: kpis.canceled },
          { rotulo: "Faltas", valor: kpis.missed, tom: kpis.missed > 0 ? "alerta" : "padrao" },
        ]}
      />

      {kpis.total === 0 ? (
        <div className="rounded-lg border bg-card">
          <EstadoVazio icone={CalendarX2} titulo="Nenhuma consulta no período" descricao="Ajuste as datas ou os filtros acima para ver a distribuição das consultas." />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <CartaoGrafico titulo="Por status">
            <ListaRanqueada itens={statusData} />
          </CartaoGrafico>

          <CartaoGrafico titulo="Por dia da semana">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dayData}>
                <CartesianGrid {...GRADE} />
                <XAxis dataKey="day" {...EIXO} />
                <YAxis {...EIXO} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip {...DICA} />
                <Bar dataKey="consultas" name="Consultas" fill={CORES_GRAFICO.destaque} radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CartaoGrafico>

          <CartaoGrafico titulo="Por horário">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourData}>
                <CartesianGrid {...GRADE} />
                <XAxis dataKey="hour" {...EIXO} />
                <YAxis {...EIXO} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip {...DICA} />
                <Bar dataKey="consultas" name="Consultas" fill={CORES_GRAFICO.destaque} radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CartaoGrafico>
        </div>
      )}
    </div>
  );
};

export default ConsultasTab;
