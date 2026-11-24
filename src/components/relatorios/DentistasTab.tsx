import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CORES_GRAFICO } from "@/lib/coresGrafico";
import { BotaoExportar, CartaoGrafico } from "./comum";
import { DICA, EIXO, GRADE, STATUS, intervaloDoFiltro, pct } from "./dados";
import type { ReportFilters } from "./RelatorioFilters";
import { useRelatorioExport } from "@/hooks/useRelatorioExport";

interface Props { clinicId: string; filters: ReportFilters; }

interface DentistRow {
  name: string;
  total: number;
  realized: number;
  attendanceRate: string;
  canceled: number;
  patients: number;
}

const DentistasTab = ({ clinicId, filters }: Props) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DentistRow[]>([]);
  const [chartData, setChartData] = useState<{ name: string; realizadas: number; canceladas: number }[]>([]);
  const { exportToCSV, exportToExcel, exportToPDF } = useRelatorioExport();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { inicio, fim } = intervaloDoFiltro(filters);

      const { data: profs } = await supabase.from("profissionais").select("id, nome").eq("clinica_id", clinicId).eq("ativo", true);
      const profIds = profs?.map((p) => p.id) || [];
      if (!profIds.length) { setRows([]); setChartData([]); setLoading(false); return; }

      const { data: appts } = await supabase.from("appointments").select("dentist_id, patient_id, status").in("dentist_id", profIds).gte("appointment_date", inicio).lt("appointment_date", fim);

      const profMap = new Map<string, string>();
      profs?.forEach((p) => profMap.set(p.id, p.nome));

      const dentistData: Record<string, { total: number; realized: number; missed: number; canceled: number; patients: Set<string> }> = {};
      profIds.forEach((id) => { dentistData[id] = { total: 0, realized: 0, missed: 0, canceled: 0, patients: new Set() }; });

      (appts || []).forEach((a) => {
        const d = dentistData[a.dentist_id];
        if (d) {
          d.total++;
          if (a.status === STATUS.realizado) d.realized++;
          if (a.status === STATUS.faltou) d.missed++;
          if (a.status === STATUS.cancelado) d.canceled++;
          d.patients.add(a.patient_id);
        }
      });

      const result: DentistRow[] = Object.entries(dentistData).map(([id, d]) => ({
        name: profMap.get(id) || "-",
        total: d.total,
        realized: d.realized,
        // Comparecimento sobre consultas encerradas (finalizadas + faltas)
        attendanceRate: `${pct(d.realized, d.realized + d.missed)}%`,
        canceled: d.canceled,
        patients: d.patients.size,
      })).sort((a, b) => b.total - a.total);

      setRows(result);
      setChartData(result.map((r) => ({ name: r.name, realizadas: r.realized, canceladas: r.canceled })));
      setLoading(false);
    };
    fetch();
  }, [clinicId, filters]);

  const columns = [
    { header: "Dentista", key: "name" },
    { header: "Atendimentos", key: "total" },
    { header: "Finalizados", key: "realized" },
    { header: "Comparecimento", key: "attendanceRate" },
    { header: "Cancelamentos", key: "canceled" },
    { header: "Pacientes", key: "patients" },
  ];

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  return (
    <div className="space-y-6">
      <CartaoGrafico titulo="Comparativo por dentista" nota="Consultas finalizadas e canceladas no período">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid {...GRADE} />
              <XAxis dataKey="name" {...EIXO} tickFormatter={(n: string) => n.split(" ").slice(0, 2).join(" ")} />
              <YAxis {...EIXO} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip {...DICA} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="realizadas" name="Realizadas" fill={CORES_GRAFICO.destaque} radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="canceladas" name="Canceladas" fill={CORES_GRAFICO.neutra} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
      </CartaoGrafico>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-[15px]">Detalhamento por dentista</CardTitle>
          <BotaoExportar
            onCSV={() => exportToCSV(rows, columns, "dentistas")}
            onExcel={() => exportToExcel(rows, columns, "dentistas")}
            onPDF={() => exportToPDF(rows, columns, "dentistas", "Relatório por dentista")}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => <TableHead key={c.key} className={c.key === "name" ? undefined : "text-right"}>{c.header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.realized}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.attendanceRate}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.canceled}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.patients}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DentistasTab;
