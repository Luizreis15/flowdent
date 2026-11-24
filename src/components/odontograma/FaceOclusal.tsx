import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  ESCALA_ODONTOGRAMA,
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

export const FaceOclusal = ({ numero, faces, onFaceClick, selected = false }: FaceOclusalProps) => {
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
            <stop offset="0" stopColor="#fbf8f1" />
            <stop offset="0.7" stopColor="#efe7d7" />
            <stop offset="1" stopColor="#ddd1ba" />
          </radialGradient>
          <clipPath id={`contorno-${id}`}>
            <path d={contorno} />
          </clipPath>
        </defs>

        <path d={contorno} fill={`url(#oclusal-${id})`} />

        <g clipPath={`url(#contorno-${id})`}>
          {setores.map(({ face, d }) => (
            <path
              key={face}
              d={d}
              fill={preenchimento(face)}
              fillOpacity={faces[face] ? 0.8 : 1}
              stroke="#fffdf8"
              strokeWidth={0.22}
              className={cn("cursor-pointer transition-[fill,fill-opacity] duration-150", !faces[face] && "hover:fill-[#d8ccb6]")}
              onClick={() => onFaceClick(face)}
            >
              <title>{`Dente ${numero} — ${NOME_FACE[face]}`}</title>
            </path>
          ))}
          <path
            d={contorno}
            transform={mesa}
            fill={faces.oclusal ? COR_STATUS[faces.oclusal] : "#f6f1e6"}
            fillOpacity={faces.oclusal ? 0.85 : 1}
            stroke="#fffdf8"
            strokeWidth={0.4}
            className={cn("cursor-pointer transition-[fill] duration-150", !faces.oclusal && "hover:fill-[#e2d7c3]")}
            onClick={() => onFaceClick("oclusal")}
          >
            <title>{`Dente ${numero} — ${anterior ? "incisal" : "oclusal"}`}</title>
          </path>
          <path d={sulcos} fill="none" stroke="#a8946d" strokeWidth={0.2} strokeLinecap="round" opacity={0.7} pointerEvents="none" />
        </g>

        <path d={contorno} fill="none" stroke="#b8a785" strokeWidth={0.2} strokeLinejoin="round" pointerEvents="none" />
      </svg>
    </div>
  );
};
