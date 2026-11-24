import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  ESCALA_ODONTOGRAMA,
  type CondicaoDente,
  anatomiaDe,
  caminhoOclusal,
  caminhoSulcos,
  ehSuperior,
  larguraDente,
  mesialADireita,
} from "./anatomia";

export type FaceStatus = "a_realizar" | "executado" | "existente" | null;

type Face = "vestibular" | "mesial" | "distal" | "oclusal" | "palatina";

interface FaceOclusalProps {
  numero: number;
  faces: Record<Face, FaceStatus>;
  onFaceClick: (face: string) => void;
  selected?: boolean;
  condicao?: CondicaoDente | null;
}

const COR_STATUS: Record<Exclude<FaceStatus, null>, string> = {
  a_realizar: "hsl(var(--clinico-a-realizar))",
  executado: "hsl(var(--clinico-executado))",
  existente: "hsl(var(--clinico-protese))",
};

const NOME_FACE: Record<Face, string> = {
  vestibular: "vestibular",
  mesial: "mesial",
  distal: "distal",
  oclusal: "oclusal",
  palatina: "palatina/lingual",
};

const MARGEM = 0.7;

export const FaceOclusal = ({ numero, faces, onFaceClick, selected = false, condicao = null }: FaceOclusalProps) => {
  const id = useId().replace(/:/g, "");
  const a = anatomiaDe(numero);
  const contorno = caminhoOclusal(a);
  const sulcos = caminhoSulcos(a);
  const anterior = a.tipo === "incisivo" || a.tipo === "canino";

  const w = a.largura / 2 + MARGEM;
  const h = a.profundidade / 2 + MARGEM;
  const W = w * 1.6;
  const H = h * 1.6;

  // Orientação clínica: a vestibular fica voltada para a fileira vestibular da mesma arcada,
  // e a mesial aponta para a linha média.
  const vestibularEmCima = ehSuperior(numero);
  const mesialDireita = mesialADireita(numero);
  const setores: { face: Face; d: string }[] = [
    { face: vestibularEmCima ? "vestibular" : "palatina", d: `M ${-W} ${-H} L ${W} ${-H} L 0 0 Z` },
    { face: vestibularEmCima ? "palatina" : "vestibular", d: `M ${-W} ${H} L ${W} ${H} L 0 0 Z` },
    { face: mesialDireita ? "distal" : "mesial", d: `M ${-W} ${-H} L ${-W} ${H} L 0 0 Z` },
    { face: mesialDireita ? "mesial" : "distal", d: `M ${W} ${-H} L ${W} ${H} L 0 0 Z` },
  ];
  // mesa oclusal (ou borda incisal nos anteriores), clicável por cima dos setores
  const mesa = anterior ? "scale(0.62, 0.34)" : "scale(0.5, 0.5)";

  const preenchimento = (face: Face) => {
    const s = faces[face];
    return s ? COR_STATUS[s] : "transparent";
  };

  return (
    <div
      className={cn("flex shrink-0 justify-center rounded-md transition-colors duration-150", selected && "bg-acao-tenue")}
      style={{ width: larguraDente(numero) }}
    >
      <svg
        viewBox={`${-w} ${-h} ${w * 2} ${h * 2}`}
        width={w * 2 * ESCALA_ODONTOGRAMA}
        height={h * 2 * ESCALA_ODONTOGRAMA}
        className="overflow-visible"
        role="group"
        aria-label={`Dente ${numero}, faces`}
      >
        <defs>
          <radialGradient id={`oclusal-${id}`} cx="0.42" cy="0.4" r="0.7">
            <stop offset="0" style={{ stopColor: "hsl(var(--bone-0))" }} />
            <stop offset="0.7" style={{ stopColor: "hsl(var(--bone-50))" }} />
            <stop offset="1" style={{ stopColor: "hsl(var(--bone-200))" }} />
          </radialGradient>
          <clipPath id={`contorno-${id}`}>
            <path d={contorno} />
          </clipPath>
        </defs>

        <path d={contorno} fill={`url(#oclusal-${id})`} />

        <g clipPath={`url(#contorno-${id})`} opacity={condicao === "ausente" ? 0.32 : 1}>
          {setores.map(({ face, d }) => (
            <path
              key={face}
              d={d}
              style={{ fill: preenchimento(face), stroke: "hsl(var(--bone-0))" }}
              strokeWidth={0.22}
              className={cn("cursor-pointer transition-[fill] duration-150", !faces[face] && "hover:!fill-bone-200")}
              onClick={() => onFaceClick(face)}
            >
              <title>{`Dente ${numero} — ${NOME_FACE[face]}`}</title>
            </path>
          ))}
          <path
            d={contorno}
            transform={mesa}
            style={{ fill: faces.oclusal ? COR_STATUS[faces.oclusal] : "hsl(var(--bone-50))", stroke: "hsl(var(--bone-0))" }}
            strokeWidth={0.4}
            className={cn("cursor-pointer transition-[fill] duration-150", !faces.oclusal && "hover:!fill-bone-200")}
            onClick={() => onFaceClick("oclusal")}
          >
            <title>{`Dente ${numero} — ${anterior ? "incisal" : "oclusal"}`}</title>
          </path>
          <path d={sulcos} fill="none" style={{ stroke: "hsl(var(--bone-400))" }} strokeWidth={0.2} strokeLinecap="round" pointerEvents="none" />
        </g>

        <path d={contorno} fill="none" style={{ stroke: "hsl(var(--bone-400))" }} strokeWidth={0.2} strokeLinejoin="round" pointerEvents="none" />

        {(condicao === "implante" || condicao === "implante_indicado") && (
          // plataforma do implante vista de cima
          <circle
            r={Math.min(w, h) * 0.32}
            fill="none"
            style={{ stroke: condicao === "implante" ? "hsl(var(--bone-600))" : "hsl(var(--clinico-a-realizar))" }}
            strokeWidth={0.35}
            strokeDasharray={condicao === "implante_indicado" ? "0.6 0.4" : undefined}
            pointerEvents="none"
          />
        )}
        {(condicao === "ausente" || condicao === "extracao_indicada") && (
          <g
            style={{ stroke: condicao === "ausente" ? "hsl(var(--clinico-ausente))" : "hsl(var(--clinico-a-realizar))" }}
            strokeWidth={0.45}
            strokeLinecap="round"
            pointerEvents="none"
          >
            <line x1={-w * 0.75} y1={-h * 0.75} x2={w * 0.75} y2={h * 0.75} />
            <line x1={w * 0.75} y1={-h * 0.75} x2={-w * 0.75} y2={h * 0.75} />
          </g>
        )}
      </svg>
    </div>
  );
};
