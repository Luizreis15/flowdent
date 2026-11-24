import { ReactNode, useState, useEffect, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Navbar from "./Navbar";
import MobileBottomNav from "./mobile/MobileBottomNav";
import DesktopSidebar from "./desktop/DesktopSidebar";
import DesktopHeader from "./desktop/DesktopHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImpersonationState {
  clinicId: string;
  clinicName: string;
  startedAt: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  user?: {
    email?: string;
    full_name?: string;
  } | null;
}

const DashboardLayout = ({ children, user }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null);
  
  const isHomePage = location.pathname === "/dashboard";

  useEffect(() => {
    const stored = localStorage.getItem("admin_impersonation");
    if (stored) {
      setImpersonation(JSON.parse(stored));
    }
  }, []);

  const handleEndImpersonation = async () => {
    const stored = localStorage.getItem("admin_impersonation");
    if (stored) {
      const state = JSON.parse(stored) as ImpersonationState;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_impersonation_logs").update({
          ended_at: new Date().toISOString()
        }).match({
          admin_user_id: user.id,
          impersonated_clinic_id: state.clinicId,
          ended_at: null
        });
      }
    }
    localStorage.removeItem("admin_impersonation");
    setImpersonation(null);
    toast.success("Impersonação encerrada");
    navigate("/admin/clinics");
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{ "--faixa-h": impersonation ? "44px" : "0px" } as CSSProperties}
    >
      {/* Impersonation Banner */}
      {impersonation && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex h-11 print:hidden items-center justify-between border-b border-sinal-espera/20 bg-sinal-espera-tenue px-4 text-sinal-espera">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">
              Visualizando como {impersonation.clinicName}
            </span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-sinal-espera/25 bg-transparent text-sinal-espera hover:bg-sinal-espera/10"
              onClick={() => navigate("/admin/clinics")}
            >
              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              <span className="hidden md:inline">Voltar ao Admin</span>
              <span className="md:hidden">Admin</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-sinal-espera hover:bg-sinal-espera/10 hover:text-sinal-espera"
              onClick={handleEndImpersonation}
            >
              <X className="h-4 w-4" />
              <span className="hidden md:inline ml-1">Encerrar</span>
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Navbar - hidden on home page since MobileHome has its own hero header */}
      {!isHomePage && (
        <div className="lg:hidden print:hidden">
          <Navbar user={user} />
        </div>
      )}

      {/* Desktop Sidebar (fixed 260px) */}
      <DesktopSidebar />

      {/* Desktop Header (fixed 64px) */}
      <DesktopHeader user={user} clinicName={impersonation?.clinicName} />

      <div className={cn(
        "flex",
        impersonation ? "lg:pt-[44px]" : "lg:pt-0",
        isHomePage ? "pt-0" : (impersonation ? "pt-[104px]" : "pt-16")
      )}>
        {/* Main content */}
        <main className={cn(
          "flex-1 min-w-0",
          "lg:ml-[260px] lg:mt-16 print:!m-0 print:!p-0",
          "pb-[calc(72px+env(safe-area-inset-bottom,0px)+8px)] lg:pb-4"
        )}>
          <div className={cn(
            "w-full min-w-0 mx-auto min-h-0 overflow-y-auto overflow-x-hidden max-w-[1600px]",
            isHomePage ? "px-0 lg:p-8" : "px-4 lg:p-8"
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="print:hidden">
        <MobileBottomNav user={user} />
      </div>
    </div>
  );
};

export default DashboardLayout;
