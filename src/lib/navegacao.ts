import {
  BarChart3,
  Calendar,
  DollarSign,
  FileText,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  SmilePlus,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Navegação do app num lugar só: a sidebar do desktop e o menu "Mais" do celular usam esta lista.
 * Antes o menu do celular tinha a própria cópia e já tinha perdido "Relatórios".
 */
export interface ItemNavegacao {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Recurso de permissão necessário para ver o item (ação "visualizar") */
  permission?: string;
  subItems?: { name: string; href: string }[];
}

export interface GrupoNavegacao {
  title: string;
  items: ItemNavegacao[];
}

export const GRUPOS_NAVEGACAO: GrupoNavegacao[] = [
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
      { name: "Portal do paciente", href: "/dashboard/portal-paciente", icon: Users, permission: "portal_paciente" },
    ],
  },
];

export const NAVEGACAO_RODAPE: ItemNavegacao[] = [
  { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings, permission: "configuracoes" },
  { name: "Meu perfil", href: "/dashboard/perfil", icon: User },
];

/** Rota ativa: a própria ou uma filha (ex.: /dashboard/prontuario/123 ativa "Pacientes"). */
export const rotaAtiva = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
