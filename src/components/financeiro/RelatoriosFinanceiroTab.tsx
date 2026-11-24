import { CORES_CATEGORICAS, CORES_GRAFICO } from "@/lib/coresGrafico";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { separarMoeda } from "@/lib/moeda";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from "recharts";
import { Users, FileText, Download, Calendar, AlertTriangle, CreditCard, FileSpreadsheet, Printer} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useReportExport } from "@/hooks/useReportExport";
import { formatCurrency } from "@/lib/utils";

interface RelatoriosFinanceiroTabProps {
  clinicId: string;
}

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
  id: string;
  nome: string;
  receita: number;
  procedimentos: number;
  ticketMedio: number;
}

interface ProcedureRevenue {
  id: string;
  nome: string;
  quantidade: number;
  receita: number;
  ticketMedio: number;
}

interface PaymentMethodData {
  method: string;
  label: string;
  valor: number;
  quantidade: number;
  percentual: number;
}

interface AgingData {
  faixa: string;
  valor: number;
  quantidade: number;
  cor: string;
}

const COLORS = CORES_CATEGORICAS;

export const RelatoriosFinanceiroTab = ({ clinicId }: RelatoriosFinanceiroTabProps) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dre");
  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [professionalRevenue, setProfessionalRevenue] = useState<ProfessionalRevenue[]>([]);
  const [procedureRevenue, setProcedureRevenue] = useState<ProcedureRevenue[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);

  const { exportToPDF, exportToExcel } = useReportExport();

  const getExportData = () => ({
    dreData,
    professionalRevenue,
    procedureRevenue,
    paymentMethods,
    agingData,
    periodo,
  });

  const handleExportPDF = (type: "all" | "dre" | "profissionais" | "procedimentos" | "pagamentos" | "inadimplencia") => {
    exportToPDF(getExportData(), type);
  };

  const handleExportExcel = (type: "all" | "dre" | "profissionais" | "procedimentos" | "pagamentos" | "inadimplencia") => {
    exportToExcel(getExportData(), type);
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    loadAllData();
  }, [clinicId, periodo]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDREData(),
        loadProfessionalRevenue(),
        loadProcedureRevenue(),
        loadPaymentMethods(),
        loadAgingData(),
        loadMonthlyTrend(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      toast.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const [year, month] = periodo.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
    return { startDate, endDate };
  };

  const loadDREData = async () => {
    const { startDate, endDate } = getDateRange();

    // Receitas
    const { data: receitas } = await supabase
      .from("receivable_titles")
      .select("amount, taxa_adquirente, valor_liquido, status")
      .eq("clinic_id", clinicId)
      .gte("due_date", startDate)
      .lte("due_date", endDate)
      .eq("status", "paid");

    const receitaBruta = (receitas || []).reduce((sum, r) => sum + (r.amount || 0), 0);
    const taxasFinanceiras = (receitas || []).reduce((sum, r) => sum + (r.taxa_adquirente || 0), 0);
    const receitaLiquida = receitaBruta - taxasFinanceiras;

    // Despesas - buscar com expense_item para classificar
    const { data: despesas } = await supabase
      .from("payable_titles")
      .select(`
        amount, status, description,
        expense_item:expense_items(nome, group:expense_groups(nome, macro:expense_macro_types(nome)))
      `)
      .eq("clinic_id", clinicId)
      .gte("due_date", startDate)
      .lte("due_date", endDate)
      .eq("status", "paid");

    let despesasFixas = 0;
    let despesasVariaveis = 0;
    let laboratorio = 0;
    let despesasFinanceirasVal = 0;

    (despesas || []).forEach((d: any) => {
      const macroName = d.expense_item?.group?.macro?.nome?.toLowerCase() || "";
      const groupName = d.expense_item?.group?.nome?.toLowerCase() || "";
      const desc = (d.description || "").toLowerCase();
      
      if (macroName.includes("fixa") || desc.includes("aluguel") || desc.includes("conta")) {
        despesasFixas += d.amount || 0;
      } else if (macroName.includes("laboratório") || macroName.includes("prótese") || desc.includes("lab")) {
        laboratorio += d.amount || 0;
      } else if (macroName.includes("financeira") || desc.includes("taxa") || desc.includes("juros")) {
        despesasFinanceirasVal += d.amount || 0;
      } else {
        despesasVariaveis += d.amount || 0;
      }
    });

    // Comissões - usar valor_liquido_pagar para comissões pagas
    const { data: comissoes } = await supabase
      .from("comissoes_provisoes")
      .select("valor_liquido_pagar")
      .eq("clinic_id", clinicId)
      .eq("competencia", periodo)
      .eq("status", "pago");

    const comissoesTotal = (comissoes || []).reduce((sum: number, c: any) => sum + (c.valor_liquido_pagar || 0), 0);

    const despesasOperacionais = despesasFixas + despesasVariaveis;
    const custoServicos = laboratorio + comissoesTotal;
    const resultadoOperacional = receitaLiquida - custoServicos - despesasOperacionais;
    const resultadoLiquido = resultadoOperacional - despesasFinanceirasVal;

    setDreData({
      receitaBruta,
      taxasFinanceiras,
      receitaLiquida,
      custoServicos,
      despesasOperacionais,
      despesasFixas,
      despesasVariaveis,
      comissoes: comissoesTotal,
      laboratorio,
      resultadoOperacional,
      despesasFinanceiras: despesasFinanceirasVal,
      resultadoLiquido,
    });
  };

  const loadProfessionalRevenue = async () => {
    const { startDate, endDate } = getDateRange();

    const { data: budgetItems } = await supabase
      .from("budget_items")
      .select(`
        total_price,
        professional_id,
        profissional:profissionais(nome),
        budget:budgets!inner(status, approved_at)
      `)
      .eq("budget.status", "approved")
      .gte("budget.approved_at", startDate)
      .lte("budget.approved_at", endDate + "T23:59:59");

    const profMap = new Map<string, { nome: string; receita: number; procedimentos: number }>();

    (budgetItems || []).forEach((item: any) => {
      if (!item.professional_id) return;
      const existing = profMap.get(item.professional_id) || { 
        nome: item.profissional?.nome || "Sem nome", 
        receita: 0, 
        procedimentos: 0 
      };
      existing.receita += item.total_price || 0;
      existing.procedimentos += 1;
      profMap.set(item.professional_id, existing);
    });

    const result: ProfessionalRevenue[] = Array.from(profMap.entries()).map(([id, data]) => ({
      id,
      nome: data.nome,
      receita: data.receita,
      procedimentos: data.procedimentos,
      ticketMedio: data.procedimentos > 0 ? data.receita / data.procedimentos : 0,
    })).sort((a, b) => b.receita - a.receita);

    setProfessionalRevenue(result);
  };

  const loadProcedureRevenue = async () => {
    const { startDate, endDate } = getDateRange();

    const { data: budgetItems } = await supabase
      .from("budget_items")
      .select(`
        total_price,
        procedure_name,
        procedure_id,
        budget:budgets!inner(status, approved_at)
      `)
      .eq("budget.status", "approved")
      .gte("budget.approved_at", startDate)
      .lte("budget.approved_at", endDate + "T23:59:59");

    const procMap = new Map<string, { nome: string; receita: number; quantidade: number }>();

    (budgetItems || []).forEach((item: any) => {
      const key = item.procedure_id || item.procedure_name || "Outros";
      const existing = procMap.get(key) || { 
        nome: item.procedure_name || "Sem nome", 
        receita: 0, 
        quantidade: 0 
      };
      existing.receita += item.total_price || 0;
      existing.quantidade += 1;
      procMap.set(key, existing);
    });

    const result: ProcedureRevenue[] = Array.from(procMap.entries()).map(([id, data]) => ({
      id,
      nome: data.nome,
      receita: data.receita,
      quantidade: data.quantidade,
      ticketMedio: data.quantidade > 0 ? data.receita / data.quantidade : 0,
    })).sort((a, b) => b.receita - a.receita).slice(0, 10);

    setProcedureRevenue(result);
  };

  const loadPaymentMethods = async () => {
    const { startDate, endDate } = getDateRange();

    const { data: payments } = await supabase
      .from("payments")
      .select("payment_method, value")
      .eq("status", "completed")
      .gte("payment_date", startDate)
      .lte("payment_date", endDate);

    const methodMap = new Map<string, { valor: number; quantidade: number }>();
    let total = 0;

    (payments || []).forEach((p) => {
      const method = p.payment_method || "outros";
      const existing = methodMap.get(method) || { valor: 0, quantidade: 0 };
      existing.valor += p.value || 0;
      existing.quantidade += 1;
      total += p.value || 0;
      methodMap.set(method, existing);
    });

    const labels: Record<string, string> = {
      pix: "PIX",
      dinheiro: "Dinheiro",
      cartao_credito: "Cartão Crédito",
      cartao_debito: "Cartão Débito",
      boleto: "Boleto",
      transferencia: "Transferência",
      cheque: "Cheque",
      outros: "Outros",
    };

    const result: PaymentMethodData[] = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      label: labels[method] || method,
      valor: data.valor,
      quantidade: data.quantidade,
      percentual: total > 0 ? (data.valor / total) * 100 : 0,
    })).sort((a, b) => b.valor - a.valor);

    setPaymentMethods(result);
  };

  const loadAgingData = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: titles } = await supabase
      .from("receivable_titles")
      .select("balance, due_date, status")
      .eq("clinic_id", clinicId)
      .neq("status", "paid")
      .neq("status", "cancelled");

    const aging = {
      aVencer: { valor: 0, quantidade: 0 },
      "1-30": { valor: 0, quantidade: 0 },
      "31-60": { valor: 0, quantidade: 0 },
      "61-90": { valor: 0, quantidade: 0 },
      "90+": { valor: 0, quantidade: 0 },
    };

    (titles || []).forEach((t) => {
      const dueDate = new Date(t.due_date);
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        aging.aVencer.valor += t.balance;
        aging.aVencer.quantidade += 1;
      } else if (diffDays <= 30) {
        aging["1-30"].valor += t.balance;
        aging["1-30"].quantidade += 1;
      } else if (diffDays <= 60) {
        aging["31-60"].valor += t.balance;
        aging["31-60"].quantidade += 1;
      } else if (diffDays <= 90) {
        aging["61-90"].valor += t.balance;
        aging["61-90"].quantidade += 1;
      } else {
        aging["90+"].valor += t.balance;
        aging["90+"].quantidade += 1;
      }
    });

    setAgingData([
      { faixa: "A Vencer", valor: aging.aVencer.valor, quantidade: aging.aVencer.quantidade, cor: CORES_GRAFICO.neutra },
      { faixa: "1-30 dias", valor: aging["1-30"].valor, quantidade: aging["1-30"].quantidade, cor: "hsl(var(--sinal-espera) / 0.7)" },
      { faixa: "31-60 dias", valor: aging["31-60"].valor, quantidade: aging["31-60"].quantidade, cor: "hsl(var(--sinal-espera))" },
      { faixa: "61-90 dias", valor: aging["61-90"].valor, quantidade: aging["61-90"].quantidade, cor: "hsl(var(--sinal-alerta) / 0.75)" },
      { faixa: "90+ dias", valor: aging["90+"].valor, quantidade: aging["90+"].quantidade, cor: "hsl(var(--sinal-alerta))" },
    ]);
  };

  const loadMonthlyTrend = async () => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, date.getMonth() + 1, 0).toISOString().split("T")[0];
      
      months.push({
        periodo: `${month}/${year}`,
        startDate,
        endDate,
        receitas: 0,
        despesas: 0,
      });
    }

    // Load data for each month
    for (const m of months) {
      const { data: receitas } = await supabase
        .from("receivable_titles")
        .select("amount")
        .eq("clinic_id", clinicId)
        .gte("due_date", m.startDate)
        .lte("due_date", m.endDate)
        .eq("status", "paid");

      const { data: despesas } = await supabase
        .from("payable_titles")
        .select("amount")
        .eq("clinic_id", clinicId)
        .gte("due_date", m.startDate)
        .lte("due_date", m.endDate)
        .eq("status", "paid");

      m.receitas = (receitas || []).reduce((sum, r) => sum + (r.amount || 0), 0);
      m.despesas = (despesas || []).reduce((sum, d) => sum + (d.amount || 0), 0);
    }

    setMonthlyTrend(months.map(m => ({
      name: m.periodo,
      receitas: m.receitas,
      despesas: m.despesas,
      resultado: m.receitas - m.despesas,
    })));
  };


  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com filtro de período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-semibold">Relatórios Financeiros</h2>
          <p className="text-sm text-muted-foreground">Análise completa do desempenho financeiro</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Exportar PDF</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExportPDF("all")} className="gap-2">
                <FileText className="h-4 w-4" />
                Relatório Completo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF(activeTab as any)} className="gap-2">
                <FileText className="h-4 w-4" />
                Aba Atual ({activeTab === "dre" ? "DRE" : activeTab === "profissionais" ? "Profissionais" : activeTab === "procedimentos" ? "Procedimentos" : activeTab === "pagamentos" ? "Pagamentos" : "Inadimplência"})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Exportar Excel</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExportExcel("all")} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Relatório Completo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel(activeTab as any)} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Aba Atual
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center">Relatórios Financeiros</h1>
        <p className="text-center text-muted-foreground">
          Período: {getMonthOptions().find(o => o.value === periodo)?.label}
        </p>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Gerado em: {new Date().toLocaleString("pt-BR")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-1 print:hidden">
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="profissionais">Por Profissional</TabsTrigger>
          <TabsTrigger value="procedimentos">Por Procedimento</TabsTrigger>
          <TabsTrigger value="pagamentos">Formas de Pgto</TabsTrigger>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
        </TabsList>

        {/* DRE Tab */}
        <TabsContent value="dre" className="space-y-6">
          <FaixaIndicadores
            itens={[
              { rotulo: "Receita bruta", ...separarMoeda(formatCurrency(dreData?.receitaBruta || 0)) },
              {
                rotulo: "Despesas totais",
                ...separarMoeda(formatCurrency((dreData?.despesasOperacionais || 0) + (dreData?.custoServicos || 0))),
              },
              {
                rotulo: "Resultado líquido",
                ...separarMoeda(formatCurrency(dreData?.resultadoLiquido || 0)),
                tom: (dreData?.resultadoLiquido || 0) < 0 ? "alerta" : "padrao",
              },
              {
                rotulo: "Margem líquida",
                valor: dreData?.receitaBruta ? ((dreData.resultadoLiquido / dreData.receitaBruta) * 100).toFixed(1) : 0,
                sufixo: "%",
              },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DRE Detalhado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">DRE - Demonstração do Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b font-medium">
                    <span>RECEITA BRUTA</span>
                    <span className="text-green-600">{formatCurrency(dreData?.receitaBruta || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm text-red-600 pl-4">
                    <span>(-) Taxas Financeiras (MDR)</span>
                    <span>-{formatCurrency(dreData?.taxasFinanceiras || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b font-medium">
                    <span>RECEITA LÍQUIDA</span>
                    <span>{formatCurrency(dreData?.receitaLiquida || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between py-1 text-sm text-red-600 pl-4">
                    <span>(-) Laboratório</span>
                    <span>-{formatCurrency(dreData?.laboratorio || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm text-red-600 pl-4">
                    <span>(-) Comissões</span>
                    <span>-{formatCurrency(dreData?.comissoes || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b font-medium">
                    <span>LUCRO BRUTO</span>
                    <span>{formatCurrency((dreData?.receitaLiquida || 0) - (dreData?.custoServicos || 0))}</span>
                  </div>

                  <div className="flex justify-between py-1 text-sm text-red-600 pl-4">
                    <span>(-) Despesas Fixas</span>
                    <span>-{formatCurrency(dreData?.despesasFixas || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm text-red-600 pl-4">
                    <span>(-) Despesas Variáveis</span>
                    <span>-{formatCurrency(dreData?.despesasVariaveis || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b font-medium">
                    <span>RESULTADO OPERACIONAL</span>
                    <span className={dreData?.resultadoOperacional && dreData.resultadoOperacional >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(dreData?.resultadoOperacional || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 text-sm text-red-600 pl-4">
                    <span>(-) Despesas Financeiras</span>
                    <span>-{formatCurrency(dreData?.despesasFinanceiras || 0)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
                    <span>RESULTADO LÍQUIDO</span>
                    <span className={dreData?.resultadoLiquido && dreData.resultadoLiquido >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(dreData?.resultadoLiquido || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de tendência */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CORES_GRAFICO.grade} vertical={false} />
                    <XAxis stroke={CORES_GRAFICO.eixo} tickLine={false} dataKey="name" fontSize={12} />
                    <YAxis stroke={CORES_GRAFICO.eixo} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="receitas" name="Receitas" fill={CORES_GRAFICO.destaque} fillOpacity={0.12} stroke={CORES_GRAFICO.destaque} strokeWidth={2} />
                    <Area type="monotone" dataKey="despesas" name="Despesas" fill={CORES_GRAFICO.neutra} fillOpacity={0.12} stroke={CORES_GRAFICO.neutra} strokeWidth={2} />
                    <Line type="monotone" dataKey="resultado" name="Resultado" stroke={CORES_GRAFICO.apoio} strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profissionais Tab */}
        <TabsContent value="profissionais" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Receita por Profissional
                </CardTitle>
              </CardHeader>
              <CardContent>
                {professionalRevenue.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={professionalRevenue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={CORES_GRAFICO.grade} vertical={false} />
                      <XAxis stroke={CORES_GRAFICO.eixo} tickLine={false} type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis stroke={CORES_GRAFICO.eixo} tickLine={false} axisLine={false} type="category" dataKey="nome" width={120} fontSize={12} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="receita" fill={CORES_GRAFICO.destaque} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Procs</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Ticket</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professionalRevenue.map((prof) => (
                      <TableRow key={prof.id}>
                        <TableCell className="font-medium">{prof.nome}</TableCell>
                        <TableCell className="text-right">{prof.procedimentos}</TableCell>
                        <TableCell className="text-right">{formatCurrency(prof.receita)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(prof.ticketMedio)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Procedimentos Tab */}
        <TabsContent value="procedimentos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Top 10 Procedimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {procedureRevenue.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={procedureRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CORES_GRAFICO.grade} vertical={false} />
                      <XAxis stroke={CORES_GRAFICO.eixo} tickLine={false} dataKey="nome" fontSize={10} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke={CORES_GRAFICO.eixo} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="receita" fill={CORES_GRAFICO.destaque} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedimento</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Ticket</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedureRevenue.map((proc) => (
                      <TableRow key={proc.id}>
                        <TableCell className="font-medium max-w-[150px] truncate">{proc.nome}</TableCell>
                        <TableCell className="text-right">{proc.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(proc.receita)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(proc.ticketMedio)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Formas de Pagamento Tab */}
        <TabsContent value="pagamentos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Distribuição por Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        dataKey="valor"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ label, percentual }) => `${label}: ${percentual.toFixed(1)}%`}
                      >
                        {paymentMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forma</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((pm, idx) => (
                      <TableRow key={pm.method}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            {pm.label}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{pm.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(pm.valor)}</TableCell>
                        <TableCell className="text-right">{pm.percentual.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inadimplência Tab */}
        <TabsContent value="inadimplencia" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Aging de Recebíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CORES_GRAFICO.grade} vertical={false} />
                    <XAxis stroke={CORES_GRAFICO.eixo} tickLine={false} dataKey="faixa" fontSize={12} />
                    <YAxis stroke={CORES_GRAFICO.eixo} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {agingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento do Aging</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agingData.map((item) => (
                    <div key={item.faixa} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: item.cor }} />
                        <div>
                          <p className="font-medium">{item.faixa}</p>
                          <p className="text-sm text-muted-foreground">{item.quantidade} título(s)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(item.valor)}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between font-bold">
                      <span>Total em Aberto</span>
                      <span>{formatCurrency(agingData.reduce((sum, a) => sum + a.valor, 0))}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
