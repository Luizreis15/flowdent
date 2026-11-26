import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { GRUPOS_NAVEGACAO, NAVEGACAO_RODAPE, rotaAtiva, type ItemNavegacao } from "@/lib/navegacao";

interface MobileDrawerMenuProps {
  user?: { email?: string; full_name?: string } | null;
  onClose: () => void;
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
 * Menu "Mais" do celular: a mesma lista e as mesmas permissões da sidebar do desktop
 * (src/lib/navegacao.ts). Antes tinha a própria cópia, sem "Relatórios" e sem checar permissões.
 */
const MobileDrawerMenu = ({ user, onClose }: MobileDrawerMenuProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isSuperAdmin, canViewModule } = usePermissions();
  const pode = (item: ItemNavegacao) => !item.permission || canViewModule(item.permission);

  const sair = async () => {
    await supabase.auth.signOut();
    onClose();
    navigate("/");
  };

  const linha = (href: string, rotulo: string, Icone?: ItemNavegacao["icon"], recuo = false) => {
    const ativo = pathname === href || (!recuo && rotaAtiva(pathname, href));
    return (
      <Link
        key={href + rotulo}
        to={href}
        onClick={onClose}
        aria-current={ativo ? "page" : undefined}
        className={cn(
          "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          recuo && "ml-[34px] h-9 text-[13px]",
          ativo
            ? "bg-card font-medium text-foreground ring-1 ring-sidebar-border [&>svg]:text-primary"
            : "text-sidebar-foreground/75 hover:bg-bone-200/60 hover:text-sidebar-foreground",
        )}
      >
        {Icone && <Icone className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
        <span>{rotulo}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {iniciais(user?.full_name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{user?.full_name || "Usuário"}</p>
          {user?.email && <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="px-3 py-3" aria-label="Módulos">
          {isSuperAdmin && <div className="mb-1">{linha("/super-admin", "Super Admin", Shield)}</div>}
          {GRUPOS_NAVEGACAO.map((grupo, i) => {
            const itens = grupo.items.filter(pode);
            if (!itens.length) return null;
            return (
              <div key={grupo.title} className={cn("space-y-0.5", i > 0 && "pt-4")}>
                <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-sidebar-foreground/50">
                  {grupo.title}
                </p>
                {itens.map((item) => (
                  <div key={item.href} className="space-y-0.5">
                    {linha(item.href, item.name, item.icon)}
                    {item.subItems?.slice(1).map((sub) => linha(sub.href, sub.name, undefined, true))}
                  </div>
                ))}
              </div>
            );
          })}
          <div className="mt-4 space-y-0.5 border-t border-sidebar-border pt-3">
            {NAVEGACAO_RODAPE.filter(pode).map((item) => linha(item.href, item.name, item.icon))}
          </div>
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={sair}
          className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-sinal-alerta transition-colors duration-150 hover:bg-sinal-alerta-tenue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sair
        </button>
      </div>
    </div>
  );
};

export default MobileDrawerMenu;
