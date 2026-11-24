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
          <linearGradient id={`esmalte-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={lingual ? "#ddd2bd" : "#e4dac6"} />
            <stop offset="0.32" stopColor={lingual ? "#f3ecdf" : "#faf6ee"} />
            <stop offset="0.6" stopColor={lingual ? "#efe7d8" : "#f6f0e4"} />
            <stop offset="1" stopColor={lingual ? "#d6c9b1" : "#ddd1bb"} />
          </linearGradient>
          <linearGradient id={`incisal-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#c9d3da" stopOpacity={anterior ? 0.55 : 0.2} />
          </linearGradient>
          <radialGradient id={`brilho-${id}`} cx="0.36" cy="0.3" r="0.42">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`raiz-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#d9c6a2" />
            <stop offset="0.45" stopColor="#efe3cb" />
            <stop offset="1" stopColor="#d2bd96" />
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
          <g transform={`scale(1, ${RAIZ_EXIBIDA})`} stroke="#b9a37c" strokeWidth={0.16} strokeLinejoin="round">
            {posteriores.map((d, i) => (
              <path key={`p${i}`} d={d} fill="#cdb78f" opacity={0.85} />
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
              <ellipse cx={0} cy={a.coroa * 0.26} rx={a.colo * 0.34} ry={a.coroa * 0.17} fill="#d8ccb4" opacity={0.42} />
            )}
            {corStatus && (
              <rect
                x={-meiaLargura}
                y={-1}
                width={meiaLargura * 2}
                height={a.coroa + 2}
                fill={corStatus}
                opacity={0.78}
                style={{ mixBlendMode: "multiply" }}
              />
            )}
            <ellipse
              cx={-a.largura * 0.12}
              cy={a.coroa * 0.36}
              rx={a.largura * 0.3}
              ry={a.coroa * 0.34}
              fill={`url(#brilho-${id})`}
              opacity={lingual ? 0.45 : 0.8}
            />
          </g>
          <path
            d={coroa}
            fill="none"
            stroke={corStatus ?? "#b8a785"}
            strokeOpacity={corStatus ? 0.9 : 1}
            strokeWidth={corStatus ? 0.3 : 0.18}
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </button>
  );
};
