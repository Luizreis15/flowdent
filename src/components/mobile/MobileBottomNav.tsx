import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Home, Menu, Users, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { rotaAtiva } from "@/lib/navegacao";
import MobileDrawerMenu from "./MobileDrawerMenu";
import CentralFAB from "./CentralFAB";

const ITENS_ESQUERDA = [
  { nome: "Início", rota: "/dashboard", icone: Home },
  { nome: "Agenda", rota: "/dashboard/agenda", icone: Calendar },
];
const ITENS_DIREITA = [{ nome: "Pacientes", rota: "/dashboard/prontuario", icone: Users }];

const classeItem = (ativo: boolean) =>
  cn(
    "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    ativo ? "text-primary" : "text-muted-foreground",
  );

interface MobileBottomNavProps {
  user?: { email?: string; full_name?: string } | null;
}

/**
 * Barra inferior do celular: cinco itens na mesma linha, item ativo em tinta com um traço no topo.
 * Antes o item só ficava ativo na rota exata (a ficha de um paciente não marcava "Pacientes").
 */
const MobileBottomNav = ({ user }: MobileBottomNavProps) => {
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  const renderItem = (item: { nome: string; rota: string; icone: LucideIcon }) => {
    const ativo = rotaAtiva(pathname, item.rota);
    return (
      <Link key={item.rota} to={item.rota} className={cn(classeItem(ativo), "relative")} aria-current={ativo ? "page" : undefined}>
        {ativo && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" aria-hidden />}
        <span className="flex h-8 items-center">
          <item.icone className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="text-[11px] font-medium leading-none">{item.nome}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-16 items-stretch px-1">
        {ITENS_ESQUERDA.map(renderItem)}
        <CentralFAB />
        {ITENS_DIREITA.map(renderItem)}
        <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
          <SheetTrigger asChild>
            <button type="button" className={classeItem(false)}>
              <span className="flex h-8 items-center">
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="text-[11px] font-medium leading-none">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Todos os módulos do app</SheetDescription>
            <MobileDrawerMenu user={user} onClose={() => setMenuAberto(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
