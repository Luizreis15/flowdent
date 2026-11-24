import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { NovoCasoModal } from "@/components/ortodontia/NovoCasoModal";
import { DetalhesCasoModal } from "@/components/ortodontia/DetalhesCasoModal";
import { ReajusteAnualModal } from "@/components/ortodontia/ReajusteAnualModal";
import { format, differenceInMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planejamento: { label: "Planejamento", variant: "secondary" },
  ativo: { label: "Ativo", variant: "default" },
  contencao: { label: "Contenção", variant: "outline" },
  finalizado: { label: "Finalizado", variant: "secondary" },
  abandonado: { label: "Abandonado", variant: "destructive" },
};

const TIPO_MAP: Record<string, string> = {
  aparelho_fixo: "Ap. Fixo",
  alinhadores: "Alinhadores",
  movel: "Móvel",
  contencao: "Contenção",
  ortopedia: "Ortopedia",
};

export default function Ortodontia() {
  const { clinicId } = useAuth();
  const [novoCasoOpen, setNovoCasoOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selectedCasoId, setSelectedCasoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroAgendamento, setFiltroAgendamento] = useState<string>("todos");
  const [reajusteOpen, setReajusteOpen] = useState(false);

  const { data: casos, refetch } = useQuery({
    queryKey: ["ortho-cases", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ortho_cases")
        .select(`
          *,
          patient:patients!ortho_cases_patient_id_fkey(full_name),
          professional:profissionais!ortho_cases_professional_id_fkey(nome)
        `)
        .eq("clinic_id", clinicId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Query próximos agendamentos futuros por paciente
  const patientIds = useMemo(() => {
    if (!casos) return [];
    return [...new Set(casos.map((c: any) => c.patient_id))];
  }, [casos]);

  // Extrair case_ids para buscar ortho_appointments
  const caseIds = useMemo(() => {
    if (!casos) return [];
    return casos.map((c: any) => c.id);
  }, [casos]);

  // Map case_id -> patient_id
  const caseToPatient = useMemo(() => {
    if (!casos) return {};
    const map: Record<string, string> = {};
    casos.forEach((c: any) => { map[c.id] = c.patient_id; });
    return map;
  }, [casos]);

  const { data: nextAppointments } = useQuery({
    queryKey: ["ortho-next-appointments", patientIds, caseIds],
    enabled: patientIds.length > 0,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // 1) ortho_appointments: proxima_consulta_prevista >= hoje
      const { data: orthoAppts, error: orthoErr } = await supabase
        .from("ortho_appointments")
        .select("case_id, proxima_consulta_prevista")
        .in("case_id", caseIds)
        .gte("proxima_consulta_prevista", today)
        .order("proxima_consulta_prevista", { ascending: true });
      if (orthoErr) throw orthoErr;

      // 2) appointments (fallback agenda geral)
      const now = new Date().toISOString();
      const { data: generalAppts, error: genErr } = await supabase
        .from("appointments")
        .select("patient_id, appointment_date")
        .in("patient_id", patientIds)
        .gt("appointment_date", now)
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: true });
      if (genErr) throw genErr;

      // Combinar: pegar a data mais próxima por patient_id
      const map: Record<string, string> = {};

      // Ortho appointments (fonte principal)
      orthoAppts?.forEach((a: any) => {
        const pid = caseToPatient[a.case_id];
        if (pid && a.proxima_consulta_prevista) {
          if (!map[pid] || a.proxima_consulta_prevista < map[pid]) {
            map[pid] = a.proxima_consulta_prevista;
          }
        }
      });

      // General appointments (fallback)
      generalAppts?.forEach((a: any) => {
        if (!map[a.patient_id] || a.appointment_date < map[a.patient_id]) {
          map[a.patient_id] = a.appointment_date;
        }
      });

      return map;
    },
  });

  const casosFiltrados = useMemo(() => {
    if (!casos) return [];
    return casos
      .filter((c: any) => {
        const matchBusca =
          busca === "" ||
          c.patient?.full_name?.toLowerCase().includes(busca.toLowerCase()) ||
          c.professional?.nome?.toLowerCase().includes(busca.toLowerCase());
        const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
        const matchTipo = filtroTipo === "todos" || c.tipo_tratamento === filtroTipo;
        const hasAppt = nextAppointments?.[c.patient_id];
        const matchAgendamento =
          filtroAgendamento === "todos" ||
          (filtroAgendamento === "com_agendamento" && hasAppt) ||
          (filtroAgendamento === "sem_agendamento" && !hasAppt);
        return matchBusca && matchStatus && matchTipo && matchAgendamento;
      })
      .sort((a: any, b: any) =>
        (a.patient?.full_name || "").localeCompare(b.patient?.full_name || "", "pt-BR")
      );
  }, [casos, busca, filtroStatus, filtroTipo, filtroAgendamento, nextAppointments]);

  const getProgresso = (caso: any) => {
    if (!caso.total_meses || !caso.data_inicio) return null;
    const mesesDecorridos = differenceInMonths(new Date(), parseISO(caso.data_inicio));
    return { atual: Math.min(mesesDecorridos, caso.total_meses), total: caso.total_meses };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Ortodontia</h1>
          <p className="text-muted-foreground text-sm">Acompanhamento de casos ortodônticos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReajusteOpen(true)}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Reajuste Anual
          </Button>
          <Button onClick={() => setNovoCasoOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Caso
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por paciente ou profissional..."
            className="pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="planejamento">Planejamento</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="contencao">Contenção</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="abandonado">Abandonado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="aparelho_fixo">Aparelho Fixo</SelectItem>
            <SelectItem value="alinhadores">Alinhadores</SelectItem>
            <SelectItem value="movel">Móvel</SelectItem>
            <SelectItem value="contencao">Contenção</SelectItem>
            <SelectItem value="ortopedia">Ortopedia</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroAgendamento} onValueChange={setFiltroAgendamento}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Agendamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="com_agendamento">Com agendamento</SelectItem>
            <SelectItem value="sem_agendamento">Sem agendamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista compacta */}
      {casosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Nenhum caso encontrado</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">Crie um novo caso ortodôntico para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {/* Header da lista */}
          <div className="hidden md:grid grid-cols-[1fr_100px_120px_100px_90px_160px] gap-2 px-4 py-2.5 border-b bg-muted/50 text-xs font-medium text-muted-foreground rounded-t-lg">
            <span>Paciente</span>
            <span>Tipo</span>
            <span>Profissional</span>
            <span>Status</span>
            <span>Progresso</span>
            <span>Agendamento</span>
          </div>
          <div className="divide-y">
            {casosFiltrados.map((caso: any) => {
              const progresso = getProgresso(caso);
              const statusInfo = STATUS_MAP[caso.status] || { label: caso.status, variant: "outline" as const };
              const nextAppt = nextAppointments?.[caso.patient_id];

              return (
                <div
                  key={caso.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_100px_90px_160px] gap-1 md:gap-2 items-center px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => { setSelectedCasoId(caso.id); setDetalhesOpen(true); }}
                >
                  {/* Paciente */}
                  <span className="font-medium text-sm text-foreground truncate">
                    {caso.patient?.full_name}
                  </span>

                  {/* Tipo */}
                  <span className="text-xs text-muted-foreground">
                    {TIPO_MAP[caso.tipo_tratamento] || caso.tipo_tratamento}
                  </span>

                  {/* Profissional */}
                  <span className="text-xs text-muted-foreground truncate">
                    Dr(a). {caso.professional?.nome}
                  </span>

                  {/* Status */}
                  <Badge variant={statusInfo.variant} className="w-fit text-[10px]">
                    {statusInfo.label}
                  </Badge>

                  {/* Progresso */}
                  <span className="text-xs text-muted-foreground">
                    {progresso ? `${progresso.atual}/${progresso.total}m` : "—"}
                  </span>

                  {/* Agendamento */}
                  {nextAppt ? (
                    <Badge className="w-fit gap-1 border-transparent bg-sinal-ok-tenue text-sinal-ok text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      {format(parseISO(nextAppt), "dd/MM", { locale: ptBR })} — Ok
                    </Badge>
                  ) : (
                    <Badge className="w-fit gap-1 border-transparent bg-sinal-alerta-tenue text-sinal-alerta text-[10px]">
                      <AlertCircle className="w-3 h-3" />
                      Sem agendamento
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <NovoCasoModal open={novoCasoOpen} onOpenChange={setNovoCasoOpen} onSuccess={refetch} />
      <DetalhesCasoModal open={detalhesOpen} onOpenChange={setDetalhesOpen} casoId={selectedCasoId} onRefresh={refetch} />
      <ReajusteAnualModal open={reajusteOpen} onOpenChange={setReajusteOpen} onSuccess={refetch} />
    </div>
  );
}
