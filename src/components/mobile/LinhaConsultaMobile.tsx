import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Check, MessageCircle, MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SeloStatus } from "@/components/sistema/SeloStatus";
import { CLASSE_BARRA, statusConsulta } from "@/lib/statusConsulta";
import { cn } from "@/lib/utils";
import { useAlterarStatusConsulta } from "@/hooks/useAlterarStatusConsulta";

/**
 * Colunas que a linha precisa (home e agenda do celular). appointments não tem clinic_id: a clínica vem do
 * paciente (patients!inner + filtro "patients.clinic_id"), como na agenda do desktop.
 * Tipada como string para o Supabase não expandir o tipo.
 */
export const COLUNAS_CONSULTA_MOBILE: string =
  "id, appointment_date, title, status, patient_id, patients!inner (full_name, clinic_id), profissionais (nome)";

export interface ConsultaMobile {
  id: string;
  appointment_date: string;
  title: string | null;
  status: string | null;
  patient_id: string;
  patients: { full_name: string } | null;
  profissionais: { nome: string } | null;
}

/**
 * Linha de consulta no celular, no padrão da agenda do desktop: hora, barra de status, paciente,
 * procedimento · profissional e selo. Substitui o cartão de deslizar, que cancelava a consulta
 * com um gesto, sem pedir confirmação.
 */
export const LinhaConsultaMobile = ({ consulta }: { consulta: ConsultaMobile }) => {
  const navigate = useNavigate();
  const alterar = useAlterarStatusConsulta();
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const { tom } = statusConsulta(consulta.status);
  const status = consulta.status || "scheduled";
  const encerrada = ["cancelled", "completed", "no_show"].includes(status);
  const nome = consulta.patients?.full_name || "Paciente";

  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <time className="w-11 shrink-0 text-sm text-muted-foreground tabular-nums">
        {format(parseISO(consulta.appointment_date), "HH:mm")}
      </time>
      <span className={cn("h-8 w-0.5 shrink-0 rounded-full", CLASSE_BARRA[tom])} aria-hidden />
      <button
        type="button"
        onClick={() => navigate(`/dashboard/prontuario/${consulta.patient_id}`)}
        className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium text-foreground">{nome}</span>
        <span className="block truncate text-[13px] text-muted-foreground">
          {[consulta.title, consulta.profissionais?.nome].filter(Boolean).join(" · ") || "—"}
        </span>
      </button>
      <SeloStatus status={consulta.status} className="shrink-0" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Ações da consulta de ${nome}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "scheduled" && (
            <DropdownMenuItem onClick={() => alterar.mutate({ id: consulta.id, status: "confirmed" })}>
              <Check className="mr-2 h-4 w-4" />
              Confirmar consulta
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate(`/dashboard/crm?patient=${consulta.patient_id}`)}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Enviar mensagem
          </DropdownMenuItem>
          {!encerrada && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sinal-alerta focus:text-sinal-alerta" onClick={() => setConfirmandoCancelamento(true)}>
                <X className="mr-2 h-4 w-4" />
                Cancelar consulta
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmandoCancelamento} onOpenChange={setConfirmandoCancelamento}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              {nome}, às {format(parseISO(consulta.appointment_date), "HH:mm")}. O paciente não é avisado
              automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => alterar.mutate({ id: consulta.id, status: "cancelled" })}
            >
              Cancelar consulta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
};
