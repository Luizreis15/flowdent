import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Package, 
  BarChart3, 
  MessageSquare,
  FileText,
  Settings,
  SmilePlus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  route: string;
}

const modules: Module[] = [
  {
    title: "Agenda",
    description: "Agende consultas, remarque e crie alertas de retorno.",
    icon: Calendar,
    iconBg: "bg-primary",
    route: "/dashboard/agenda"
  },
  {
    title: "Pacientes",
    description: "Visualize o prontuário dos pacientes e detalhes de tratamento.",
    icon: Users,
    iconBg: "bg-primary",
    route: "/dashboard/prontuario"
  },
  {
    title: "Financeiro",
    description: "Faça a gestão financeira, acompanhe entradas e saídas.",
    icon: DollarSign,
    iconBg: "bg-acento-600",
    route: "/dashboard/financeiro"
  },
  {
    title: "Estoque",
    description: "Controle seus produtos e movimentações de estoque.",
    icon: Package,
    iconBg: "bg-acento-600",
    route: "/dashboard/estoque"
  },
  {
    title: "Relatórios",
    description: "Acompanhe as métricas gerais da sua clínica.",
    icon: BarChart3,
    iconBg: "bg-acento-400",
    route: "/dashboard/financeiro"
  },
  {
    title: "Marketing",
    description: "Gerencie campanhas e comunicação com pacientes.",
    icon: MessageSquare,
    iconBg: "bg-acento-400",
    route: "/dashboard/crm"
  },
  {
    title: "Próteses",
    description: "Controle pedidos e acompanhe entregas de laboratórios.",
    icon: FileText,
    iconBg: "bg-bone-300",
    route: "/dashboard/proteses"
  },
  {
    title: "Ortodontia",
    description: "Acompanhe casos ortodônticos, alinhadores e manutenções.",
    icon: SmilePlus,
    iconBg: "bg-primary",
    route: "/dashboard/ortodontia"
  },
  {
    title: "Configurações",
    description: "Ajuste preferências e configurações do sistema.",
    icon: Settings,
    iconBg: "bg-muted-foreground",
    route: "/dashboard/configuracoes"
  }
];

interface ModuleCardProps {
  module: Module;
}

const ModuleCard = ({ module }: ModuleCardProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="bg-card hover:shadow-lg transition-all duration-300 cursor-pointer group border border-border/50 hover:border-border"
      onClick={() => navigate(module.route)}
    >
      <CardContent className="p-5 lg:p-6">
        {/* Ícone em círculo */}
        <div className={cn(
          "w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center mb-4",
          module.iconBg
        )}>
          <module.icon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
        </div>
        
        {/* Título */}
        <h3 className="text-base lg:text-lg font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
          {module.title}
        </h3>
        
        {/* Descrição */}
        <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2">
          {module.description}
        </p>
      </CardContent>
    </Card>
  );
};

export const ModuleCards = () => {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Primeira linha: 4 módulos principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {modules.slice(0, 4).map(module => (
          <ModuleCard key={module.title} module={module} />
        ))}
      </div>
      
      {/* Segunda linha: 5 módulos secundários */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-5">
        {modules.slice(4).map(module => (
          <ModuleCard key={module.title} module={module} />
        ))}
      </div>
    </div>
  );
};

export default ModuleCards;
