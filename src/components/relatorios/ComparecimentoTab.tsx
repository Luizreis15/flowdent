import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getDay, getHours } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarCheck } from "lucide-react";
import type { ReportFilters } from "./RelatorioFilters";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { CORES_GRAFICO } from "@/lib/coresGrafico";
import { CartaoGrafico, ListaRanqueada } from "./comum";
import { DICA, EIXO, GRADE, STATUS, intervaloDoFiltro, pct } from "./dados";

interface Props { clinicId: string; filters: ReportFilters; }

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ComparecimentoTab = ({ clinicId, filters }: Props) => {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({ taxa: 0, encerradas: 0, faltas: 0 });
  const [dayData, setDayData] = useState<{ day: string; faltas: number }[]>([]);
  const [hourData, setHourData] = useState<{ hour: string; faltas: number }[]>([]);
  const [dentistData, setDentistData] = useState<{ nome: string; valor: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { inicio, fim } = intervaloDoFiltro(filters);

      const { data: profs } = await supabase.from("profissionais").select("id, nome").eq("clinica_id", clinicId);
      const profIds = profs?.map((p) => p.id) || [];
      if (!profIds.length) { setLoading(false); return; }

      const { data: appts } = await supabase.from("appointments").select("dentist_id, status, appointment_date")
        .in("dentist_id", profIds).gte("appointment_date", inicio).lt("appointment_date", fim);
      const list = appts || [];
      const missed = list.filter((a) => a.status === STATUS.faltou);
      const realized = list.filter((a) => a.status === STATUS.realizado).length;
      // Só consultas encerradas entram na taxa: agendadas no futuro ainda não são falta
      const encerradas = realized + missed.length;
      setResumo({ taxa: pct(realized, encerradas), encerradas, faltas: missed.length });

      const dayCounts = Array(7).fill(0);
      missed.forEach((a) => { dayCounts[getDay(new Date(a.appointment_date))]++; });
      setDayData([1, 2, 3, 4, 5, 6, 0].map((i) => ({ day: DAYS[i], faltas: dayCounts[i] })));

      const hourCounts: Record<number, number> = {};
      missed.forEach((a) => { const h = getHours(new Date(a.appointment_date)); hourCounts[h] = (hourCounts[h] || 0) + 1; });
      setHourData(Object.entries(hourCounts).map(([h, c]) => ({ hour: `${h}h`, faltas: c })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour)));

      const profMap = new Map((profs || []).map((p) => [p.id, p.nome]));
      const dentistCounts: Record<string, number> = {};
      missed.forEach((a) => { const nome = profMap.get(a.dentist_id) || "Sem dentista"; dentistCounts[nome] = (dentistCounts[nome] || 0) + 1; });
      setDentistData(Object.entries(dentistCounts).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor));

      setLoading(false);
    };
    fetch();
  }, [clinicId, filters]);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  return (
    <div className="space-y-6">
      <FaixaIndicadores
        itens={[
          { rotulo: "Comparecimento", valor: resumo.taxa, sufixo: "%", nota: "das consultas encerradas no período" },
          { rotulo: "Consultas encerradas", valor: resumo.encerradas, nota: "Finalizadas e faltas" },
          { rotulo: "Faltas", valor: resumo.faltas, tom: resumo.faltas > 0 ? "alerta" : "padrao" },
        ]}
      />

      {resumo.faltas === 0 ? (
        <div className="rounded-lg border bg-card">
          <EstadoVazio icone={CalendarCheck} titulo="Nenhuma falta no período" descricao="Quando houver faltas, aqui aparecem os dias, horários e dentistas em que elas se concentram." />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <CartaoGrafico titulo="Faltas por dia da semana">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dayData}>
                <CartesianGrid {...GRADE} />
                <XAxis dataKey="day" {...EIXO} />
                <YAxis {...EIXO} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip {...DICA} />
                <Bar dataKey="faltas" name="Faltas" fill={CORES_GRAFICO.destaque} radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CartaoGrafico>

          <CartaoGrafico titulo="Faltas por horário">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourData}>
                <CartesianGrid {...GRADE} />
                <XAxis dataKey="hour" {...EIXO} />
                <YAxis {...EIXO} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip {...DICA} />
                <Bar dataKey="faltas" name="Faltas" fill={CORES_GRAFICO.destaque} radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CartaoGrafico>

          <CartaoGrafico titulo="Faltas por dentista">
            <ListaRanqueada itens={dentistData} tom="alerta" />
          </CartaoGrafico>
        </div>
      )}
    </div>
  );
};

export default ComparecimentoTab;
