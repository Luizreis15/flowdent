import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CLASSE_SELO, type TomStatus } from "@/lib/statusConsulta";

/**
 * Selo genérico (ativo/inativo, tipo, perfil): fundo tênue e texto na cor do tom,
 * nos mesmos tons do selo de status de consulta.
 */
export const Selo = ({
  tom = "neutro",
  children,
  className,
}: {
  tom?: TomStatus;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      CLASSE_SELO[tom],
      className,
    )}
  >
    {children}
  </span>
);

/** Selo de cadastro ativo/inativo. */
export const SeloAtivo = ({ ativo, className }: { ativo: boolean | null | undefined; className?: string }) => (
  <Selo tom={ativo ? "ok" : "neutro"} className={className}>
    {ativo ? "Ativo" : "Inativo"}
  </Selo>
);
