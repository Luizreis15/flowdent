import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import TrialBanner from "@/components/TrialBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { ModuleCards } from "@/components/dashboard/ModuleCards";
import { DashboardAgendaTable } from "@/components/dashboard/DashboardAgendaTable";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileHome from "@/pages/mobile/MobileHome";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { profile, clinicId: activeClinicId, isSuperAdmin, isLoading } = useAuth();
  const { status, trialEnd } = useSubscription();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 md:h-32" />
          ))}
        </div>
        <Skeleton className="h-[300px] md:h-[400px]" />
      </div>
    );
  }

  if (isMobile && activeClinicId) {
    return (
      <>
        {!isSuperAdmin && status === "trialing" && trialEnd && (
          <TrialBanner
            daysLeft={Math.ceil((new Date(trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
          />
        )}
        <MobileHome clinicId={activeClinicId} />
      </>
    );
  }


  return (
    <>
      {!isSuperAdmin && status === "trialing" && trialEnd && (
        <TrialBanner
          daysLeft={Math.ceil((new Date(trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
        />
      )}

      <div className="space-y-6">
        <CabecalhoPagina
          titulo={activeClinicId ? "Hoje" : "Painel Super Admin"}
          subtitulo={
            activeClinicId ? (
              <span className="first-letter:uppercase">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            ) : undefined
          }
        />

        {activeClinicId && (
          <>
            <DashboardMetrics clinicId={activeClinicId} />
            <div className="hidden lg:block">
              <DashboardAgendaTable clinicId={activeClinicId} />
            </div>
            <div className="lg:hidden">
              <ModuleCards />
            </div>
            <div>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                Alertas operacionais
              </h2>
              <DashboardAlerts clinicId={activeClinicId} />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;
