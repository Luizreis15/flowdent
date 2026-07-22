import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const ContentFallback = () => (
  <div className="space-y-4 py-2">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-[320px] w-full" />
  </div>
);

/**
 * Layout persistente do app: sidebar/header ficam montados;
 * só o miolo (<Outlet />) troca entre rotas do /dashboard.
 */
const DashboardShell = () => {
  const { profile } = useAuth();

  return (
    <DashboardLayout user={profile}>
      <Suspense fallback={<ContentFallback />}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  );
};

export default DashboardShell;
