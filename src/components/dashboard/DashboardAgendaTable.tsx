import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CLASSE_BARRA, statusConsulta } from "@/lib/statusConsulta";
import { SeloStatus } from "@/components/sistema/SeloStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardAgendaTableProps {
  clinicId: string;
}


export const DashboardAgendaTable = React.memo(({ clinicId }: DashboardAgendaTableProps) => {
  const navigate = useNavigate();
  const today = new Date();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["dashboard-agenda-table", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          title,
          status,
          patient_id!inner(id, full_name, clinic_id),
          dentist_id(id, nome)
        `)
        .eq("patient_id.clinic_id", clinicId)
        .gte("appointment_date", startOfDay(today).toISOString())
        .lte("appointment_date", endOfDay(today).toISOString())
        .order("appointment_date", { ascending: true })
        .limit(15);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Agenda do dia</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between gap-3 space-y-0 pb-3">
        <CardTitle>Agenda do dia</CardTitle>
        <span className="text-[13px] text-muted-foreground first-letter:uppercase">
          {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        {appointments && appointments.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {appointments.map((apt) => {
              const { tom } = statusConsulta(apt.status);
              const paciente =
                apt.patient_id && typeof apt.patient_id === "object" && "full_name" in apt.patient_id
                  ? (apt.patient_id as { id: string; full_name: string })
                  : null;
              const dentista =
                apt.dentist_id && typeof apt.dentist_id === "object" && "nome" in apt.dentist_id
                  ? (apt.dentist_id as { nome: string }).nome
                  : null;

              return (
                <li key={apt.id} className="flex items-center gap-4 px-4 py-3">
                  <time className="w-12 shrink-0 text-[15px] text-muted-foreground">
                    {format(new Date(apt.appointment_date), "HH:mm")}
                  </time>
                  <span className={cn("h-6 w-0.5 shrink-0 rounded-full", CLASSE_BARRA[tom])} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="truncate text-left text-[15px] font-medium text-foreground hover:underline"
                      title="Abrir ficha do paciente"
                      onClick={() => paciente && navigate(`/dashboard/prontuario/${paciente.id}`)}
                    >
                      {paciente?.full_name ?? "—"}
                    </button>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {[apt.title, dentista].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <SeloStatus status={apt.status} />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma consulta agendada para hoje</div>
        )}
      </CardContent>
    </Card>
  );
});

DashboardAgendaTable.displayName = "DashboardAgendaTable";
