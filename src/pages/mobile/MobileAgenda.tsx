import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import SwipeableAppointmentCard from "@/components/mobile/SwipeableAppointmentCard";

interface MobileAgendaProps {
  clinicId: string;
}

type ViewMode = "day" | "week" | "month";

const MobileAgenda = ({ clinicId }: MobileAgendaProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDentist, setSelectedDentist] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dentists for filter
  const { data: dentists } = useQuery({
    queryKey: ["mobile-dentists", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("clinica_id", clinicId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case "day":
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        return { start: dayStart, end: dayEnd };
      case "week":
        return {
          start: startOfWeek(currentDate, { locale: ptBR }),
          end: endOfWeek(currentDate, { locale: ptBR }),
        };
      case "month":
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch appointments
  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ["mobile-agenda", clinicId, currentDate.toISOString(), viewMode, selectedDentist],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          title,
          status,
          duration_minutes,
          patient_id,
          dentist_id,
          patients (full_name),
          profissionais (nome)
        `)
        .gte("appointment_date", dateRange.start.toISOString())
        .lte("appointment_date", dateRange.end.toISOString())
        .order("appointment_date", { ascending: true });

      if (selectedDentist !== "all") {
        query = query.eq("dentist_id", selectedDentist);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-agenda"] });
    },
  });

  const handleConfirm = useCallback((id: string) => {
    updateStatusMutation.mutate(
      { id, status: "confirmado" },
      {
        onSuccess: () => {
          toast({ title: "Confirmado", description: "Agendamento confirmado com sucesso." });
        },
      }
    );
  }, [updateStatusMutation]);

  const handleCancel = useCallback((id: string) => {
    updateStatusMutation.mutate(
      { id, status: "cancelado" },
      {
        onSuccess: () => {
          toast({ title: "Cancelado", description: "Agendamento cancelado." });
        },
      }
    );
  }, [updateStatusMutation]);

  const handleSendMessage = useCallback((id: string, patientId: string) => {
    navigate(`/dashboard/crm?patient=${patientId}`);
  }, [navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const navigateDate = (direction: "prev" | "next") => {
    const days = viewMode === "day" ? 1 : viewMode === "week" ? 7 : 30;
    setCurrentDate(prev => 
      direction === "next" ? addDays(prev, days) : addDays(prev, -days)
    );
  };

  const getDateLabel = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
      case "week":
        return `${format(dateRange.start, "dd/MM")} - ${format(dateRange.end, "dd/MM")}`;
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: ptBR });
    }
  };

  const statusColors: Record<string, string> = {
    confirmado: "bg-green-500/10 text-green-600 border-green-500/20",
    agendado: "bg-primary/10 text-primary border-primary/20",
    concluido: "bg-muted text-muted-foreground",
    cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  };

  // Group appointments by date for week/month view
  const groupedAppointments = appointments?.reduce((acc, apt) => {
    const date = format(parseISO(apt.appointment_date), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {} as Record<string, typeof appointments>);

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      {/* Header with filters */}
      <div className="bg-gradient-to-br from-primary via-acento-600 to-acento-400 text-white px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Agenda</h1>
          <Button
            size="sm"
            onClick={() => navigate("/dashboard/agenda?new=true")}
            className="bg-white/20 hover:bg-white/30 text-white h-9 px-3"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-1 bg-white/10 rounded-lg p-1 mb-3" style={{ touchAction: 'manipulation' }}>
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                viewMode === mode
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>

        {/* Dentist Filter */}
        <Select value={selectedDentist} onValueChange={setSelectedDentist}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Todos os profissionais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {dentists?.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between px-3 py-2 bg-card border-b">
        <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")} className="h-9 w-9">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center flex-1">
          <p className="font-semibold capitalize text-sm">{getDateLabel()}</p>
          <p className="text-[10px] text-muted-foreground">
            {appointments?.length || 0} agendamento(s)
          </p>
        </div>
        <div className="flex items-center gap-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigateDate("next")} className="h-9 w-9">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="p-3 space-y-2">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </>
        ) : !appointments || appointments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">
                Nenhum agendamento
              </p>
              <p className="text-sm text-muted-foreground/70">
                {viewMode === "day" ? "neste dia" : viewMode === "week" ? "nesta semana" : "neste mês"}
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate("/dashboard/agenda?new=true")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "day" ? (
          // Day view - show swipeable cards
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-2">
              ← Deslize para cancelar | Deslize para confirmar →
            </p>
            {appointments.map((apt) => (
              <SwipeableAppointmentCard
                key={apt.id}
                appointment={{
                  ...apt,
                  patients: apt.patients as { full_name: string } | null,
                  profissionais: apt.profissionais as { nome: string } | null,
                }}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onSendMessage={handleSendMessage}
                onClick={() => navigate(`/dashboard/prontuario/${apt.patient_id}`)}
              />
            ))}
          </div>
        ) : (
          // Week/Month view - grouped by date
          <div className="space-y-4">
            {Object.entries(groupedAppointments || {}).map(([date, dayAppointments]) => (
              <div key={date}>
                <p className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                  {format(parseISO(date), "EEEE, dd/MM", { locale: ptBR })}
                </p>
                <div className="space-y-2">
                  {dayAppointments?.map((apt) => (
                    <Card
                      key={apt.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/dashboard/prontuario/${apt.patient_id}`)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="text-center shrink-0 w-12">
                          <p className="text-lg font-bold text-primary">
                            {format(parseISO(apt.appointment_date), "HH:mm")}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {apt.patients?.full_name || "Paciente"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {apt.title} • {apt.profissionais?.nome}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={statusColors[apt.status || "agendado"]}
                        >
                          {apt.status === "confirmado" ? "✓" : apt.status === "cancelado" ? "✕" : "○"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileAgenda;
