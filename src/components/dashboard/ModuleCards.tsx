import { Link } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  DollarSign,
  FlaskConical,
  MessageSquare,
  Package,
  Settings,
  SmilePlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface Modulo {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  rota: string;
  permissao?: string;
}

const MODULOS: Modulo[] = [
  { titulo: "Agenda", descricao: "Consultas, remarcações e retornos", icone: Calendar, rota: "/dashboard/agenda", permissao: "agenda" },
  { titulo: "Pacientes", descricao: "Prontuário e tratamentos", icone: Users, rota: "/dashboard/prontuario", permissao: "prontuario" },
  { titulo: "Financeiro", descricao: "Recebimentos, contas e fluxo de caixa", icone: DollarSign, rota: "/dashboard/financeiro", permissao: "financeiro" },
  { titulo: "Estoque", descricao: "Produtos e movimentações", icone: Package, rota: "/dashboard/estoque", permissao: "estoque" },
  { titulo: "Relatórios", descricao: "Indicadores da clínica", icone: BarChart3, rota: "/dashboard/relatorios", permissao: "relatorios" },
  { titulo: "CRM", descricao: "Leads e conversas com pacientes", icone: MessageSquare, rota: "/dashboard/crm", permissao: "crm" },
  { titulo: "Próteses", descricao: "Pedidos e entregas de laboratório", icone: FlaskConical, rota: "/dashboard/proteses", permissao: "proteses" },
  { titulo: "Ortodontia", descricao: "Casos, alinhadores e manutenções", icone: SmilePlus, rota: "/dashboard/ortodontia", permissao: "ortodontia" },
  { titulo: "Configurações", descricao: "Clínica, equipe e cadastros", icone: Settings, rota: "/dashboard/configuracoes", permissao: "configuracoes" },
];

/**
 * Atalhos para os módulos (tablet e celular). Cartões brancos com borda fina e ícone neutro,
 * só com os módulos que o usuário pode ver. Antes "Relatórios" levava ao Financeiro.
 */
export const ModuleCards = ({ limite, className }: { limite?: number; className?: string }) => {
  const { canViewModule } = usePermissions();
  const visiveis = MODULOS.filter((m) => !m.permissao || canViewModule(m.permissao)).slice(0, limite);

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3", className)}>
      {visiveis.map((m) => (
        <Link
          key={m.titulo}
          to={m.rota}
          className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <m.icone className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{m.titulo}</span>
            <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted-foreground">{m.descricao}</span>
          </span>
        </Link>
      ))}
    </div>
  );
};

export default ModuleCards;
