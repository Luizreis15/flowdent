import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  /** Permission check: "recurso.acao" e.g. "financeiro.visualizar" */
  requiredPermission?: string;
}

export default function ProtectedRoute({ children, requiredRole, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, perfil, isSuperAdmin } = useAuth();
  const { can, loading: permLoading } = usePermissions();

  // Auth blocking; permissões só bloqueiam se a rota exige checagem aqui
  if (isLoading) return <PageLoader />;
  if (requiredPermission && permLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  if (requiredRole && requiredRole.length > 0) {
    const hasRole = isSuperAdmin || (perfil && requiredRole.includes(perfil));
    if (!hasRole) return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission) {
    const [recurso, acao] = requiredPermission.split(".");
    if (!can(recurso, acao || "visualizar")) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
