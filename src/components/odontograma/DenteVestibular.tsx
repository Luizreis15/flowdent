import { useId } from "react";
import { cn } from "@/lib/utils";
import type { FaceStatus } from "./FaceOclusal";
import { ESCALA_ODONTOGRAMA, anatomiaDe, caminhoCoroa, caminhosRaizes, larguraDente } from "./anatomia";

/** As raízes são exibidas um pouco encurtadas para o odontograma caber sem rolagem. */
const RAIZ_EXIBIDA = 0.72;
const MARGEM = 0.6;

const COR_STATUS: Record<Exclude<FaceStatus, null>, string> = {
  a_realizar: "hsl(var(--clinico-a-realizar))",
  executado: "hsl(var(--clinico-executado))",
  existente: "hsl(var(--clinico-protese))",
};

interface DenteVestibularProps {
  numero: number;
  status: FaceStatus;
  onClick?: () => void;
  /** Para onde a coroa aponta. No odontograma, sempre para a fileira oclusal. */
  coroaPara: "baixo" | "cima";
  vista?: "vestibular" | "lingual";
  selecionado?: boolean;
}

export const DenteVestibular = ({
  numero,
  status,
  onClick,
  coroaPara,
  vista = "vestibular",
  selecionado = false,
}: DenteVestibularProps) => {
  const id = useId().replace(/:/g, "");
  const a = anatomiaDe(numero);
  const coroa = caminhoCoroa(a);
  const { posteriores, anteriores, tronco } = caminhosRaizes(a);

  const maiorRaiz = Math.max(...a.raizes.map((r) => r.comprimento ?? 1)) * a.raiz * RAIZ_EXIBIDA;
  const meiaLargura = a.largura / 2 + MARGEM;
  const topo = maiorRaiz + MARGEM;
  const base = a.coroa + MARGEM;
  const altura = topo + base;
  const paraCima = coroaPara === "cima";

  // viewBox no sistema "coroa para baixo"; para coroa para cima, o grupo é espelhado
  const viewBox = paraCima
    ? `${-meiaLargura} ${-base} ${meiaLargura * 2} ${altura}`
    : `${-meiaLargura} ${-topo} ${meiaLargura * 2} ${altura}`;

  const lingual = vista === "lingual";
  const anterior = a.tipo === "incisivo" || a.tipo === "canino";
  const corStatus = status ? COR_STATUS[status] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Dente ${numero}, vista ${vista}`}
      aria-pressed={selecionado}
      className={cn(
        "group flex shrink-0 justify-center rounded-md outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring",
        selecionado ? "bg-acao-tenue" : "hover:bg-muted/70",
      )}
      style={{ width: larguraDente(numero) }}
    >
      <svg
        viewBox={viewBox}
        width={meiaLargura * 2 * ESCALA_ODONTOGRAMA}
        height={altura * ESCALA_ODONTOGRAMA}
        className="overflow-visible"
        aria-hidden
      >
        <defs>
          {/* Somente a rampa bone da paleta fechada: o dente é neutro, a cor fica para o status */}
          <linearGradient id={`esmalte-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{ stopColor: "hsl(var(--bone-100))" }} />
            <stop offset="0.35" style={{ stopColor: "hsl(var(--bone-0))" }} />
            <stop offset="0.65" style={{ stopColor: lingual ? "hsl(var(--bone-50))" : "hsl(var(--bone-0))" }} />
            <stop offset="1" style={{ stopColor: lingual ? "hsl(var(--bone-200))" : "hsl(var(--bone-100))" }} />
          </linearGradient>
          <linearGradient id={`incisal-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0.6" style={{ stopColor: "hsl(var(--bone-200))", stopOpacity: 0 }} />
            <stop offset="1" style={{ stopColor: "hsl(var(--bone-200))", stopOpacity: anterior ? 0.5 : 0.25 }} />
          </linearGradient>
          <radialGradient id={`brilho-${id}`} cx="0.36" cy="0.3" r="0.42">
            <stop offset="0" style={{ stopColor: "hsl(var(--bone-0))", stopOpacity: 0.9 }} />
            <stop offset="1" style={{ stopColor: "hsl(var(--bone-0))", stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id={`raiz-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{ stopColor: "hsl(var(--bone-200))" }} />
            <stop offset="0.45" style={{ stopColor: "hsl(var(--bone-100))" }} />
            <stop offset="1" style={{ stopColor: "hsl(var(--bone-200))" }} />
          </linearGradient>
          <clipPath id={`coroa-${id}`}>
            <path d={coroa} />
          </clipPath>
        </defs>

        <g
          transform={paraCima ? "scale(1,-1)" : undefined}
          className="transition-[filter] duration-150 group-hover:brightness-[1.03]"
        >
          {/* Raízes: as palatinas/linguais atrás, mais escuras */}
          <g transform={`scale(1, ${RAIZ_EXIBIDA})`} style={{ stroke: "hsl(var(--bone-400))" }} strokeWidth={0.16} strokeLinejoin="round">
            {posteriores.map((d, i) => (
              <path key={`p${i}`} d={d} style={{ fill: "hsl(var(--bone-300))" }} />
            ))}
            {anteriores.map((d, i) => (
              <path key={`a${i}`} d={d} fill={`url(#raiz-${id})`} />
            ))}
            {tronco && (
              <>
                <path d={tronco.preenchimento} fill={`url(#raiz-${id})`} stroke="none" />
                <path d={tronco.contorno} fill="none" />
              </>
            )}
          </g>

          {/* Coroa em esmalte */}
          <path d={coroa} fill={`url(#esmalte-${id})`} />
          <g clipPath={`url(#coroa-${id})`}>
            <rect x={-meiaLargura} y={0} width={meiaLargura * 2} height={a.coroa + 1} fill={`url(#incisal-${id})`} />
            {lingual && anterior && (
              // cíngulo: a saliência no terço cervical da face lingual dos anteriores
              <ellipse cx={0} cy={a.coroa * 0.26} rx={a.colo * 0.34} ry={a.coroa * 0.17} style={{ fill: "hsl(var(--bone-200))" }} opacity={0.6} />
            )}
            {corStatus && (
              <rect
                x={-meiaLargura}
                y={-1}
                width={meiaLargura * 2}
                height={a.coroa + 2}
                style={{ fill: corStatus }}
              />
            )}
            <ellipse
              cx={-a.largura * 0.12}
              cy={a.coroa * 0.36}
              rx={a.largura * 0.3}
              ry={a.coroa * 0.34}
              fill={`url(#brilho-${id})`}
              opacity={corStatus ? 0.18 : lingual ? 0.45 : 0.8}
            />
          </g>
          <path
            d={coroa}
            fill="none"
            style={{ stroke: corStatus ?? "hsl(var(--bone-400))" }}
            strokeWidth={corStatus ? 0.3 : 0.18}
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </button>
  );
};
