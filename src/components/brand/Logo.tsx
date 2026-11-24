import { cn } from "@/lib/utils";

/**
 * Marca Flowdent em SVG, desenhada com os tokens do sistema (nada de hex).
 *
 * - "padrao":  tinta-700 + w em acento-600. Fundo claro.
 * - "inverso": bone-50 + w em acento-400. Fundo escuro.
 * - "mono":    uma cor só, herdada de `currentColor` (a cor vem do className).
 *              Para impressão e para qualquer lugar que exija chapado.
 *
 * Os caminhos vêm da prancheta de identidade 1.0. O "fl" é uma ligadura única
 * (o arco do f segue até a haste do l), e o "w" é a única letra com cor.
 */
export type VarianteLogo = "padrao" | "inverso" | "mono";

interface LogoProps {
  variante?: VarianteLogo;
  className?: string;
}

const COR_PRINCIPAL: Record<VarianteLogo, string> = {
  padrao: "text-tinta-700 dark:text-bone-50",
  inverso: "text-bone-50",
  mono: "",
};

const COR_ACENTO: Record<VarianteLogo, string> = {
  padrao: "text-acento-600 dark:text-acento-400",
  inverso: "text-acento-400",
  mono: "",
};

const FL = "M2 38H12V28Q12 3 39 3H74V102H52V23H39Q33 23 33 30V38H46V56H33V102H12V56H2Z";
const O = "M34 0C80 0 80 70 34 70C-12 70 -12 0 34 0ZM34 19C14 19 14 51 34 51C54 51 54 19 34 19Z";
const W = "M0 0H20L29 39L39 10Q41 5 47 5H55L68 39L78 0H98L80 58Q77 69 69 69Q60 69 57 60L48 34L39 60Q36 69 28 69Q19 69 16 58Z";
const D = "M50 3H72V102H52V96Q44 104 31 104C-10 104 -10 32 31 32Q43 32 50 39ZM36 52C17 52 17 84 36 84C55 84 55 52 36 52Z";
const E = "M67 42H22Q25 55 39 54Q48 54 53 49L66 60Q56 71 37 71C-12 71 -11 0 35 0Q69 0 67 42ZM21 28H47Q46 16 35 16Q24 16 21 28Z";
const N = "M0 1H21V9Q29 0 42 0Q66 0 66 27V69H44V32Q44 19 33 19Q22 19 22 33V69H0Z";
const T = "M10 13H32V34H50V52H32V75Q32 86 43 85L51 84V101Q45 104 37 104Q10 104 10 78V52H0V34H10Z";

export function Logo({ variante = "padrao", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 512 107"
      role="img"
      aria-label="Flowdent"
      className={cn("block h-9 w-auto", COR_PRINCIPAL[variante], className)}
      style={{ aspectRatio: "512 / 107" }}
    >
      <g>
        <path fill="currentColor" fillRule="evenodd" d={FL} />
        <path fill="currentColor" fillRule="evenodd" d={O} transform="translate(79 33)" />
        <path fill="currentColor" fillRule="evenodd" d={W} transform="translate(143 34)" className={COR_ACENTO[variante]} />
        <path fill="currentColor" fillRule="evenodd" d={D} transform="translate(239 0)" />
        <path fill="currentColor" fillRule="evenodd" d={E} transform="translate(317 33)" />
        <path fill="currentColor" fillRule="evenodd" d={N} transform="translate(389 33)" />
        <path fill="currentColor" fillRule="evenodd" d={T} transform="translate(458 0)" />
      </g>
    </svg>
  );
}

/** Monograma "fl" — para espaços em que o nome já aparece ao lado, ou cabe pouco. */
export function LogoSimbolo({ variante = "padrao", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 76 105"
      role="img"
      aria-label="Flowdent"
      className={cn("block h-8 w-auto", COR_PRINCIPAL[variante], className)}
      style={{ aspectRatio: "76 / 105" }}
    >
      <path fill="currentColor" fillRule="evenodd" d={FL} />
    </svg>
  );
}
