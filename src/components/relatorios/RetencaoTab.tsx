import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ReportFilters } from "./RelatorioFilters";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { CORES_GRAFICO } from "@/lib/coresGrafico";
import { CartaoGrafico } from "./comum";
import { DICA, EIXO, GRADE, STATUS } from "./dados";

interface Props { clinicId: string; filters: ReportFilters; }

const RetencaoTab = ({ clinicId, filters }: Props) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ returned: 0, avgInterval: 0, noReturn6: 0, retentionRate: 0 });
  const [cohortData, setCohortData] = useState<{ month: string; novos: number; retornaram: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const startStr = format(filters.startDate, "yyyy-MM-dd");
      const endStr = format(filters.endDate, "yyyy-MM-dd");
      const sixMonthsAgo = format(subMonths(new Date(), 6), "yyyy-MM-dd");

      const { data: profs } = await supabase.from("profissionais").select("id").eq("clinica_id", clinicId);
      const profIds = profs?.map((p) => p.id) || [];
      if (!profIds.length) { setCohortData([]); setLoading(false); return; }

      const { data: appts } = await supabase.from("appointments").select("patient_id, appointment_date, status")
        .in("dentist_id", profIds).eq("status", STATUS.realizado).order("appointment_date");

      const { data: patients } = await supabase.from("patients").select("id, created_at").eq("clinic_id", clinicId);

      const patientAppts = new Map<string, string[]>();
      (appts || []).forEach((a) => {
        if (!patientAppts.has(a.patient_id)) patientAppts.set(a.patient_id, []);
        patientAppts.get(a.patient_id)!.push(a.appointment_date);
      });

      // Patients who returned (2+ appointments in period)
      let returnedCount = 0;
      let totalIntervals = 0;
      let intervalCount = 0;

      patientAppts.forEach((dates) => {
        const inPeriod = dates.filter((d) => d.slice(0, 10) >= startStr && d.slice(0, 10) <= endStr);
        if (inPeriod.length >= 2) returnedCount++;
        
        const sorted = [...dates].sort();
        for (let i = 1; i < sorted.length; i++) {
          const diff = differenceInDays(new Date(sorted[i]), new Date(sorted[i - 1]));
          if (diff > 0) { totalIntervals += diff; intervalCount++; }
        }
      });

      // No return 6+ months
      let noReturn6 = 0;
      (patients || []).forEach((p) => {
        const pDates = patientAppts.get(p.id);
        if (!pDates || pDates.length === 0) { noReturn6++; return; }
        const lastDate = [...pDates].sort().pop()!;
        if (lastDate < sixMonthsAgo) noReturn6++;
      });

      const totalWithAppts = patientAppts.size;
      const retentionRate = totalWithAppts > 0 ? Math.round((returnedCount / totalWithAppts) * 100) : 0;
      const avgInterval = intervalCount > 0 ? Math.round(totalIntervals / intervalCount) : 0;

      setKpis({ returned: returnedCount, avgInterval, noReturn6, retentionRate });

      // Simple cohort: last 6 months - new patients vs returned
      const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
      const cData = months.map((m) => {
        const mStr = format(m, "yyyy-MM");
        const newInMonth = (patients || []).filter((p) => p.created_at.startsWith(mStr));
        const returnedInMonth = newInMonth.filter((p) => {
          const pDates = patientAppts.get(p.id) || [];
          return pDates.filter((d) => d > format(m, "yyyy-MM-dd")).length >= 2;
        });
        return {
          month: format(m, "MMM/yy"),
          novos: newInMonth.length,
          retornaram: returnedInMonth.length,
        };
      });
      setCohortData(cData);

      setLoading(false);
    };
    fetch();
  }, [clinicId, filters]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-[92px] rounded-lg" /><Skeleton className="h-[360px] rounded-lg" /></div>;

  return (
    <div className="space-y-6">
      <FaixaIndicadores
        compacto
        itens={[
          { rotulo: "Retornaram no período", valor: kpis.returned, nota: "2 ou mais consultas finalizadas" },
          { rotulo: "Intervalo médio", valor: kpis.avgInterval, sufixo: "dias", nota: "Entre consultas finalizadas" },
          { rotulo: "Sem retorno há 6 meses", valor: kpis.noReturn6, tom: kpis.noReturn6 > 0 ? "espera" : "padrao" },
          { rotulo: "Retenção", valor: kpis.retentionRate, sufixo: "%" },
        ]}
      />

      <CartaoGrafico titulo="Novos pacientes e retornos" nota="Por mês de cadastro: quantos voltaram para 2 ou mais consultas">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cohortData}>
              <CartesianGrid {...GRADE} />
              <XAxis dataKey="month" {...EIXO} />
              <YAxis {...EIXO} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip {...DICA} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="novos" name="Novos" fill={CORES_GRAFICO.neutra} radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="retornaram" name="Retornaram" fill={CORES_GRAFICO.destaque} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
      </CartaoGrafico>
    </div>
  );
};

export default RetencaoTab;
