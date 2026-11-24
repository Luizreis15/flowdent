import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { separarMoeda } from "@/lib/moeda";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, startOfDay, endOfDay } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { HorarioFuncionamento } from "@/components/configuracoes/HorarioFuncionamentoCard";

interface DashboardMetricsProps {
  clinicId: string;
}


export const DashboardMetrics = React.memo(({ clinicId }: DashboardMetricsProps) => {
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const startOfCurrentMonth = startOfMonth(today);
  
  // Data de início de produção - contar novos pacientes apenas a partir desta data
  const productionStartDate = new Date("2024-12-01T00:00:00");

  // Mapeamento de dia da semana para chave do horário
  const dayMap: Record<number, keyof HorarioFuncionamento['dias']> = {
    0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta',
    4: 'quinta', 5: 'sexta', 6: 'sabado'
  };

  // Função para calcular slots disponíveis no dia
  const calculateDailySlots = (config: HorarioFuncionamento | null): number => {
    if (!config) return 16; // Fallback: 8h de atendimento com 30min = 16 slots

    const todayKey = dayMap[today.getDay()];
    const diaConfig = config.dias?.[todayKey];
    
    if (!diaConfig?.ativo) return 0; // Dia não ativo

    const intervalo = config.intervalo_padrao || 30;
    
    // Calcular minutos de trabalho
    const [inicioH, inicioM] = diaConfig.inicio.split(':').map(Number);
    const [fimH, fimM] = diaConfig.fim.split(':').map(Number);
    
    let minutosTrabalho = (fimH * 60 + fimM) - (inicioH * 60 + inicioM);
    
    // Subtrair horário de almoço se existir
    if (diaConfig.almoco_inicio && diaConfig.almoco_fim) {
      const [almocoInicioH, almocoInicioM] = diaConfig.almoco_inicio.split(':').map(Number);
      const [almocoFimH, almocoFimM] = diaConfig.almoco_fim.split(':').map(Number);
      const minutosAlmoco = (almocoFimH * 60 + almocoFimM) - (almocoInicioH * 60 + almocoInicioM);
      minutosTrabalho -= minutosAlmoco;
    }
    
    return Math.floor(minutosTrabalho / intervalo);
  };

  // Consultas do dia
  const { data: appointmentsToday, isLoading: loadingAppointments } = useQuery({
    queryKey: ["appointments-today", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, status, patient_id!inner(clinic_id)")
        .eq("patient_id.clinic_id", clinicId)
        .gte("appointment_date", startOfToday.toISOString())
        .lte("appointment_date", endOfToday.toISOString());
      
      if (error) throw error;
      return data || [];
    },
  });

  // Profissionais ativos da clínica
  const { data: activeDentists, isLoading: loadingDentists } = useQuery({
    queryKey: ["active-dentists", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id")
        .eq("clinica_id", clinicId)
        .eq("ativo", true);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Configurações da clínica (horário de funcionamento)
  const { data: clinicConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ["clinic-config", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_clinica")
        .select("horario_funcionamento")
        .eq("clinica_id", clinicId)
        .maybeSingle();
      
      if (error) throw error;
      // Sem configuração cadastrada a consulta devolve undefined, que o React Query rejeita
      // (e repete até desistir): o dashboard ficava preso no carregamento.
      return (data?.horario_funcionamento ?? null) as unknown as HorarioFuncionamento | null;
    },
  });

  // Faturamento do mês
  const { data: paymentsMonth, isLoading: loadingPayments } = useQuery({
    queryKey: ["payments-month", clinicId],
    queryFn: async () => {
      // Filtra pela clínica via join, numa consulta só. Antes os IDs de todos os pacientes
      // iam na URL (.in com 780 UUIDs), que estourava o limite e a métrica nunca carregava.
      const { data, error } = await supabase
        .from("payments")
        .select("value, status, patient_id!inner(clinic_id)")
        .eq("patient_id.clinic_id", clinicId)
        .gte("payment_date", startOfCurrentMonth.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      const total = data?.reduce((sum, p) => sum + Number(p.value || 0), 0) || 0;
      const received = data?.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.value || 0), 0) || 0;
      
      return { total, received };
    },
  });

  // Novos pacientes do mês (a partir da data de início de produção)
  const { data: newPatients, isLoading: loadingPatients } = useQuery({
    queryKey: ["new-patients-month", clinicId],
    queryFn: async () => {
      // Usa a data mais recente entre início do mês ou início de produção
      const countFromDate = startOfCurrentMonth > productionStartDate 
        ? startOfCurrentMonth 
        : productionStartDate;
      
      const { data, error } = await supabase
        .from("patients")
        .select("id")
        .eq("clinic_id", clinicId)
        .gte("created_at", countFromDate.toISOString());
      
      if (error) throw error;
      return data?.length || 0;
    },
  });

  const totalAppointments = appointmentsToday?.length || 0;
  const confirmedAppointments = appointmentsToday?.filter(a => a.status === "scheduled").length || 0;
  
  // Cálculo correto da taxa de ocupação
  // Capacidade total = slots por dentista × número de dentistas ativos
  const slotsPerDentist = calculateDailySlots(clinicConfig);
  const totalDentists = activeDentists?.length || 1;
  const totalCapacity = slotsPerDentist * totalDentists;
  
  // Taxa de ocupação = agendamentos do dia / capacidade total
  const occupationRate = totalCapacity > 0 
    ? Math.min(Math.round((totalAppointments / totalCapacity) * 100), 100) 
    : 0;


  if (loadingAppointments || loadingPayments || loadingPatients || loadingDentists || loadingConfig) {
    return (
      <Skeleton className="h-[104px] w-full rounded-lg" />
    );
  }

  return (
    <FaixaIndicadores
      itens={[
        {
          rotulo: "Consultas hoje",
          valor: totalAppointments,
          nota: totalAppointments > 0 ? `${confirmedAppointments} confirmadas` : "Nenhuma agendada",
        },
        {
          rotulo: "Faturamento do mês",
          ...separarMoeda(formatCurrency(paymentsMonth?.total || 0)),
          nota: `${formatCurrency(paymentsMonth?.received || 0)} recebido`,
        },
        { rotulo: "Novos pacientes", valor: newPatients ?? 0, nota: "Este mês" },
        {
          rotulo: "Ocupação",
          valor: occupationRate,
          sufixo: "%",
          nota: `${totalAppointments} de ${totalCapacity} horários`,
        },
      ]}
    />
  );
});

DashboardMetrics.displayName = "DashboardMetrics";
