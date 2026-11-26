import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Logo } from "@/components/brand/Logo";
import { GRUPOS_NAVEGACAO, NAVEGACAO_RODAPE, type ItemNavegacao } from "@/lib/navegacao";

type NavItem = ItemNavegacao;
const navGroups = GRUPOS_NAVEGACAO;
const bottomNavigation = NAVEGACAO_RODAPE;

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
                "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
                active
                  ? "bg-card text-foreground font-medium shadow-sm ring-1 ring-sidebar-border [&>svg:first-child]:text-primary"
                  : "text-sidebar-foreground/70 hover:bg-bone-200/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0 stroke-[1.75]" />
              <span className="flex-1 text-left">{item.name}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-sidebar-foreground/40 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-[34px] mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
              {item.subItems.map((sub) => (
                <Link
                  key={sub.href}
                  to={sub.href}
                  className={cn(
                    "flex h-8 items-center rounded-md px-2.5 text-[13px] transition-colors duration-150",
                    isActive(sub.href)
                      ? "bg-card text-foreground font-medium ring-1 ring-sidebar-border"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-bone-200/60"
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
          "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
          active
            ? "bg-card text-foreground font-medium shadow-sm ring-1 ring-sidebar-border [&>svg:first-child]:text-primary"
            : "text-sidebar-foreground/70 hover:bg-bone-200/60 hover:text-sidebar-foreground"
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0 stroke-[1.75]" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex print:!hidden flex-col fixed left-0 top-[var(--faixa-h,0px)] bottom-0 z-40 w-[260px] border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center h-16 px-5 flex-shrink-0">
        <Link to="/dashboard">
          <Logo className="h-7" />
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 pb-4">
        <nav className="px-3">
          {isSuperAdmin && (
            <Link
              to="/super-admin"
              className={cn(
                "mb-1 flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
                "text-sidebar-foreground/70 hover:bg-bone-200/60 hover:text-sidebar-foreground"
              )}
            >
              <Shield className="h-4 w-4 flex-shrink-0 stroke-[1.75]" />
              <span>Super Admin</span>
            </Link>
          )}

          {navGroups.map((group, groupIndex) => {
            const visibleItems = group.items.filter(canAccess);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title} className={cn("space-y-0.5", groupIndex > 0 && "pt-4")}>
                <div className="px-2.5 pb-1.5 pt-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{group.title}</span>
                </div>
                {visibleItems.map(renderNavItem)}
              </div>
            );
          })}
        </nav>

        <div className="mx-5 my-4 border-t border-sidebar-border" />

        {/* Bottom items */}
        <nav className="space-y-0.5 px-3">
          {bottomNavigation.filter(canAccess).map(renderNavItem)}
        </nav>
      </ScrollArea>
    </aside>
  );
};

export default DesktopSidebar;
