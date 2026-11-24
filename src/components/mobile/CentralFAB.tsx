import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarPlus, UserPlus, DollarSign, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import NovoAgendamentoMobileModal from "@/components/agenda/NovoAgendamentoMobileModal";
import { useQueryClient } from "@tanstack/react-query";

const CentralFAB = () => {
  const [open, setOpen] = useState(false);
  const [agendamentoOpen, setAgendamentoOpen] = useState(false);
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();

  const actions = [
    {
      icon: CalendarPlus,
      label: "Novo Agendamento",
      description: "Agendar consulta ou procedimento",
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => {
        setOpen(false);
        setTimeout(() => setAgendamentoOpen(true), 200);
      },
    },
    {
      icon: UserPlus,
      label: "Novo Paciente",
      description: "Cadastrar um novo paciente",
      color: "text-sinal-ok",
      bgColor: "bg-sinal-ok/10",
      onClick: () => { navigate("/dashboard/prontuario"); setOpen(false); },
    },
    {
      icon: DollarSign,
      label: "Receber Pagamento",
      description: "Registrar recebimento",
      color: "text-green-600",
      bgColor: "bg-green-600/10",
      onClick: () => { navigate("/dashboard/financeiro"); setOpen(false); },
    },
    {
      icon: ClipboardList,
      label: "Novo Orçamento",
      description: "Criar orçamento para paciente",
      color: "text-sinal-espera",
      bgColor: "bg-sinal-espera/10",
      onClick: () => { navigate("/dashboard/prontuario"); setOpen(false); },
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className={cn(
              "relative -top-6 flex items-center justify-center",
              "h-14 w-14 rounded-full",
              "bg-primary text-primary-foreground",
              "shadow-lg shadow-primary/30",
              "transition-transform duration-200",
              "active:scale-95",
              open && "rotate-45"
            )}
          >
            <Plus className="h-7 w-7 transition-transform duration-200" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8">
          <SheetHeader className="pb-4">
            <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-4" />
            <SheetTitle className="text-center text-section">Ações Rápidas</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {actions.map((action, index) => (
              <button
                key={index}
                className="w-full flex items-center gap-4 h-16 px-4 rounded-btn press-scale hover:bg-muted/50 transition-colors"
                onClick={action.onClick}
              >
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0", action.bgColor)}>
                  <action.icon className={cn("h-5 w-5", action.color)} />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-body font-medium text-foreground">{action.label}</p>
                  <p className="text-caption text-muted-foreground truncate">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {clinicId && (
        <NovoAgendamentoMobileModal
          open={agendamentoOpen}
          onOpenChange={setAgendamentoOpen}
          clinicId={clinicId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["mobile-agenda"] });
          }}
        />
      )}
    </>
  );
};

export default CentralFAB;
