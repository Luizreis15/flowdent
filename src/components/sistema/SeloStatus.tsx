import { cn } from "@/lib/utils";
import { CLASSE_SELO, statusConsulta } from "@/lib/statusConsulta";

/** Selo de status de consulta: fundo tênue, texto na cor do sinal. */
export const SeloStatus = ({ status, className }: { status?: string | null; className?: string }) => {
  const { rotulo, tom } = statusConsulta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CLASSE_SELO[tom],
        className,
      )}
    >
      {rotulo}
    </span>
  );
};
