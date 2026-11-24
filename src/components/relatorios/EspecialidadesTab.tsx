import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope } from "lucide-react";
import type { ReportFilters } from "./RelatorioFilters";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { CartaoGrafico, ListaRanqueada } from "./comum";
import { intervaloDoFiltro } from "./dados";

interface Props { clinicId: string; filters: ReportFilters; }

/**
 * Atendimentos por especialidade. Antes eram uma pizza e um gráfico de barras com o mesmo dado;
 * agora uma lista ranqueada, que mostra quantidade e participação juntas.
 */
const EspecialidadesTab = ({ clinicId, filters }: Props) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ nome: string; valor: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { inicio, fim } = intervaloDoFiltro(filters);

      const { data: profs } = await supabase.from("profissionais").select("id, especialidade").eq("clinica_id", clinicId);
      const profIds = profs?.map((p) => p.id) || [];
      if (!profIds.length) { setData([]); setLoading(false); return; }

      let q = supabase.from("appointments").select("dentist_id")
        .in("dentist_id", profIds).gte("appointment_date", inicio).lt("appointment_date", fim);
      if (filters.status) q = q.eq("status", filters.status);
      const { data: appts } = await q;

      const espMap = new Map((profs || []).map((p) => [p.id, p.especialidade || "Clínica geral"]));
      const counts: Record<string, number> = {};
      (appts || []).forEach((a) => {
        const esp = espMap.get(a.dentist_id) || "Clínica geral";
        counts[esp] = (counts[esp] || 0) + 1;
      });

      setData(Object.entries(counts).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor));
      setLoading(false);
    };
    fetch();
  }, [clinicId, filters]);

  if (loading) return <Skeleton className="h-80 rounded-lg" />;

  const total = data.reduce((s, d) => s + d.valor, 0);

  return (
    <CartaoGrafico
      titulo="Atendimentos por especialidade"
      nota={total > 0 ? `${total} consultas no período, pela especialidade do dentista` : undefined}
      className="max-w-3xl"
    >
      {data.length === 0 ? (
        <EstadoVazio icone={Stethoscope} titulo="Nenhum atendimento no período" descricao="Ajuste as datas ou os filtros acima." className="py-6" />
      ) : (
        <ListaRanqueada itens={data} unidade="consultas" />
      )}
    </CartaoGrafico>
  );
};

export default EspecialidadesTab;
