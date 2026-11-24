import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { BotaoExportar } from "./comum";
import { STATUS } from "./dados";
import type { ReportFilters } from "./RelatorioFilters";
import { useRelatorioExport } from "@/hooks/useRelatorioExport";

interface Props { clinicId: string; filters: ReportFilters; }

interface PatientRow {
  name: string;
  lastAppt: string;
  dentist: string;
  status: string;
  totalAppts: number;
}

const PacientesTab = ({ clinicId, filters }: Props) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ total: 0, active: 0, inactive: 0, noReturn: 0 });
  const [rows, setRows] = useState<PatientRow[]>([]);
  const { exportToCSV, exportToExcel, exportToPDF } = useRelatorioExport();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const sixMonthsAgo = format(subMonths(new Date(), 6), "yyyy-MM-dd");
      const twelveMonthsAgo = format(subMonths(new Date(), 12), "yyyy-MM-dd");

      const { data: patients } = await supabase.from("patients").select("id, full_name, created_at").eq("clinic_id", clinicId);
      const { data: profs } = await supabase.from("profissionais").select("id, nome").eq("clinica_id", clinicId);
      const profMap = new Map((profs || []).map((p) => [p.id, p.nome]));
      const profIds = profs?.map((p) => p.id) || [];

      let appts: { patient_id: string; appointment_date: string; dentist_id: string; status: string }[] = [];
      if (profIds.length > 0) {
        const { data } = await supabase.from("appointments").select("patient_id, appointment_date, dentist_id, status").in("dentist_id", profIds);
        appts = data || [];
      }

      const patientList = patients || [];
      const total = patientList.length;

      const patientAppts = new Map<string, typeof appts>();
      appts.forEach((a) => {
        if (!patientAppts.has(a.patient_id)) patientAppts.set(a.patient_id, []);
        patientAppts.get(a.patient_id)!.push(a);
      });

      let activeCount = 0;
      let noReturnCount = 0;
      const tableRows: PatientRow[] = [];

      patientList.forEach((p) => {
        const pAppts = patientAppts.get(p.id) || [];
        const sorted = [...pAppts].sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
        const lastAppt = sorted[0];
        const isActive = lastAppt && lastAppt.appointment_date >= sixMonthsAgo;
        const hasNoReturn = !lastAppt || lastAppt.appointment_date < twelveMonthsAgo;

        if (isActive) activeCount++;
        if (hasNoReturn) noReturnCount++;

        tableRows.push({
          name: p.full_name,
          lastAppt: lastAppt ? format(new Date(lastAppt.appointment_date), "dd/MM/yyyy") : "Sem consultas",
          dentist: lastAppt ? (profMap.get(lastAppt.dentist_id) || "-") : "-",
          status: isActive ? "Ativo" : "Inativo",
          totalAppts: pAppts.filter((a) => a.status === STATUS.realizado).length,
        });
      });

      tableRows.sort((a, b) => b.totalAppts - a.totalAppts);

      setKpis({ total, active: activeCount, inactive: total - activeCount, noReturn: noReturnCount });
      setRows(tableRows.slice(0, 50));
      setLoading(false);
    };
    fetch();
  }, [clinicId, filters]);

  const columns = [
    { header: "Nome", key: "name" },
    { header: "Última consulta", key: "lastAppt" },
    { header: "Dentista", key: "dentist" },
    { header: "Status", key: "status" },
    { header: "Consultas finalizadas", key: "totalAppts" },
  ];

  if (loading) return <div className="space-y-6"><Skeleton className="h-[92px] rounded-lg" /><Skeleton className="h-96 rounded-lg" /></div>;

  return (
    <div className="space-y-6">
      <FaixaIndicadores
        compacto
        itens={[
          { rotulo: "Pacientes", valor: kpis.total },
          { rotulo: "Ativos", valor: kpis.active, nota: "Consulta nos últimos 6 meses" },
          { rotulo: "Inativos", valor: kpis.inactive },
          { rotulo: "Sem retorno há 12 meses", valor: kpis.noReturn, tom: kpis.noReturn > 0 ? "espera" : "padrao" },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-[15px]">Pacientes que mais consultam</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Os 50 primeiros, por consultas finalizadas</p>
          </div>
          <BotaoExportar
            onCSV={() => exportToCSV(rows, columns, "pacientes")}
            onExcel={() => exportToExcel(rows, columns, "pacientes")}
            onPDF={() => exportToPDF(rows, columns, "pacientes", "Relatório de pacientes")}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => <TableHead key={c.key} className={c.key === "totalAppts" ? "text-right" : undefined}>{c.header}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{row.lastAppt}</TableCell>
                    <TableCell>{row.dentist}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${row.status === "Ativo" ? "bg-sinal-ok-tenue text-sinal-ok" : "bg-muted text-muted-foreground"}`}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalAppts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PacientesTab;
