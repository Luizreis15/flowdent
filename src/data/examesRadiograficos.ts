// Banco de exames radiográficos/imaginológicos odontológicos

export interface ExameRadiografico {
  nome: string;
  categoria: "Radiografia Intraoral" | "Radiografia Extraoral" | "Imagem 3D";
}

export const examesRadiograficos: ExameRadiografico[] = [
  { nome: "Periapical", categoria: "Radiografia Intraoral" },
  { nome: "Interproximal (Bitewing)", categoria: "Radiografia Intraoral" },
  { nome: "Oclusal", categoria: "Radiografia Intraoral" },
  { nome: "Panorâmica", categoria: "Radiografia Extraoral" },
  { nome: "Cefalométrica (Teleradiografia)", categoria: "Radiografia Extraoral" },
  { nome: "ATM (Articulação Temporomandibular)", categoria: "Radiografia Extraoral" },
  { nome: "Tomografia Computadorizada de Feixe Cônico (TCFC/CBCT)", categoria: "Imagem 3D" },
  { nome: "Escaneamento Intraoral 3D", categoria: "Imagem 3D" },
];

export const categoriasExame = Array.from(new Set(examesRadiograficos.map(e => e.categoria)));
