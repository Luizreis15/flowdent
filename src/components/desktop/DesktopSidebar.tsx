import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Calendar,
  FileText,
  DollarSign,
  MessageSquare,
  Users,
  Sparkles,
  LayoutDashboard,
  Settings,
  FlaskConical,
  Package,
  User,
  Shield,
  SmilePlus,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Logo } from "@/components/brand/Logo";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  /** Permission resource required to see this item (checks 'visualizar' action) */
  permission?: string;
  subItems?: { name: string; href: string }[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "OPERACIONAL",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Agenda", href: "/dashboard/agenda", icon: Calendar, permission: "agenda" },
      { name: "Pacientes", href: "/dashboard/prontuario", icon: FileText, permission: "prontuario" },
    ],
  },
  {
    title: "CONTROLE CLÍNICO",
    items: [
      { name: "Ortodontia", href: "/dashboard/ortodontia", icon: SmilePlus, permission: "ortodontia" },
      { name: "Próteses", href: "/dashboard/proteses", icon: FlaskConical, permission: "proteses" },
      {
        name: "Estoque",
        href: "/dashboard/estoque",
        icon: Package,
        permission: "estoque",
        subItems: [
          { name: "Painel", href: "/dashboard/estoque" },
          { name: "Produtos", href: "/dashboard/produtos" },
          { name: "Movimentações", href: "/dashboard/movimentacoes" },
        ],
      },
    ],
  },
  {
    title: "GESTÃO E RELATÓRIOS",
    items: [
      { name: "Financeiro", href: "/dashboard/financeiro", icon: DollarSign, permission: "financeiro" },
      { name: "CRM", href: "/dashboard/crm", icon: MessageSquare, permission: "crm" },
      { name: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3, permission: "relatorios" },
    ],
  },
  {
    title: "FERRAMENTAS",
    items: [
      { name: "Portal Paciente", href: "/dashboard/portal-paciente", icon: Users, permission: "portal_paciente" },
      { name: "IA Assistente", href: "/dashboard/ia-assistente", icon: Sparkles, permission: "ia_assistente" },
    ],
  },
];

const bottomNavigation: NavItem[] = [
  { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings, permission: "configuracoes" },
  { name: "Meu Perfil", href: "/dashboard/perfil", icon: User },
];

const DesktopSidebar = () => {
  const location = useLocation();
  const { isSuperAdmin, canViewModule } = usePermissions();
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const canAccess = (item: NavItem) => {
    if (!item.permission) return true;
    return canViewModule(item.permission);
  };

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (item: NavItem) =>
    item.subItems?.some((sub) => location.pathname === sub.href) || location.pathname === item.href;

  const renderNavItem = (item: NavItem) => {
    const active = item.subItems ? isParentActive(item) : isActive(item.href);

    if (item.subItems) {
      const isOpen = openSubMenu === item.name || isParentActive(item);
      return (
        <Collapsible
          key={item.name}
          open={isOpen}
          onOpenChange={(open) => setOpenSubMenu(open ? item.name : null)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                "hover:bg-sidebar-accent",
                active
                  ? "border-l-[3px] border-l-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "border-l-[3px] border-l-transparent text-sidebar-foreground/70"
              )}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="flex-1 text-left">{item.name}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-9 mt-1 space-y-0.5">
              {item.subItems.map((sub) => (
                <Link
                  key={sub.href}
                  to={sub.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-[13px] transition-colors",
                    isActive(sub.href)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
          "hover:bg-sidebar-accent",
          active
            ? "border-l-[3px] border-l-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "border-l-[3px] border-l-transparent text-sidebar-foreground/70"
        )}
      >
        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-[260px] border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center h-16 px-5 border-b border-sidebar-border flex-shrink-0">
        <Link to="/dashboard">
          <Logo className="h-7" />
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-0.5 px-3">
          {isSuperAdmin && (
            <Link
              to="/super-admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm mb-2 transition-all",
                "bg-primary/5 border border-primary/15 hover:bg-primary/10",
                "border-l-[3px] border-l-primary text-primary font-medium"
              )}
            >
              <Shield className="h-[18px] w-[18px] flex-shrink-0" />
              <span>Super Admin</span>
            </Link>
          )}

          {navGroups.map((group, groupIndex) => {
            const visibleItems = group.items.filter(canAccess);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title} className="mb-3">
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[11px] font-semibold text-sidebar-foreground/40 tracking-wider uppercase">
                    {group.title}
                  </span>
                </div>
                {visibleItems.map(renderNavItem)}
                {groupIndex < navGroups.length - 1 && (
                  <div className="mx-4 mt-3 border-t border-sidebar-border" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Separator */}
        <div className="mx-5 my-3 border-t border-sidebar-border" />

        {/* Bottom items */}
        <nav className="space-y-0.5 px-3">
          {bottomNavigation.filter(canAccess).map(renderNavItem)}
        </nav>
      </ScrollArea>
    </aside>
  );
};

export default DesktopSidebar;
