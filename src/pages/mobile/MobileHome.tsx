import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, RefreshCw, Calendar, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import MobileQuickActions from "@/components/mobile/MobileQuickActions";
import MobileAgendaList from "@/components/mobile/MobileAgendaList";
import MobileAlerts from "@/components/mobile/MobileAlerts";

interface MobileHomeProps {
  user?: {
    full_name?: string;
    email?: string;
  } | null;
  clinicId: string;
}

const MobileHome = ({ user, clinicId }: MobileHomeProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = user?.full_name?.split(" ")[0] || "usuário";

  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ["mobile-home-summary", clinicId],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("id, status, appointment_date")
        .gte("appointment_date", startOfDay)
        .lte("appointment_date", endOfDay);

      if (error) throw error;

      const total = appointments?.length || 0;
      const confirmed = appointments?.filter((a) => a.status === "confirmed").length || 0;
      const pending = appointments?.filter((a) => a.status === "scheduled").length || 0;

      // Next appointment
      const now = new Date();
      const upcoming = appointments
        ?.filter((a) => new Date(a.appointment_date) > now && a.status !== "cancelled")
        .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
      
      const nextTime = upcoming && upcoming.length > 0
        ? new Date(upcoming[0].appointment_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : null;

      return { total, confirmed, pending, nextTime };
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchSummary();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    (e.currentTarget as HTMLElement).dataset.touchStartY = String(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    const touchStartY = Number((e.currentTarget as HTMLElement).dataset.touchStartY || 0);
    const touchEndY = e.changedTouches[0].clientY;
    const scrollTop = (e.currentTarget as HTMLElement).scrollTop;
    if (scrollTop <= 0 && touchEndY - touchStartY > 100) {
      await handleRefresh();
    }
  }, [handleRefresh]);

  const todayFormatted = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const summaryCards = [
    {
      icon: Calendar,
      value: summaryData?.total ?? "–",
      label: "Consultas",
      colorClass: "text-primary",
      bgClass: "bg-acao-tenue",
    },
    {
      icon: CheckCircle2,
      value: summaryData?.confirmed ?? "–",
      label: "Confirmados",
      colorClass: "text-sinal-ok",
      bgClass: "bg-sinal-ok-tenue",
    },
    {
      icon: Clock,
      value: summaryData?.pending ?? "–",
      label: "Pendentes",
      colorClass: "text-sinal-espera",
      bgClass: "bg-sinal-espera-tenue",
    },
  ];

  return (
    <div
      className="min-h-[100dvh] overflow-y-auto overflow-x-hidden touch-pan-y"
      style={{ width: '100%', maxWidth: '100%', touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-2 bg-primary">
          <RefreshCw className="h-5 w-5 animate-spin text-white" />
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary via-acento-600 to-acento-400 text-white">
        <div className="px-4 pt-12 pb-10">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-white/60 text-caption capitalize">{todayFormatted}</p>
              <h1 className="text-title mt-0.5">
                {getGreeting()}, {firstName}!
              </h1>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-white hover:bg-white/15 rounded-full h-9 w-9"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 rounded-full h-9 w-9 relative">
                <Bell className="h-4.5 w-4.5" />
                {summaryData && summaryData.pending > 0 && (
                  <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-sinal-alerta" />
                )}
              </Button>
            </div>
          </div>

          {/* Next appointment chip */}
          {summaryData?.nextTime && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-chip px-3 py-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Próximo às {summaryData.nextTime}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content area with overlap */}
      <div className="w-full bg-background rounded-t-3xl -mt-5 pt-5 relative z-10 pb-[calc(72px+env(safe-area-inset-bottom,0px)+24px)]">
        
        {/* Summary Cards Row */}
        <div className="px-4 mb-5">
          <div className="grid grid-cols-3 gap-2.5">
            {summaryCards.map((card, i) => (
              <div
                key={i}
                className={`${card.bgClass} rounded-card p-3 flex flex-col items-center justify-center min-h-[76px] shadow-sm`}
              >
                <card.icon className={`h-5 w-5 ${card.colorClass} mb-1`} />
                <span className={`text-xl font-bold ${card.colorClass}`}>
                  {card.value}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  {card.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <MobileQuickActions clinicId={clinicId} />

        {/* Alerts */}
        <MobileAlerts clinicId={clinicId} pendingCount={summaryData?.pending || 0} />

        {/* Agenda List */}
        <MobileAgendaList clinicId={clinicId} />
      </div>
    </div>
  );
};

export default MobileHome;
