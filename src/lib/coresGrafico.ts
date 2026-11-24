/**
 * Cores de gráfico, só com tokens da paleta fechada. Regra: uma série em destaque
 * (a marca), as demais em passos neutros; cor semântica só quando o dado é um sinal.
 * Valores como `hsl(var(--token))` funcionam em fill/stroke do Recharts.
 */
const token = (nome: string) => `hsl(var(--${nome}))`;

export const CORES_GRAFICO = {
  /** Série principal: a que importa no gráfico */
  destaque: token("tinta-700"),
  /** Segunda série, quando precisa ser distinguível sem competir */
  apoio: token("acento-500"),
  /** Séries de contexto */
  neutra: token("bone-400"),
  neutraClara: token("bone-300"),
  grade: token("bone-200"),
  eixo: token("bone-500"),
  /** Só quando o dado é um sinal (ex.: resultado negativo) */
  alerta: token("sinal-alerta"),
  ok: token("sinal-ok"),
};

/** Categorias (pizza, legendas): começa na marca e desce em passos distinguíveis da paleta. */
export const CORES_CATEGORICAS = [
  token("tinta-700"),
  token("acento-500"),
  token("tinta-400"),
  token("acento-300"),
  token("bone-400"),
  token("tinta-200"),
];
