import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Permission {
  recurso: string;
  acao: string;
  permitido: boolean;
}

export const usePermissions = () => {
  const { perfil, isSuperAdmin, isAdmin, isLoading: authLoading, clinicId, user } = useAuth();

  const bypass = isSuperAdmin || isAdmin;
  const canFetch = !!user && !!clinicId && !!perfil && !bypass;

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ["clinic-permissions", clinicId, perfil],
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await supabase
        .from("clinic_permissions")
        .select("recurso, acao, permitido")
        .eq("clinic_id", clinicId!)
        .eq("perfil", perfil as any);

      if (error) throw error;
      return data || [];
    },
    enabled: canFetch,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const can = useCallback(
    (recurso: string, acao: string): boolean => {
      if (isSuperAdmin || isAdmin) return true;

      const perm = permissions.find(
        (p) => p.recurso === recurso && p.acao === acao
      );
      return perm?.permitido ?? false;
    },
    [permissions, isSuperAdmin, isAdmin]
  );

  const canViewModule = useCallback(
    (module: string): boolean => can(module, "visualizar"),
    [can]
  );

  return {
    perfil,
    permissions,
    can,
    canViewModule,
    hasPermission: can,
    isAdmin,
    isSuperAdmin,
    loading: authLoading || (canFetch && permsLoading),
  };
};
