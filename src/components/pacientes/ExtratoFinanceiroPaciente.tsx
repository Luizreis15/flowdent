import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatCPF, formatCNPJ, formatPhone } from "@/lib/utils";
import {
  Download, FileText, TrendingUp, TrendingDown, AlertTriangle, BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Titulo {
  id: string;
  title_number: number;
  amount: number;
  balance: number;
  paid_amount: number | null;
  status: string;
  due_date: string;
  installment_number: number | null;
  total_installments: number;
  installment_label: string | null;
  notes: string | null;
  payment_method: string | null;
  origin: string | null;
}

interface Pagamento {
  id: string;
  value: number;
  payment_method: string | null;
  payment_date: string | null;
  status: string | null;
}

interface ExtratoFinanceiroPacienteProps {
  titulos: Titulo[];
  pagamentos: Pagamento[];
  patientId: string;
  clinicId: string;
}

const METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  boleto: "Boleto",
  transferencia: "Transferência",
  cheque: "Cheque",
  convenio: "Convênio",
};

const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const ExtratoFinanceiroPaciente = ({
  titulos,
  pagamentos,
  patientId,
  clinicId,
}: ExtratoFinanceiroPacienteProps) => {
  // ======= Metrics =======
  const metrics = useMemo(() => {
    const totalOrcado = titulos.reduce((s, t) => s + t.amount, 0);
    const totalPago = pagamentos.filter((p) => p.status === "completed").reduce((s, p) => s + p.value, 0);
    const totalAberto = titulos
      .filter((t) => t.status === "open" || t.status === "partial")
      .reduce((s, t) => s + t.balance, 0);

    const now = new Date();
    const vencidos = titulos.filter(
      (t) => (t.status === "open" || t.status === "partial") && new Date(t.due_date) < now
    );
    const totalVencido = vencidos.reduce((s, t) => s + t.balance, 0);
    const qtdVencido = vencidos.length;

    const taxaInadimplencia = totalOrcado > 0 ? (totalVencido / totalOrcado) * 100 : 0;
    const taxaPagamento = totalOrcado > 0 ? (totalPago / totalOrcado) * 100 : 0;

    return { totalOrcado, totalPago, totalAberto, totalVencido, qtdVencido, taxaInadimplencia, taxaPagamento };
  }, [titulos, pagamentos]);

  // ======= Payment evolution chart (last 12 months) =======
  const evolutionData = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string; pago: number; vencido: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ label: MESES_CURTO[d.getMonth()], key, pago: 0, vencido: 0 });
    }

    pagamentos
      .filter((p) => p.status === "completed" && p.payment_date)
      .forEach((p) => {
        const key = p.payment_date!.slice(0, 7);
        const m = months.find((mo) => mo.key === key);
        if (m) m.pago += p.value;
      });

    const today = new Date();
    titulos
      .filter((t) => (t.status === "open" || t.status === "partial") && new Date(t.due_date) < today)
      .forEach((t) => {
        const key = t.due_date.slice(0, 7);
        const m = months.find((mo) => mo.key === key);
        if (m) m.vencido += t.balance;
      });

    return months;
  }, [pagamentos, titulos]);

  // ======= Payment method distribution =======
  const methodDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    pagamentos
      .filter((p) => p.status === "completed")
      .forEach((p) => {
        const key = p.payment_method || "outro";
        map[key] = (map[key] || 0) + p.value;
      });

    const COLORS = ["hsl(var(--primary))", "hsl(var(--success-green))", "hsl(var(--flowdent-blue))", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

    return Object.entries(map).map(([method, value], i) => ({
      name: METHOD_LABELS[method] || method,
      value,
      color: COLORS[i % COLORS.length],
    }));
  }, [pagamentos]);

  // ======= PDF Export =======
  const handleExportPDF = async () => {
    try {
      const [clinicRes, patientRes, configRes] = await Promise.all([
        supabase.from("clinicas").select("nome, cnpj, telefone, address").eq("id", clinicId).single(),
        supabase.from("patients").select("full_name, cpf, phone, email").eq("id", patientId).single(),
        supabase.from("configuracoes_clinica").select("logotipo_url").eq("clinica_id", clinicId).single(),
      ]);

      const clinic = clinicRes.data;
      const patient = patientRes.data;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 15;

      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text((clinic?.nome || "Clínica").toUpperCase(), margin, y + 5);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const headerParts: string[] = [];
      if (clinic?.cnpj) headerParts.push(`CNPJ: ${formatCNPJ(clinic.cnpj)}`);
      if (clinic?.telefone) headerParts.push(`Tel: ${formatPhone(clinic.telefone)}`);
      if (headerParts.length) doc.text(headerParts.join("  •  "), margin, y + 10);
      y += 16;

      // Separator
      doc.setDrawColor(29, 78, 216);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(29, 78, 216);
      doc.text("EXTRATO FINANCEIRO", pageWidth / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageWidth / 2, y, { align: "center" });
      y += 10;

      // Patient info
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, "F");

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(`Paciente: ${patient?.full_name || "—"}`, margin + 4, y + 6);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const patientInfo: string[] = [];
      if (patient?.cpf) patientInfo.push(`CPF: ${formatCPF(patient.cpf)}`);
      if (patient?.phone) patientInfo.push(`Tel: ${formatPhone(patient.phone)}`);
      if (patient?.email) patientInfo.push(`Email: ${patient.email}`);
      doc.text(patientInfo.join("  •  "), margin + 4, y + 12);
      y += 24;

      // Summary box
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("RESUMO FINANCEIRO", margin, y);
      y += 6;

      const summaryRows = [
        ["Total Orçado", formatCurrency(metrics.totalOrcado)],
        ["Total Recebido", formatCurrency(metrics.totalPago)],
        ["Saldo em Aberto", formatCurrency(metrics.totalAberto)],
        ["Total Vencido", formatCurrency(metrics.totalVencido)],
        ["Taxa de Pagamento", `${metrics.taxaPagamento.toFixed(1)}%`],
        ["Taxa de Inadimplência", `${metrics.taxaInadimplencia.toFixed(1)}%`],
      ];

      autoTable(doc, {
        startY: y,
        body: summaryRows,
        theme: "plain",
        styles: { fontSize: 9 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 60 },
          1: { halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Titles table
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PARCELAS", margin, y);
      y += 4;

      const titulosData = titulos.map((t) => [
        `#${t.title_number}`,
        t.installment_label || t.notes || `Parcela ${t.installment_number || 1}`,
        format(new Date(t.due_date), "dd/MM/yyyy"),
        formatCurrency(t.amount),
        formatCurrency(t.balance),
        t.status === "paid" ? "Pago" : t.status === "partial" ? "Parcial" : t.status === "cancelled" ? "Cancelado" : t.status === "renegotiated" ? "Renegociado" : "Aberto",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Nº", "Descrição", "Vencimento", "Valor", "Saldo", "Status"]],
        body: titulosData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Payments table
      if (pagamentos.length > 0) {
        if (y > 240) { doc.addPage(); y = 15; }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text("RECEBIMENTOS", margin, y);
        y += 4;

        const pagData = pagamentos.map((p) => [
          p.payment_date ? format(new Date(p.payment_date), "dd/MM/yyyy") : "—",
          METHOD_LABELS[p.payment_method || ""] || p.payment_method || "—",
          formatCurrency(p.value),
          p.status === "completed" ? "Confirmado" : p.status === "reversed" ? "Estornado" : p.status || "—",
        ]);

        autoTable(doc, {
          startY: y,
          head: [["Data", "Forma", "Valor", "Status"]],
          body: pagData,
          theme: "striped",
          headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold", fontSize: 8 },
          styles: { fontSize: 8 },
          margin: { left: margin, right: margin },
        });
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Documento sem valor fiscal", margin, footerY);
      doc.text(
        `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        pageWidth / 2, footerY, { align: "center" }
      );

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Extrato gerado com sucesso");
    } catch (error) {
      console.error("Erro ao gerar extrato:", error);
      toast.error("Erro ao gerar extrato PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <Button onClick={handleExportPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Extrato PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--success-green))]" />
              <p className="text-xs text-muted-foreground">Taxa Pagamento</p>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--success-green))]">{metrics.taxaPagamento.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Inadimplência</p>
            </div>
            <p className={`text-2xl font-bold ${metrics.taxaInadimplencia > 0 ? "text-destructive" : "text-[hsl(var(--success-green))]"}`}>
              {metrics.taxaInadimplencia.toFixed(1)}%
            </p>
            {metrics.qtdVencido > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.qtdVencido} título(s) vencido(s)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total Recebido</p>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--success-green))]">{formatCurrency(metrics.totalPago)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Total Vencido</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(metrics.totalVencido)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment evolution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Evolução de Pagamentos (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evolutionData.some((d) => d.pago > 0 || d.vencido > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={evolutionData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name === "pago" ? "Recebido" : "Vencido"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="pago" name="Recebido" fill="hsl(var(--success-green))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vencido" name="Vencido" fill="hsl(var(--error-red))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Sem dados de pagamentos no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment method distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Formas de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {methodDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={methodDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {methodDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Sem pagamentos registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aging breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Detalhamento de Inadimplência
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.totalVencido === 0 ? (
            <div className="text-center py-6">
              <Badge className="bg-[hsl(var(--success-green))]/10 text-[hsl(var(--success-green))] text-sm px-4 py-1">
                ✓ Paciente em dia — sem títulos vencidos
              </Badge>
            </div>
          ) : (
            <div className="space-y-3">
              {titulos
                .filter((t) => (t.status === "open" || t.status === "partial") && new Date(t.due_date) < new Date())
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .map((t) => {
                  const days = Math.floor((Date.now() - new Date(t.due_date).getTime()) / 86400000);
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <div>
                        <p className="font-medium text-sm">
                          {t.installment_label || t.notes || `Parcela ${t.installment_number || 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Venceu em {format(new Date(t.due_date), "dd/MM/yyyy")} — <span className="text-destructive font-medium">{days} dias atrás</span>
                        </p>
                      </div>
                      <span className="font-bold text-destructive">{formatCurrency(t.balance)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
