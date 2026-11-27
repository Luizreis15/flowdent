import { useCallback } from "react";
// jspdf, jspdf-autotable e xlsx são carregados só no clique de exportar (antes vinham com a tela).
import { toast } from "sonner";

interface ExportColumn {
  header: string;
  key: string;
}

export const useRelatorioExport = () => {
  const exportToCSV = useCallback((data: Record<string, any>[], columns: ExportColumn[], fileName: string) => {
    try {
      const headers = columns.map((c) => c.header).join(",");
      const rows = data.map((row) =>
        columns.map((c) => {
          const val = row[c.key];
          const str = String(val ?? "");
          return str.includes(",") ? `"${str}"` : str;
        }).join(",")
      );
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado com sucesso");
    } catch {
      toast.error("Erro ao exportar CSV");
    }
  }, []);

  const exportToExcel = useCallback(async (data: Record<string, any>[], columns: ExportColumn[], fileName: string) => {
    try {
      const XLSX = await import("xlsx");
      const sheetData = data.map((row) => {
        const obj: Record<string, any> = {};
        columns.forEach((c) => { obj[c.header] = row[c.key]; });
        return obj;
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = columns.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      toast.success("Excel exportado com sucesso");
    } catch {
      toast.error("Erro ao exportar Excel");
    }
  }, []);

  const exportToPDF = useCallback(async (data: Record<string, any>[], columns: ExportColumn[], fileName: string, title: string) => {
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(title, pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, 28, { align: "center" });
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 35,
        head: [columns.map((c) => c.header)],
        body: data.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8 },
      });

      doc.save(`${fileName}.pdf`);
      toast.success("PDF exportado com sucesso");
    } catch {
      toast.error("Erro ao exportar PDF");
    }
  }, []);

  return { exportToCSV, exportToExcel, exportToPDF };
};
