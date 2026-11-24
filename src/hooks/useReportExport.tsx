import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface DREData {
  receitaBruta: number;
  taxasFinanceiras: number;
  receitaLiquida: number;
  custoServicos: number;
  despesasOperacionais: number;
  despesasFixas: number;
  despesasVariaveis: number;
  comissoes: number;
  laboratorio: number;
  resultadoOperacional: number;
  despesasFinanceiras: number;
  resultadoLiquido: number;
}

interface ProfessionalRevenue {
  nome: string;
  receita: number;
  procedimentos: number;
  ticketMedio: number;
}

interface ProcedureRevenue {
  nome: string;
  quantidade: number;
  receita: number;
  ticketMedio: number;
}

interface PaymentMethodData {
  label: string;
  valor: number;
  quantidade: number;
  percentual: number;
}

interface AgingData {
  faixa: string;
  valor: number;
  quantidade: number;
}

interface ExportData {
  dreData: DREData | null;
  professionalRevenue: ProfessionalRevenue[];
  procedureRevenue: ProcedureRevenue[];
  paymentMethods: PaymentMethodData[];
  agingData: AgingData[];
  periodo: string;
  clinicName?: string;
}

const formatPeriod = (periodo: string) => {
  const [year, month] = periodo.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

export const useReportExport = () => {
  const exportToPDF = useCallback((data: ExportData, reportType: "all" | "dre" | "profissionais" | "procedimentos" | "pagamentos" | "inadimplencia") => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Relatórios Financeiros", pageWidth / 2, yPos, { align: "center" });
      yPos += 8;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Período: ${formatPeriod(data.periodo)}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;

      if (data.clinicName) {
        doc.setFontSize(10);
        doc.text(data.clinicName, pageWidth / 2, yPos, { align: "center" });
        yPos += 6;
      }

      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, yPos, { align: "center" });
      doc.setTextColor(0);
      yPos += 15;

      // DRE
      if ((reportType === "all" || reportType === "dre") && data.dreData) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("DRE - Demonstração do Resultado", 14, yPos);
        yPos += 8;

        const dreRows = [
          ["RECEITA BRUTA", formatCurrency(data.dreData.receitaBruta)],
          ["(-) Taxas Financeiras (MDR)", `-${formatCurrency(data.dreData.taxasFinanceiras)}`],
          ["RECEITA LÍQUIDA", formatCurrency(data.dreData.receitaLiquida)],
          ["(-) Laboratório", `-${formatCurrency(data.dreData.laboratorio)}`],
          ["(-) Comissões", `-${formatCurrency(data.dreData.comissoes)}`],
          ["LUCRO BRUTO", formatCurrency(data.dreData.receitaLiquida - data.dreData.custoServicos)],
          ["(-) Despesas Fixas", `-${formatCurrency(data.dreData.despesasFixas)}`],
          ["(-) Despesas Variáveis", `-${formatCurrency(data.dreData.despesasVariaveis)}`],
          ["RESULTADO OPERACIONAL", formatCurrency(data.dreData.resultadoOperacional)],
          ["(-) Despesas Financeiras", `-${formatCurrency(data.dreData.despesasFinanceiras)}`],
          ["RESULTADO LÍQUIDO", formatCurrency(data.dreData.resultadoLiquido)],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Descrição", "Valor"]],
          body: dreRows,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
          styles: { fontSize: 10 },
          columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 50, halign: "right" },
          },
          didParseCell: (hookData) => {
            const text = hookData.cell.raw as string;
            if (text && (text.startsWith("RECEITA") || text.startsWith("LUCRO") || text.startsWith("RESULTADO"))) {
              hookData.cell.styles.fontStyle = "bold";
            }
            if (text === "RESULTADO LÍQUIDO") {
              hookData.cell.styles.fillColor = [219, 234, 254];
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Profissionais
      if ((reportType === "all" || reportType === "profissionais") && data.professionalRevenue.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Receita por Profissional", 14, yPos);
        yPos += 8;

        const profRows = data.professionalRevenue.map((p) => [
          p.nome,
          p.procedimentos.toString(),
          formatCurrency(p.receita),
          formatCurrency(p.ticketMedio),
        ]);

        const totalReceita = data.professionalRevenue.reduce((sum, p) => sum + p.receita, 0);
        const totalProcs = data.professionalRevenue.reduce((sum, p) => sum + p.procedimentos, 0);
        profRows.push(["TOTAL", totalProcs.toString(), formatCurrency(totalReceita), "-"]);

        autoTable(doc, {
          startY: yPos,
          head: [["Profissional", "Procedimentos", "Receita", "Ticket Médio"]],
          body: profRows,
          theme: "striped",
          headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
          styles: { fontSize: 10 },
          columnStyles: {
            1: { halign: "center" },
            2: { halign: "right" },
            3: { halign: "right" },
          },
          didParseCell: (hookData) => {
            if (hookData.row.index === profRows.length - 1) {
              hookData.cell.styles.fontStyle = "bold";
              hookData.cell.styles.fillColor = [220, 252, 231];
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Procedimentos
      if ((reportType === "all" || reportType === "procedimentos") && data.procedureRevenue.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Receita por Procedimento", 14, yPos);
        yPos += 8;

        const procRows = data.procedureRevenue.map((p) => [
          p.nome.length > 40 ? p.nome.substring(0, 40) + "..." : p.nome,
          p.quantidade.toString(),
          formatCurrency(p.receita),
          formatCurrency(p.ticketMedio),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Procedimento", "Quantidade", "Receita", "Ticket Médio"]],
          body: procRows,
          theme: "striped",
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: "bold" },
          styles: { fontSize: 10 },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: "center" },
            2: { halign: "right" },
            3: { halign: "right" },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Formas de Pagamento
      if ((reportType === "all" || reportType === "pagamentos") && data.paymentMethods.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Formas de Pagamento", 14, yPos);
        yPos += 8;

        const pmRows = data.paymentMethods.map((p) => [
          p.label,
          p.quantidade.toString(),
          formatCurrency(p.valor),
          `${p.percentual.toFixed(1)}%`,
        ]);

        const totalPM = data.paymentMethods.reduce((sum, p) => sum + p.valor, 0);
        pmRows.push(["TOTAL", "-", formatCurrency(totalPM), "100%"]);

        autoTable(doc, {
          startY: yPos,
          head: [["Forma de Pagamento", "Quantidade", "Valor", "%"]],
          body: pmRows,
          theme: "striped",
          headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold" },
          styles: { fontSize: 10 },
          columnStyles: {
            1: { halign: "center" },
            2: { halign: "right" },
            3: { halign: "center" },
          },
          didParseCell: (hookData) => {
            if (hookData.row.index === pmRows.length - 1) {
              hookData.cell.styles.fontStyle = "bold";
              hookData.cell.styles.fillColor = [254, 243, 199];
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Aging/Inadimplência
      if ((reportType === "all" || reportType === "inadimplencia") && data.agingData.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Aging de Recebíveis", 14, yPos);
        yPos += 8;

        const agingRows = data.agingData.map((a) => [
          a.faixa,
          a.quantidade.toString(),
          formatCurrency(a.valor),
        ]);

        const totalAging = data.agingData.reduce((sum, a) => sum + a.valor, 0);
        const totalQtd = data.agingData.reduce((sum, a) => sum + a.quantidade, 0);
        agingRows.push(["TOTAL EM ABERTO", totalQtd.toString(), formatCurrency(totalAging)]);

        autoTable(doc, {
          startY: yPos,
          head: [["Faixa de Atraso", "Títulos", "Valor"]],
          body: agingRows,
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold" },
          styles: { fontSize: 10 },
          columnStyles: {
            1: { halign: "center" },
            2: { halign: "right" },
          },
          didParseCell: (hookData) => {
            if (hookData.row.index === agingRows.length - 1) {
              hookData.cell.styles.fontStyle = "bold";
              hookData.cell.styles.fillColor = [254, 226, 226];
            }
          },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      const fileName = `relatorio-financeiro-${data.periodo}.pdf`;
      doc.save(fileName);
      toast.success("PDF exportado com sucesso");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  }, []);

  const exportToExcel = useCallback((data: ExportData, reportType: "all" | "dre" | "profissionais" | "procedimentos" | "pagamentos" | "inadimplencia") => {
    try {
      const workbook = XLSX.utils.book_new();

      // DRE Sheet
      if ((reportType === "all" || reportType === "dre") && data.dreData) {
        const dreSheet = [
          ["DRE - DEMONSTRAÇÃO DO RESULTADO"],
          [`Período: ${formatPeriod(data.periodo)}`],
          [""],
          ["Descrição", "Valor"],
          ["RECEITA BRUTA", data.dreData.receitaBruta],
          ["(-) Taxas Financeiras (MDR)", -data.dreData.taxasFinanceiras],
          ["RECEITA LÍQUIDA", data.dreData.receitaLiquida],
          [""],
          ["(-) Laboratório", -data.dreData.laboratorio],
          ["(-) Comissões", -data.dreData.comissoes],
          ["LUCRO BRUTO", data.dreData.receitaLiquida - data.dreData.custoServicos],
          [""],
          ["(-) Despesas Fixas", -data.dreData.despesasFixas],
          ["(-) Despesas Variáveis", -data.dreData.despesasVariaveis],
          ["RESULTADO OPERACIONAL", data.dreData.resultadoOperacional],
          [""],
          ["(-) Despesas Financeiras", -data.dreData.despesasFinanceiras],
          ["RESULTADO LÍQUIDO", data.dreData.resultadoLiquido],
          [""],
          ["Margem Líquida", data.dreData.receitaBruta > 0 ? `${((data.dreData.resultadoLiquido / data.dreData.receitaBruta) * 100).toFixed(2)}%` : "0%"],
        ];
        const ws = XLSX.utils.aoa_to_sheet(dreSheet);
        ws["!cols"] = [{ wch: 35 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(workbook, ws, "DRE");
      }

      // Profissionais Sheet
      if ((reportType === "all" || reportType === "profissionais") && data.professionalRevenue.length > 0) {
        const profSheet = [
          ["RECEITA POR PROFISSIONAL"],
          [`Período: ${formatPeriod(data.periodo)}`],
          [""],
          ["Profissional", "Procedimentos", "Receita", "Ticket Médio"],
          ...data.professionalRevenue.map((p) => [p.nome, p.procedimentos, p.receita, p.ticketMedio]),
          [""],
          [
            "TOTAL",
            data.professionalRevenue.reduce((sum, p) => sum + p.procedimentos, 0),
            data.professionalRevenue.reduce((sum, p) => sum + p.receita, 0),
            "",
          ],
        ];
        const ws = XLSX.utils.aoa_to_sheet(profSheet);
        ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, ws, "Por Profissional");
      }

      // Procedimentos Sheet
      if ((reportType === "all" || reportType === "procedimentos") && data.procedureRevenue.length > 0) {
        const procSheet = [
          ["RECEITA POR PROCEDIMENTO"],
          [`Período: ${formatPeriod(data.periodo)}`],
          [""],
          ["Procedimento", "Quantidade", "Receita", "Ticket Médio"],
          ...data.procedureRevenue.map((p) => [p.nome, p.quantidade, p.receita, p.ticketMedio]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(procSheet);
        ws["!cols"] = [{ wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, ws, "Por Procedimento");
      }

      // Formas de Pagamento Sheet
      if ((reportType === "all" || reportType === "pagamentos") && data.paymentMethods.length > 0) {
        const pmSheet = [
          ["FORMAS DE PAGAMENTO"],
          [`Período: ${formatPeriod(data.periodo)}`],
          [""],
          ["Forma de Pagamento", "Quantidade", "Valor", "Percentual"],
          ...data.paymentMethods.map((p) => [p.label, p.quantidade, p.valor, `${p.percentual.toFixed(2)}%`]),
          [""],
          [
            "TOTAL",
            "-",
            data.paymentMethods.reduce((sum, p) => sum + p.valor, 0),
            "100%",
          ],
        ];
        const ws = XLSX.utils.aoa_to_sheet(pmSheet);
        ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(workbook, ws, "Formas de Pagamento");
      }

      // Aging Sheet
      if ((reportType === "all" || reportType === "inadimplencia") && data.agingData.length > 0) {
        const agingSheet = [
          ["AGING DE RECEBÍVEIS"],
          [`Data de Referência: ${new Date().toLocaleDateString("pt-BR")}`],
          [""],
          ["Faixa de Atraso", "Quantidade de Títulos", "Valor"],
          ...data.agingData.map((a) => [a.faixa, a.quantidade, a.valor]),
          [""],
          [
            "TOTAL EM ABERTO",
            data.agingData.reduce((sum, a) => sum + a.quantidade, 0),
            data.agingData.reduce((sum, a) => sum + a.valor, 0),
          ],
        ];
        const ws = XLSX.utils.aoa_to_sheet(agingSheet);
        ws["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, ws, "Inadimplência");
      }

      const fileName = `relatorio-financeiro-${data.periodo}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success("Excel exportado com sucesso");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar Excel");
    }
  }, []);

  return { exportToPDF, exportToExcel };
};
