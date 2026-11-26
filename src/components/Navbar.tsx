import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/brand/Logo";

interface NavbarProps {
  user?: { email?: string; full_name?: string } | null;
}

const iniciais = (nome?: string) =>
  (nome || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Barra do topo no celular: logotipo e menu da conta. Antes "Perfil" levava a /dashboard/profile,
 * rota que não existe (a certa é /dashboard/perfil).
 */
const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();

  const sair = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:h-16">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo className="h-6" />
        </Link>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 rounded-full px-0.5 sm:pr-3" aria-label="Minha conta">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {iniciais(user.full_name)}
                </span>
                <span className="hidden text-sm sm:inline">{user.full_name || user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm font-medium text-foreground">{user.full_name || "Minha conta"}</span>
                {user.email && <span className="block truncate text-xs text-muted-foreground">{user.email}</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard/perfil")}>Meu perfil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/assinatura")}>Assinatura</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={sair} className="text-sinal-alerta focus:text-sinal-alerta">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => navigate("/auth")} size="sm">
            Entrar
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
