import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Shield, LayoutDashboard, FileText, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/brand/Logo";

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isSuperAdmin, isLoading: loading } = useAuth();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isSuperAdmin, loading, navigate, toast]);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        if (profile) setUserName(profile.full_name);
      }
    };
    loadUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col gap-3">
            <Logo className="h-7" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground">Super Admin</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link to="/super-admin">
            <Button
              variant={isActive("/super-admin") ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Visão Geral
            </Button>
          </Link>
          
          <Link to="/super-admin/planos">
            <Button
              variant={isActive("/super-admin/planos") ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <Shield className="mr-2 h-4 w-4" />
              Planos & Assinaturas
            </Button>
          </Link>

          <Link to="/super-admin/modulos">
            <Button
              variant={isActive("/super-admin/modulos") ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <Shield className="mr-2 h-4 w-4" />
              Módulos & Feature Flags
            </Button>
          </Link>

          <Link to="/super-admin/anamnese">
            <Button
              variant={isActive("/super-admin/anamnese") ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              Modelos & Templates
            </Button>
          </Link>

          <Link to="/super-admin/locatarios">
            <Button
              variant={isActive("/super-admin/locatarios") ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <Shield className="mr-2 h-4 w-4" />
              Locatários (Clínicas)
            </Button>
          </Link>

          <Link to="/super-admin/auditoria">
            <Button
              variant={isActive("/super-admin/auditoria") ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <Shield className="mr-2 h-4 w-4" />
              Auditoria
            </Button>
          </Link>

          <div className="my-4 border-t border-border"></div>
          
          <Link to="/dashboard">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-primary"
              size="sm"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Acessar Sistema Principal
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-2 text-sm text-muted-foreground">
            {userName}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
