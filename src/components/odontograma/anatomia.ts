/*
 * Geometria anatômica dos dentes do odontograma.
 *
 * Medidas aproximadas em milímetros (largura mesiodistal da coroa, altura da coroa,
 * comprimento radicular), suficientes para que incisivo, canino, pré-molar e molar
 * sejam reconhecíveis e para que cada dente tenha a largura proporcional na arcada.
 * Os desenhos são gerados como paths SVG com a coroa para baixo e a raiz para cima;
 * quem renderiza espelha verticalmente quando a coroa deve apontar para cima.
 */

export type TipoDente = "incisivo" | "canino" | "premolar" | "molar";

/** px por milímetro: define o tamanho do dente na tela mantendo a proporção entre tipos. */
export const ESCALA_ODONTOGRAMA = 5.2;

interface Raiz {
  /** deslocamento horizontal no colo, em fração da meia largura cervical */
  x: number;
  /** largura da raiz no colo, mm */
  largura: number;
  /** fração do comprimento radicular */
  comprimento?: number;
  /** inclinação do ápice, em fração do comprimento (negativo = para a esquerda) */
  inclinacao?: number;
  /** raiz palatina, desenhada atrás das vestibulares */
  posterior?: boolean;
}

export interface Anatomia {
  tipo: TipoDente;
  /** largura máxima da coroa (mm) */
  largura: number;
  /** largura no colo (mm) */
  colo: number;
  /** altura da coroa (mm) */
  coroa: number;
  /** comprimento radicular (mm) */
  raiz: number;
  raizes: Raiz[];
  /** cúspides vestibulares visíveis (molares) */
  cuspides?: number;
  /** dimensão vestibulolingual (mm), usada na vista oclusal */
  profundidade: number;
}

const SUPERIOR: Record<number, Anatomia> = {
  1: { tipo: "incisivo", largura: 8.6, colo: 6.4, coroa: 10.5, raiz: 13, profundidade: 7, raizes: [{ x: 0, largura: 5.8 }] },
  2: { tipo: "incisivo", largura: 6.6, colo: 4.8, coroa: 9, raiz: 13, profundidade: 6, raizes: [{ x: 0, largura: 4.4 }] },
  3: { tipo: "canino", largura: 7.6, colo: 5.6, coroa: 10, raiz: 17, profundidade: 8, raizes: [{ x: 0, largura: 5.2 }] },
  4: {
    tipo: "premolar", largura: 7, colo: 5, coroa: 8.5, raiz: 14, profundidade: 9,
    raizes: [{ x: -0.42, largura: 2.7, inclinacao: -0.04 }, { x: 0.42, largura: 2.6, comprimento: 0.94, inclinacao: 0.05 }],
  },
  5: { tipo: "premolar", largura: 6.8, colo: 5, coroa: 8, raiz: 14, profundidade: 9, raizes: [{ x: 0, largura: 4.2 }] },
  6: {
    tipo: "molar", largura: 10.2, colo: 8, coroa: 7.5, raiz: 12.5, profundidade: 11, cuspides: 2,
    raizes: [
      { x: 0, largura: 3.4, comprimento: 1.06, posterior: true },
      { x: -0.62, largura: 3, inclinacao: -0.14 },
      { x: 0.58, largura: 2.8, comprimento: 0.9, inclinacao: 0.1 },
    ],
  },
  7: {
    tipo: "molar", largura: 9.2, colo: 7.4, coroa: 7, raiz: 12, profundidade: 11, cuspides: 2,
    raizes: [
      { x: 0, largura: 3.2, comprimento: 1.02, posterior: true },
      { x: -0.52, largura: 2.9, inclinacao: -0.08 },
      { x: 0.52, largura: 2.7, comprimento: 0.9, inclinacao: 0.12 },
    ],
  },
  8: {
    tipo: "molar", largura: 8.6, colo: 7, coroa: 6.5, raiz: 10, profundidade: 10, cuspides: 2,
    raizes: [{ x: 0.05, largura: 5.6, inclinacao: 0.12 }],
  },
};

const INFERIOR: Record<number, Anatomia> = {
  1: { tipo: "incisivo", largura: 5.2, colo: 3.6, coroa: 9, raiz: 12.5, profundidade: 6, raizes: [{ x: 0, largura: 3.3 }] },
  2: { tipo: "incisivo", largura: 5.8, colo: 4, coroa: 9.5, raiz: 14, profundidade: 6.4, raizes: [{ x: 0, largura: 3.6 }] },
  3: { tipo: "canino", largura: 7, colo: 5.4, coroa: 11, raiz: 16, profundidade: 7.6, raizes: [{ x: 0, largura: 5 }] },
  4: { tipo: "premolar", largura: 7, colo: 5, coroa: 8.5, raiz: 14, profundidade: 7.8, raizes: [{ x: 0, largura: 4.3 }] },
  5: { tipo: "premolar", largura: 7.2, colo: 5, coroa: 8, raiz: 14.5, profundidade: 8.4, raizes: [{ x: 0, largura: 4.3 }] },
  6: {
    tipo: "molar", largura: 11.2, colo: 9, coroa: 7.5, raiz: 14, profundidade: 10.4, cuspides: 3,
    raizes: [{ x: -0.56, largura: 3.4, inclinacao: -0.1 }, { x: 0.56, largura: 3.2, comprimento: 0.94, inclinacao: 0.12 }],
  },
  7: {
    tipo: "molar", largura: 10.5, colo: 8.5, coroa: 7, raiz: 13, profundidade: 10, cuspides: 2,
    raizes: [{ x: -0.5, largura: 3.3, inclinacao: -0.06 }, { x: 0.5, largura: 3.1, comprimento: 0.95, inclinacao: 0.1 }],
  },
  8: {
    tipo: "molar", largura: 10, colo: 8, coroa: 7, raiz: 11, profundidade: 9.6, cuspides: 2,
    raizes: [{ x: -0.4, largura: 3.2, inclinacao: 0.05 }, { x: 0.4, largura: 3, comprimento: 0.9, inclinacao: 0.15 }],
  },
};

/** Decíduos: 1–3 como permanentes menores; 4 e 5 são molares decíduos. */
const DECIDUO_EQUIVALENTE: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 6, 5: 6 };

export const quadranteDe = (numero: number) => Math.floor(numero / 10);
export const posicaoDe = (numero: number) => numero % 10;
export const ehSuperior = (numero: number) => [1, 2, 5, 6].includes(quadranteDe(numero));
export const ehDeciduo = (numero: number) => quadranteDe(numero) >= 5;
/** Quadrantes 1, 4, 5 e 8 ficam à esquerda da linha média no odontograma: a mesial aponta para a direita. */
export const mesialADireita = (numero: number) => [1, 4, 5, 8].includes(quadranteDe(numero));

export function anatomiaDe(numero: number): Anatomia {
  const superior = ehSuperior(numero);
  const tabela = superior ? SUPERIOR : INFERIOR;
  if (!ehDeciduo(numero)) return tabela[posicaoDe(numero)] ?? tabela[1];

  const pos = posicaoDe(numero);
  const base = tabela[DECIDUO_EQUIVALENTE[pos] ?? 1];
  const escala = pos >= 4 ? (pos === 4 ? 0.72 : 0.86) : 0.78;
  return {
    ...base,
    largura: base.largura * escala,
    colo: base.colo * escala,
    coroa: base.coroa * 0.8,
    raiz: base.raiz * 0.62,
    profundidade: base.profundidade * escala,
    // raízes decíduas são finas e divergentes
    raizes: base.raizes.map((r) => ({ ...r, largura: r.largura * 0.7, inclinacao: (r.inclinacao ?? 0) * 1.8 })),
  };
}

const f = (n: number) => Number(n.toFixed(2));

/** Contorno da coroa, coroa para baixo, colo em y=0. */
export function caminhoCoroa(a: Anatomia): string {
  const W = a.largura / 2;
  const C = a.colo / 2;
  const H = a.coroa;
  const ombro = H * 0.42;
  const borda = H * 0.84;

  let fundo: string;
  const xe = -W * 0.9;
  const xd = W * 0.9;
  if (a.tipo === "incisivo") {
    fundo = `Q ${f(xe)} ${f(H)} ${f(xe + 1.1)} ${f(H)} L ${f(xd - 0.9)} ${f(H * 0.985)} Q ${f(xd)} ${f(H * 0.98)} ${f(xd)} ${f(borda)}`;
  } else if (a.tipo === "canino") {
    fundo = `Q ${f(xe * 0.85)} ${f(H * 0.93)} 0 ${f(H)} Q ${f(xd * 0.85)} ${f(H * 0.93)} ${f(xd)} ${f(borda)}`;
  } else if (a.tipo === "premolar") {
    const pico = -W * 0.06;
    fundo = `Q ${f(xe * 0.95)} ${f(H * 0.98)} ${f(pico)} ${f(H)} Q ${f(xd * 0.95)} ${f(H * 0.98)} ${f(xd)} ${f(borda)}`;
  } else {
    const n = a.cuspides ?? 2;
    const passo = (xd - xe) / n;
    let segs = "";
    for (let i = 0; i < n; i++) {
      const x0 = xe + passo * i;
      const meio = x0 + passo / 2;
      const x1 = x0 + passo;
      const yFim = i === n - 1 ? borda : H * 0.9;
      segs += ` Q ${f(x0 + passo * 0.08)} ${f(H)} ${f(meio)} ${f(H)} Q ${f(x1 - passo * 0.08)} ${f(H)} ${f(x1)} ${f(yFim)}`;
    }
    fundo = segs.trim();
  }

  return [
    `M ${f(-C)} 0`,
    `C ${f(-C - (W - C) * 0.35)} ${f(H * 0.12)} ${f(-W)} ${f(ombro * 0.6)} ${f(-W)} ${f(ombro)}`,
    `C ${f(-W)} ${f(H * 0.62)} ${f(xe)} ${f(H * 0.74)} ${f(xe)} ${f(borda)}`,
    fundo,
    `C ${f(xd)} ${f(H * 0.74)} ${f(W)} ${f(H * 0.62)} ${f(W)} ${f(ombro)}`,
    `C ${f(W)} ${f(ombro * 0.6)} ${f(C + (W - C) * 0.35)} ${f(H * 0.12)} ${f(C)} 0`,
    // junção amelocementária: curva voltada para a raiz
    `Q 0 ${f(-H * 0.14)} ${f(-C)} 0`,
    "Z",
  ].join(" ");
}

/** Raízes, para cima a partir do colo (y negativo). Retorna [posteriores, anteriores]. */
export function caminhosRaizes(a: Anatomia): {
  posteriores: string[];
  anteriores: string[];
  /** tronco radicular dos multirradiculares: preenchimento e contorno aberto (laterais e furca) */
  tronco: { preenchimento: string; contorno: string } | null;
} {
  const C = a.colo / 2;
  const R = a.raiz;
  const posteriores: string[] = [];
  const anteriores: string[] = [];
  const multiplas = a.raizes.filter((r) => !r.posterior).length > 1;
  const tronco = multiplas ? R * 0.22 : 0;

  for (const r of a.raizes) {
    const comp = R * (r.comprimento ?? 1);
    const x0 = r.x * C;
    const meia = r.largura / 2;
    const apX = x0 + (r.inclinacao ?? 0) * comp;
    const apY = -comp;
    const inicioY = multiplas && !r.posterior ? -tronco * 0.6 : 0;
    const baseE = multiplas && !r.posterior ? x0 - meia : Math.max(-C * 0.98, x0 - meia);
    const baseD = multiplas && !r.posterior ? x0 + meia : Math.min(C * 0.98, x0 + meia);

    const d = [
      `M ${f(baseE)} ${f(inicioY + 0.6)}`,
      `C ${f(baseE - 0.1)} ${f(apY * 0.45)} ${f(apX - meia * 0.45)} ${f(apY * 0.86)} ${f(apX - 0.25)} ${f(apY + 0.3)}`,
      `Q ${f(apX)} ${f(apY - 0.25)} ${f(apX + 0.25)} ${f(apY + 0.3)}`,
      `C ${f(apX + meia * 0.45)} ${f(apY * 0.86)} ${f(baseD + 0.1)} ${f(apY * 0.45)} ${f(baseD)} ${f(inicioY + 0.6)}`,
      "Z",
    ].join(" ");
    (r.posterior ? posteriores : anteriores).push(d);
  }

  let troncoDesenho: { preenchimento: string; contorno: string } | null = null;
  if (multiplas) {
    // tronco radicular unindo as raízes ao colo, com a furca entre elas. Vai por cima da base
    // das raízes, sem contorno inferior, para que elas pareçam nascer do colo.
    const furcaE = -C * 0.42;
    const furcaD = C * 0.42;
    const lateral = `M ${f(-C * 0.97)} 0.6 C ${f(-C * 0.99)} ${f(-tronco * 0.5)} ${f(-C * 0.95)} ${f(-tronco * 0.9)} ${f(-C * 0.86)} ${f(-tronco * 1.15)}`;
    const furca = `M ${f(furcaE)} ${f(-tronco * 1.15)} Q 0 ${f(-tronco * 0.55)} ${f(furcaD)} ${f(-tronco * 1.15)}`;
    const lateralD = `M ${f(C * 0.97)} 0.6 C ${f(C * 0.99)} ${f(-tronco * 0.5)} ${f(C * 0.95)} ${f(-tronco * 0.9)} ${f(C * 0.86)} ${f(-tronco * 1.15)}`;
    troncoDesenho = {
      preenchimento:
        `M ${f(-C * 0.97)} 0.6 C ${f(-C * 0.99)} ${f(-tronco * 0.5)} ${f(-C * 0.95)} ${f(-tronco * 0.9)} ${f(-C * 0.86)} ${f(-tronco * 1.15)} ` +
        `L ${f(furcaE)} ${f(-tronco * 1.15)} Q 0 ${f(-tronco * 0.55)} ${f(furcaD)} ${f(-tronco * 1.15)} ` +
        `L ${f(C * 0.86)} ${f(-tronco * 1.15)} C ${f(C * 0.95)} ${f(-tronco * 0.9)} ${f(C * 0.99)} ${f(-tronco * 0.5)} ${f(C * 0.97)} 0.6 Z`,
      contorno: `${lateral} ${furca} ${lateralD}`,
    };
  }
  return { posteriores, anteriores, tronco: troncoDesenho };
}

/** Contorno oclusal, centrado na origem; largura = mesiodistal, altura = vestibulolingual. */
export function caminhoOclusal(a: Anatomia): string {
  const w = a.largura / 2;
  const h = a.profundidade / 2;
  if (a.tipo === "incisivo") {
    // estreito e alongado, com a face lingual em forma de pá
    return `M ${f(-w)} ${f(-h * 0.35)} Q ${f(-w)} ${f(-h)} 0 ${f(-h)} Q ${f(w)} ${f(-h)} ${f(w)} ${f(-h * 0.35)} Q ${f(w * 0.7)} ${f(h)} 0 ${f(h)} Q ${f(-w * 0.7)} ${f(h)} ${f(-w)} ${f(-h * 0.35)} Z`;
  }
  if (a.tipo === "canino") {
    return `M ${f(-w)} 0 Q ${f(-w * 0.85)} ${f(-h * 0.95)} 0 ${f(-h)} Q ${f(w * 0.85)} ${f(-h * 0.95)} ${f(w)} 0 Q ${f(w * 0.7)} ${f(h)} 0 ${f(h)} Q ${f(-w * 0.7)} ${f(h)} ${f(-w)} 0 Z`;
  }
  if (a.tipo === "premolar") {
    return `M 0 ${f(-h)} C ${f(w * 1.05)} ${f(-h)} ${f(w * 1.05)} ${f(h)} 0 ${f(h)} C ${f(-w * 1.05)} ${f(h)} ${f(-w * 1.05)} ${f(-h)} 0 ${f(-h)} Z`;
  }
  // molar: quadrilátero de cantos arredondados, levemente rombóide
  const r = Math.min(w, h) * 0.45;
  return [
    `M ${f(-w + r)} ${f(-h)}`,
    `L ${f(w - r * 0.7)} ${f(-h)}`,
    `Q ${f(w)} ${f(-h)} ${f(w)} ${f(-h + r)}`,
    `L ${f(w * 0.94)} ${f(h - r)}`,
    `Q ${f(w * 0.94)} ${f(h)} ${f(w * 0.94 - r)} ${f(h)}`,
    `L ${f(-w + r * 0.8)} ${f(h)}`,
    `Q ${f(-w)} ${f(h)} ${f(-w)} ${f(h - r)}`,
    `L ${f(-w)} ${f(-h + r)}`,
    `Q ${f(-w)} ${f(-h)} ${f(-w + r)} ${f(-h)}`,
    "Z",
  ].join(" ");
}

/** Sulcos e cristas da face oclusal (decorativos), no mesmo sistema de coordenadas. */
export function caminhoSulcos(a: Anatomia): string {
  const w = a.largura / 2;
  const h = a.profundidade / 2;
  if (a.tipo === "incisivo") return `M ${f(-w * 0.75)} ${f(-h * 0.45)} Q 0 ${f(-h * 0.62)} ${f(w * 0.75)} ${f(-h * 0.45)}`;
  if (a.tipo === "canino") return `M ${f(-w * 0.7)} ${f(-h * 0.05)} L 0 ${f(-h * 0.45)} L ${f(w * 0.7)} ${f(-h * 0.05)} M 0 ${f(-h * 0.45)} L 0 ${f(h * 0.45)}`;
  if (a.tipo === "premolar") return `M ${f(-w * 0.55)} ${f(h * 0.02)} Q 0 ${f(-h * 0.08)} ${f(w * 0.55)} ${f(h * 0.02)}`;
  return [
    `M ${f(-w * 0.62)} ${f(-h * 0.02)} Q ${f(-w * 0.1)} ${f(h * 0.08)} ${f(w * 0.6)} ${f(-h * 0.04)}`,
    `M ${f(-w * 0.08)} ${f(-h * 0.7)} L ${f(-w * 0.05)} ${f(h * 0.04)}`,
    `M ${f(w * 0.18)} ${f(h * 0.02)} L ${f(w * 0.3)} ${f(h * 0.7)}`,
  ].join(" ");
}

/** Largura em px que o dente ocupa na fileira, para alinhar as vistas em colunas. */
export const larguraDente = (numero: number) => anatomiaDe(numero).largura * ESCALA_ODONTOGRAMA + 4;

/**
 * Implante osseointegrado no lugar da raiz (coroa para baixo, colo em y=0):
 * corpo cônico com roscas e plataforma no colo.
 */
export function caminhosImplante(a: Anatomia): { corpo: string; roscas: string; plataforma: string } {
  const meia = Math.min(a.colo * 0.3, 2.1);
  const comp = a.raiz * 0.82;
  const ponta = meia * 0.55;
  const corpo = [
    `M ${f(-meia)} -0.4`,
    `L ${f(-meia)} ${f(-comp * 0.78)}`,
    `L ${f(-ponta)} ${f(-comp)}`,
    `L ${f(ponta)} ${f(-comp)}`,
    `L ${f(meia)} ${f(-comp * 0.78)}`,
    `L ${f(meia)} -0.4`,
    "Z",
  ].join(" ");
  const passos = 7;
  let roscas = "";
  for (let i = 1; i <= passos; i++) {
    const y = -0.4 - ((comp * 0.78 - 0.4) * i) / (passos + 0.5);
    roscas += `M ${f(-meia - 0.35)} ${f(y + 0.25)} L ${f(meia + 0.35)} ${f(y - 0.25)} `;
  }
  const plataforma = `M ${f(-meia - 0.25)} 0.1 L ${f(meia + 0.25)} 0.1 L ${f(meia + 0.25)} -0.5 L ${f(-meia - 0.25)} -0.5 Z`;
  return { corpo, roscas: roscas.trim(), plataforma };
}

/** Condição do dente inteiro, derivada dos procedimentos (não substitui o status por face). */
export type CondicaoDente = "ausente" | "extracao_indicada" | "implante" | "implante_indicado";

const EXTRACAO = /(exodontia|extra[cç][aã]o)/i;
const IMPLANTE = /(^|[^a-z])implante/i;
const REIMPLANTE = /reimplante/i;

/** Classifica um procedimento pelo nome e status do tratamento. */
export function condicaoDoProcedimento(nome: string | null | undefined, concluido: boolean): CondicaoDente | null {
  if (!nome) return null;
  if (IMPLANTE.test(nome) && !REIMPLANTE.test(nome)) return concluido ? "implante" : "implante_indicado";
  if (EXTRACAO.test(nome)) return concluido ? "ausente" : "extracao_indicada";
  return null;
}

/** Quando há vários procedimentos no mesmo dente, o estado mais "final" prevalece. */
const PRIORIDADE: Record<CondicaoDente, number> = {
  implante: 4,
  ausente: 3,
  implante_indicado: 2,
  extracao_indicada: 1,
};
export const condicaoPrevalente = (atual: CondicaoDente | null, nova: CondicaoDente | null) =>
  !nova ? atual : !atual || PRIORIDADE[nova] > PRIORIDADE[atual] ? nova : atual;
