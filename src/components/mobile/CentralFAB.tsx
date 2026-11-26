import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, DollarSign, Plus, UserPlus, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import NovoAgendamentoMobileModal from "@/components/agenda/NovoAgendamentoMobileModal";

interface Acao {
  icone: LucideIcon;
  rotulo: string;
  descricao: string;
  aoEscolher: () => void;
}

/**
 * Botão "Novo" da barra inferior: abre a folha de ações rápidas.
 * Antes flutuava acima da barra com sombra colorida, cada ação tinha uma cor e "Novo orçamento"
 * só abria a lista de pacientes; agora o botão fica na linha da barra e as ações dizem para onde levam.
 */
const CentralFAB = () => {
  const [aberto, setAberto] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();

  const ir = (rota: string) => {
    setAberto(false);
    navigate(rota);
  };

  const acoes: Acao[] = [
    {
      icone: CalendarPlus,
      rotulo: "Nova consulta",
      descricao: "Agendar consulta ou procedimento",
      aoEscolher: () => {
        setAberto(false);
        setTimeout(() => setAgendando(true), 200);
      },
    },
    { icone: UserPlus, rotulo: "Novo paciente", descricao: "Abre a lista de pacientes para cadastrar", aoEscolher: () => ir("/dashboard/prontuario") },
    { icone: DollarSign, rotulo: "Registrar recebimento", descricao: "Abre o financeiro", aoEscolher: () => ir("/dashboard/financeiro") },
  ];

  return (
    <>
      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Novo"
            className="flex flex-1 flex-col items-center justify-center gap-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="flex h-8 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium leading-none text-muted-foreground">Novo</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-lg px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
          <SheetHeader className="pb-2 text-left">
            <SheetTitle className="text-section">Novo</SheetTitle>
            <SheetDescription className="sr-only">Ações rápidas</SheetDescription>
          </SheetHeader>
          <ul className="divide-y">
            {acoes.map((a) => (
              <li key={a.rotulo}>
                <button
                  type="button"
                  onClick={a.aoEscolher}
                  className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <a.icone className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{a.rotulo}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">{a.descricao}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>

      {clinicId && (
        <NovoAgendamentoMobileModal
          open={agendando}
          onOpenChange={setAgendando}
          clinicId={clinicId}
          onSuccess={() => {
            for (const chave of ["mobile-agenda", "mobile-agenda-hoje", "dashboard-agenda-table"]) {
              queryClient.invalidateQueries({ queryKey: [chave] });
            }
          }}
        />
      )}
    </>
  );
};

export default CentralFAB;
