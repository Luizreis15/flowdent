import { useState, useEffect } from "react";
import Agenda from "./Agenda";
import MobileAgenda from "@/pages/mobile/MobileAgenda";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import NovoAgendamentoMobileModal from "@/components/agenda/NovoAgendamentoMobileModal";
import { useQueryClient } from "@tanstack/react-query";

const AgendaWrapper = () => {
  const isMobile = useIsMobile();
  const { clinicId, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNewAppointment = searchParams.get("new") === "true";
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isMobile && isNewAppointment && clinicId) {
      setMobileModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [isMobile, isNewAppointment, clinicId, setSearchParams]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (isMobile && clinicId) {
    return (
      <>
        <MobileAgenda clinicId={clinicId} />
        <NovoAgendamentoMobileModal
          open={mobileModalOpen}
          onOpenChange={setMobileModalOpen}
          clinicId={clinicId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["mobile-agenda"] });
          }}
        />
      </>
    );
  }

  return <Agenda />;
};

export default AgendaWrapper;
