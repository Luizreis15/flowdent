import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Só os status que o banco aceita (CHECK em appointments.status). */
export type StatusAlteravel = "confirmed" | "cancelled";

const MENSAGEM: Record<StatusAlteravel, string> = {
  confirmed: "Consulta confirmada",
  cancelled: "Consulta cancelada",
};

/**
 * Confirma ou cancela uma consulta pelo celular e atualiza as listas da home e da agenda.
 * Antes a agenda do celular gravava "confirmado"/"cancelado" (em português), o banco recusava
 * e a tela não avisava; e os avisos diziam "o paciente será notificado", o que não acontece.
 */
/** O RLS de appointments já limita a alteração às consultas da clínica do usuário. */
export const useAlterarStatusConsulta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusAlteravel }) => {
      const alteracao: { status: string } = { status };
      const { error } = await supabase
        .from("appointments")
        .update(alteracao)
        .eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(MENSAGEM[status]);
      for (const chave of [
        "mobile-agenda",
        "mobile-agenda-hoje",
        "mobile-home-summary",
        "dashboard-agenda-table",
        "appointments-today",
      ]) {
        queryClient.invalidateQueries({ queryKey: [chave] });
      }
    },
    onError: () => toast.error("Não foi possível alterar a consulta. Tente de novo."),
  });
};
