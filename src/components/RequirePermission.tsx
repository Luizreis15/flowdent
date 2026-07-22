import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
}

/**
 * Gate de permissão para rotas filhas do DashboardShell.
 * Não remonta o shell — só bloqueia o miolo se faltar permissão.
 */
export default function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { can, loading } = usePermissions();

  if (loading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[240px] w-full" />
      </div>
    );
  }

  const [recurso, acao] = permission.split(".");
  if (!can(recurso, acao || "visualizar")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
