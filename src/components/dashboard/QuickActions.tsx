import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Package, Megaphone, MessageCircle, BarChart3, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const QuickActions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const actions = [
    { 
      icon: QrCode, 
      label: "Cobrança", 
      color: "text-accent",
      onClick: () => navigate("/dashboard/financeiro")
    },
    { 
      icon: Package, 
      label: "Estoque", 
      color: "text-secondary",
      onClick: () => navigate("/dashboard/estoque")
    },
    { 
      icon: Megaphone, 
      label: "Marketing", 
      color: "text-primary",
      onClick: () => navigate("/dashboard/crm")
    },
    { 
      icon: MessageCircle, 
      label: "WhatsApp", 
      color: "text-accent",
      onClick: () => navigate("/dashboard/crm")
    },
    { 
      icon: BarChart3, 
      label: "Relatórios", 
      color: "text-primary",
      onClick: () => toast({
        title: "Em breve",
        description: "Funcionalidade de relatórios em desenvolvimento"
      })
    },
    { 
      icon: MinusCircle, 
      label: "Despesa", 
      color: "text-destructive",
      onClick: () => navigate("/dashboard/financeiro")
    },
  ];

  return (
    <Card className="lg:block">
      <CardHeader className="p-2 lg:p-3 pb-1">
        <CardTitle className="text-xs font-medium">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="p-2 lg:p-3 pt-1">
        {/* Mobile: horizontal scroll | Desktop: grid */}
        <div className="flex lg:grid lg:grid-cols-2 gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={action.onClick}
              className="h-auto flex-shrink-0 flex flex-col items-center justify-center p-3 lg:p-2 min-w-[80px] lg:min-w-0 hover:border-primary hover:bg-accent/10 transition-colors cursor-pointer"
            >
              <action.icon className={`h-5 w-5 lg:h-4 lg:w-4 mb-1 ${action.color}`} />
              <span className="text-xs font-medium text-center leading-tight whitespace-nowrap">
                {action.label}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
