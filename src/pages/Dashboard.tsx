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
        <MobileHome user={profile} clinicId={activeClinicId} />
      </>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  return (
    <>
      {!isSuperAdmin && status === "trialing" && trialEnd && (
        <TrialBanner
          daysLeft={Math.ceil((new Date(trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
        />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
            {isSuperAdmin
              ? "Painel Super Admin"
              : `${getGreeting()}, ${firstName}`}
          </h1>
          {!isSuperAdmin && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Confira o resumo do dia da sua clínica.
            </p>
          )}
        </div>

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
              <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Alertas Operacionais
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
