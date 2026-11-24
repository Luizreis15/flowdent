/** Separa "R$ 12.480,00" em prefixo "R$" e número "12.480,00". */
export const separarMoeda = (formatado: string) => {
  const m = formatado.replace(/\u00a0/g, " ").match(/^(-?)\s*(R\$)\s*(.*)$/);
  if (!m) return { prefixo: undefined, valor: formatado };
  return { prefixo: m[2], valor: `${m[1]}${m[3]}` };
};
