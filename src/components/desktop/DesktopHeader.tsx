import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Search, User, LogOut, Settings, CreditCard } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DesktopHeaderProps {
  user?: {
    email?: string;
    full_name?: string;
  } | null;
  clinicName?: string;
}

const routeTitles: Record<string, { title: string; parent?: string }> = {
  "/dashboard": { title: "Dashboard" },
  "/dashboard/agenda": { title: "Agenda" },
  "/dashboard/prontuario": { title: "Pacientes" },
  "/dashboard/financeiro": { title: "Financeiro" },
  "/dashboard/proteses": { title: "Próteses" },
  "/dashboard/ortodontia": { title: "Ortodontia" },
  "/dashboard/estoque": { title: "Estoque" },
  "/dashboard/produtos": { title: "Produtos", parent: "Estoque" },
  "/dashboard/movimentacoes": { title: "Movimentações", parent: "Estoque" },
  "/dashboard/crm": { title: "CRM" },
  "/dashboard/portal-paciente": { title: "Portal do Paciente" },
  "/dashboard/ia-assistente": { title: "IA Assistente" },
  "/dashboard/configuracoes": { title: "Configurações" },
  "/dashboard/perfil": { title: "Meu Perfil" },
  "/dashboard/assinatura": { title: "Assinatura" },
  "/dashboard/relatorios": { title: "Relatórios" },
};

const DesktopHeader = ({ user, clinicName }: DesktopHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentRoute =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith("/dashboard/prontuario/")
      ? { title: "Ficha do paciente", parent: "Pacientes" }
      : { title: "Página" });
  const pageTitle = currentRoute.title;

  return (
    <header className="hidden lg:flex fixed top-[var(--faixa-h,0px)] left-[260px] right-0 z-30 h-16 items-center justify-between border-b border-border bg-background/90 px-8 backdrop-blur-sm">
      {/* Left: Title + Breadcrumb */}
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-[15px] font-medium leading-5 text-foreground">{pageTitle}</h1>
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            {currentRoute.parent && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-muted-foreground">
                    {currentRoute.parent}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            {location.pathname !== "/dashboard" && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs">{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar"
            className="pl-9 h-9 bg-card border-border text-sm"
          />
        </div>
      </div>

      {/* Right: Clinic + Notifications + Profile */}
      <div className="flex items-center gap-3">
        {clinicName && (
          <span className="text-xs text-muted-foreground font-medium hidden xl:block">
            {clinicName}
          </span>
        )}

        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-9">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium max-w-[120px] truncate">
                {user?.full_name || "Usuário"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => navigate("/dashboard/perfil")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/assinatura")} className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              Assinatura
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Logout realizado com sucesso!");
                navigate("/auth");
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DesktopHeader;
