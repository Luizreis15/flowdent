import React from "react";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardAlertsProps {
  clinicId: string;
}

export const DashboardAlerts = React.memo(({ clinicId }: DashboardAlertsProps) => {
  // Pagamentos atrasados
  const { data: overduePayments, isLoading: loadingPayments } = useQuery({
    queryKey: ["dashboard-overdue-payments", clinicId],
    queryFn: async () => {
      // Mesma regra de vencido do Contas a Receber. Antes a consulta usava payments.due_date,
      // coluna que não existe, e mandava todos os pacientes na URL: o alerta mostrava sempre 0.
      const { count, error } = await supabase
        .from("receivable_titles")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .lt("due_date", new Date().toISOString().split("T")[0])
        .not("status", "in", "(paid,cancelled,renegotiated)");

      if (error) return 0;
      return count || 0;
    },
  });

  // Tratamentos não finalizados (budget items com status in_progress)
  const { data: pendingTreatments, isLoading: loadingTreatments } = useQuery({
    queryKey: ["dashboard-pending-treatments", clinicId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("budgets")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("status", "approved");

      if (error) return 0;
      return count || 0;
    },
  });

  // Orçamentos pendentes
  const { data: pendingBudgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ["dashboard-pending-budgets", clinicId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("budgets")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("status", "pending");

      if (error) return 0;
      return count || 0;
    },
  });

  const isLoading = loadingPayments || loadingTreatments || loadingBudgets;

  if (isLoading) {
    return (
      <Skeleton className="h-[84px] w-full rounded-lg" />
    );
  }

  const atrasados = overduePayments || 0;

  return (
    <FaixaIndicadores
      itens={[
        { rotulo: "Pagamentos atrasados", valor: atrasados, tom: atrasados > 0 ? "alerta" : "padrao" },
        { rotulo: "Tratamentos em andamento", valor: pendingTreatments || 0 },
        { rotulo: "Orçamentos pendentes", valor: pendingBudgets || 0 },
      ]}
    />
  );
});

DashboardAlerts.displayName = "DashboardAlerts";
