import type jsPDF from "jspdf";
import { formatCurrency, formatCNPJ, formatCPF, formatPhone } from "@/lib/utils";

export interface ReciboData {
  receiptNumber?: number;
  titleNumber: number;
  installmentNumber: number;
  totalInstallments: number;
  patientName: string;
  patientCpf?: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  clinicName: string;
  clinicCnpj?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  clinicLogoUrl?: string;
  description?: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_debito: "Cartão de Débito",
  cartao_credito: "Cartão de Crédito",
  transferencia: "Transferência Bancária",
  boleto: "Boleto",
  cheque: "Cheque",
  convenio: "Convênio",
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function valorPorExtenso(valor: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (valor === 0) return "zero reais";

  const parteInteira = Math.floor(valor);
  const centavos = Math.round((valor - parteInteira) * 100);

  function converterGrupo(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const parts: string[] = [];
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (c > 0) parts.push(centenas[c]);
    if (resto >= 10 && resto < 20) {
      parts.push(especiais[resto - 10]);
    } else {
      if (d > 0) parts.push(dezenas[d]);
      if (u > 0) parts.push(unidades[u]);
    }
    return parts.join(" e ");
  }

  const partes: string[] = [];
  if (parteInteira > 0) {
    const milhares = Math.floor(parteInteira / 1000);
    const resto = parteInteira % 1000;
    if (milhares > 0) partes.push(milhares === 1 ? "mil" : `${converterGrupo(milhares)} mil`);
    if (resto > 0) partes.push(converterGrupo(resto));
    const reaisStr = partes.join(milhares > 0 && resto > 0 && resto < 100 ? " e " : " ");
    const resultado = parteInteira === 1 ? `${reaisStr} real` : `${reaisStr} reais`;
    if (centavos > 0) {
      return `${resultado} e ${converterGrupo(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
    }
    return resultado;
  }
  return `${converterGrupo(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
}

function generateValidationId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) result += "-";
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function extractCity(address?: string): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim());
  // Typically: street, number, neighborhood, city, state
  return parts.length >= 4 ? parts[3] : parts[parts.length - 1] || "";
}

export async function generateRecibo(data: ReciboData): Promise<void> {
  // Carregada só no clique: antes vinha junto com a tela (~400 KB a mais ao abrir).
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const validationId = generateValidationId();
  let y = 20;

  // ====== WATERMARK ======
  doc.setTextColor(0, 0, 0);
  doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // ====== HEADER ======
  // Logo placeholder area
  let headerStartX = margin;
  if (data.clinicLogoUrl) {
    try {
      const img = await loadImage(data.clinicLogoUrl);
      doc.addImage(img, "PNG", margin, y, 18, 18);
      headerStartX = margin + 22;
    } catch {
      // Skip logo if it fails to load
    }
  }

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.clinicName.toUpperCase(), headerStartX, y + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const headerParts: string[] = [];
  if (data.clinicCnpj) headerParts.push(`CNPJ: ${formatCNPJ(data.clinicCnpj)}`);
  if (data.clinicPhone) headerParts.push(`Tel: ${formatPhone(data.clinicPhone)}`);
  if (headerParts.length > 0) {
    doc.text(headerParts.join("  •  "), headerStartX, y + 11);
  }
  if (data.clinicAddress) {
    doc.text(data.clinicAddress, headerStartX, y + 15);
  }
  y += 22;

  // Header separator
  doc.setDrawColor(29, 78, 216); // primary blue
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.2, pageWidth - margin, y + 1.2);
  y += 10;

  // ====== RECEIPT NUMBER & DATE (right-aligned) ======
  const receiptNum = data.receiptNumber || data.titleNumber;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Recibo Nº ${String(receiptNum).padStart(5, "0")}`, pageWidth - margin, y, { align: "right" });
  y += 5;

  // Parse date for formal display
  const [yr, mo, dy] = data.paymentDate.split("-");
  const monthName = MESES[parseInt(mo) - 1] || mo;
  doc.text(`Emitido em ${parseInt(dy)} de ${monthName} de ${yr}`, pageWidth - margin, y, { align: "right" });
  y += 12;

  // ====== TITLE ======
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(29, 78, 216);
  doc.text("RECIBO DE PAGAMENTO", pageWidth / 2, y, { align: "center" });
  y += 14;

  // ====== AMOUNT BOX ======
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(200, 210, 225);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("VALOR RECEBIDO", margin + 6, y + 7);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(29, 78, 216);
  doc.text(formatCurrency(data.amount), margin + 6, y + 17);

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const extensoText = valorPorExtenso(data.amount);
  doc.text(`(${extensoText})`, pageWidth - margin - 6, y + 17, {
    align: "right",
    maxWidth: contentWidth / 2,
  });
  y += 30;

  // ====== BODY DETAILS ======
  doc.setTextColor(30, 30, 30);

  const addField = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label.toUpperCase(), margin, y);
    y += 4.5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(value, margin, y);
    y += 8;
  };

  addField("Recebido de", data.patientName);

  if (data.patientCpf) {
    addField("CPF", formatCPF(data.patientCpf));
  }

  const refText = data.description ||
    `Tratamento odontológico — Parcela ${data.installmentNumber}/${data.totalInstallments} — Título #${data.titleNumber}`;
  addField("Referente a", refText);

  addField("Forma de pagamento", PAYMENT_METHOD_LABELS[data.paymentMethod] || data.paymentMethod);

  addField("Data do pagamento", `${parseInt(dy)} de ${monthName} de ${yr}`);

  y += 10;

  // ====== SIGNATURE AREA ======
  // City, date line
  const city = extractCity(data.clinicAddress);
  const localDateStr = city
    ? `${city}, ${parseInt(dy)} de ${monthName} de ${yr}`
    : `${parseInt(dy)} de ${monthName} de ${yr}`;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(localDateStr, pageWidth / 2, y, { align: "center" });
  y += 18;

  // Signature line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  const sigStart = pageWidth / 2 - 45;
  const sigEnd = pageWidth / 2 + 45;
  doc.line(sigStart, y, sigEnd, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(data.clinicName, pageWidth / 2, y, { align: "center" });
  if (data.clinicCnpj) {
    y += 4;
    doc.setFontSize(8);
    doc.text(`CNPJ: ${formatCNPJ(data.clinicCnpj)}`, pageWidth / 2, y, { align: "center" });
  }

  // ====== FOOTER ======
  const footerY = pageHeight - 18;

  // Footer separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Documento sem valor fiscal", margin, footerY);

  const now = new Date();
  doc.text(
    `Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Validation ID
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 150, 150);
  doc.text(`ID: ${validationId}`, pageWidth - margin, footerY, { align: "right" });

  // Open PDF in new tab
  const pdfBlob = doc.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, "_blank");
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context error");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
