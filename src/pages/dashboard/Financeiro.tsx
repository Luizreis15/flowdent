import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Plus, Download, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useRelatorioExport } from "@/hooks/useRelatorioExport";
import { NovaTransacaoModal } from "@/components/financeiro/NovaTransacaoModal";
import { ComissoesTab } from "@/components/financeiro/ComissoesTab";
import { ReceivablesTab } from "@/components/financeiro/ReceivablesTab";
import { PayablesTab } from "@/components/financeiro/PayablesTab";
import { RecorrenciasTab } from "@/components/financeiro/RecorrenciasTab";
import { CalendarioFinanceiro } from "@/components/financeiro/CalendarioFinanceiro";
import { RelatoriosFinanceiroTab } from "@/components/financeiro/RelatoriosFinanceiroTab";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  date: string;
  value: number;
  category: string | null;
  reference: string | null;
}

const Financeiro = () => {
  const { clinicId: authClinicId } = useAuth();
  const { can } = usePermissions();
  const { exportToCSV, exportToExcel } = useRelatorioExport();
  const clinicId = authClinicId || "";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("de hoje");
  const [activeTab, setActiveTab] = useState("fluxo");
  const [aReceber, setAReceber] = useState(0);
  const [aPagar, setAPagar] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "receita" | "despesa">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!clinicId) return;
    loadTransactions();
    loadOpenBalances();
  }, [clinicId, periodFilter]);

  const getDateRange = (period: string) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case "de hoje":
        startDate = today;
        endDate = today;
        break;
      case "dessa semana": {
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        endDate = new Date(today);
        endDate.setDate(today.getDate() + (6 - dayOfWeek));
        break;
      }
      case "desse mês":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "do mês passado":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "dos últimos 30 dias":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        endDate = today;
        break;
      case "dos próximos 30 dias":
        startDate = today;
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 30);
        break;
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const { startDate, endDate } = getDateRange(periodFilter);

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const loadOpenBalances = async () => {
    try {
      const [recvRes, payRes] = await Promise.all([
        supabase
          .from("receivable_titles")
          .select("balance, status")
          .eq("clinic_id", clinicId)
          .not("status", "in", "(paid,cancelled,renegotiated)"),
        supabase
          .from("payable_titles")
          .select("balance, status")
          .eq("clinic_id", clinicId)
          .not("status", "in", "(paid,cancelled)"),
      ]);

      if (recvRes.error) throw recvRes.error;
      if (payRes.error) throw payRes.error;

      setAReceber((recvRes.data || []).reduce((sum, t) => sum + Number(t.balance || 0), 0));
      setAPagar((payRes.data || []).reduce((sum, t) => sum + Number(t.balance || 0), 0));
    } catch (error) {
      console.error("Erro ao carregar saldos em aberto:", error);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (term) {
        const haystack = `${t.reference || ""} ${t.category || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, searchTerm]);

  const { receitas, despesas, saldo } = useMemo(() => {
    const receitasSum = filteredTransactions
      .filter((t) => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.value || 0), 0);

    const despesasSum = filteredTransactions
      .filter((t) => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.value || 0), 0);

    return {
      receitas: receitasSum,
      despesas: despesasSum,
      saldo: receitasSum - despesasSum,
    };
  }, [filteredTransactions]);

  const saldoPrevisto = saldo + aReceber - aPagar;

  const hasActiveFilters =
    typeFilter !== "all" || categoryFilter !== "all" || searchTerm.trim().length > 0;

  const clearFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setSearchTerm("");
  };

  const handleExport = (type: "csv" | "excel") => {
    if (filteredTransactions.length === 0) {
      toast.info("Não há transações para exportar");
      return;
    }

    const columns = [
      { header: "Data", key: "date" },
      { header: "Tipo", key: "type" },
      { header: "Descrição", key: "reference" },
      { header: "Categoria", key: "category" },
      { header: "Valor", key: "value" },
    ];

    const rows = filteredTransactions.map((t) => ({
      date: new Date(t.date).toLocaleDateString("pt-BR"),
      type: t.type === "receita" ? "Receita" : "Despesa",
      reference: t.reference || "-",
      category: t.category || "-",
      value: Number(t.value || 0).toFixed(2).replace(".", ","),
    }));

    const fileName = `fluxo-caixa-${format(new Date(), "yyyy-MM-dd")}`;
    if (type === "csv") exportToCSV(rows, columns, fileName);
    else exportToExcel(rows, columns, fileName);
  };

  const handleNovaTransacaoSuccess = () => {
    loadTransactions();
    loadOpenBalances();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-primary text-primary-foreground px-4 md:px-6 py-3 md:py-4 rounded-t-lg shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-2xl font-bold">Financeiro</h1>
          </div>

          {/* Tabs - Scroll horizontal no mobile */}
          <div className="mt-3 md:mt-4 -mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto scrollbar-hide">
            <TabsList className="bg-primary-foreground/10 border-none w-max md:w-auto">
              <TabsTrigger value="fluxo" className="text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-xs md:text-sm px-3 md:px-4">
                FLUXO
              </TabsTrigger>
              <TabsTrigger value="calendario" className="text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-xs md:text-sm px-3 md:px-4">
                CALENDÁRIO
              </TabsTrigger>
              <TabsTrigger value="receber" className="text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-xs md:text-sm px-3 md:px-4">
                RECEBER
              </TabsTrigger>
              <TabsTrigger value="pagar" className="text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-xs md:text-sm px-3 md:px-4">
                PAGAR
              </TabsTrigger>
              <TabsTrigger value="recorrencias" className="text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-xs md:text-sm px-3 md:px-4">
                RECORRÊNCIAS
              </TabsTrigger>
              {can("comissoes", "visualizar") && (
                <TabsTrigger value="comissoes" className="text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-xs md:text-sm px-3 md:px-4">
                  COMISSÕES
                </TabsTrigger>
              )}
              {can("relatorios", "visualizar") && (
                <TabsTrigger value="relatorios" className="text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-xs md:text-sm px-3 md:px-4">
                  RELATÓRIOS
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </div>

        <div className="bg-card rounded-b-lg shadow">
          <TabsContent value="fluxo" className="m-0 p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Filtros - Stack no mobile */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de hoje">de hoje</SelectItem>
                    <SelectItem value="dessa semana">dessa semana</SelectItem>
                    <SelectItem value="desse mês">desse mês</SelectItem>
                    <SelectItem value="do mês passado">do mês passado</SelectItem>
                    <SelectItem value="dos últimos 30 dias">dos últimos 30 dias</SelectItem>
                    <SelectItem value="dos próximos 30 dias">dos próximos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={showFilters || hasActiveFilters ? "default" : "outline"}
                  size="sm"
                  className="flex-1 md:flex-none"
                  onClick={() => setShowFilters((v) => !v)}
                >
                  <Filter className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">FILTRAR</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 md:flex-none">
                      <Download className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">EXPORTAR</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("csv")}>
                      Exportar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("excel")}>
                      Exportar Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
                  onClick={() => setShowNovaTransacao(true)}
                >
                  <Plus className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">ADICIONAR</span>
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/30">
                <div>
                  <label className="text-sm font-medium mb-2 block">Busca</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Descrição ou categoria"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo</label>
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => setTypeFilter(v as "all" | "receita" | "despesa")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="receita">Receitas</SelectItem>
                      <SelectItem value="despesa">Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Categoria</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <div className="md:col-span-3">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Cards de resumo - Scroll no mobile */}
            <div className="flex lg:grid lg:grid-cols-3 gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
              <Card
                className="border-l-4 border-l-[hsl(var(--success-green))] bg-gradient-to-br from-[hsl(145,63%,97%)] to-[hsl(145,63%,94%)] flex-shrink-0 w-[200px] lg:w-auto border-none shadow-md cursor-pointer"
                onClick={() => setActiveTab("receber")}
              >
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs lg:text-sm font-medium text-foreground/70">RECEITAS</span>
                    <div className="p-1.5 rounded-lg bg-[hsl(var(--success-green))]/10">
                      <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-[hsl(var(--success-green))]" />
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-[hsl(var(--success-green))]">
                    {formatCurrency(receitas)}
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">
                    A receber {formatCurrency(aReceber)}
                  </p>
                </CardContent>
              </Card>

              <Card
                className="border-l-4 border-l-[hsl(var(--error-red))] bg-gradient-to-br from-red-50 to-red-100/50 flex-shrink-0 w-[200px] lg:w-auto border-none shadow-md cursor-pointer"
                onClick={() => setActiveTab("pagar")}
              >
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs lg:text-sm font-medium text-foreground/70">DESPESAS</span>
                    <div className="p-1.5 rounded-lg bg-[hsl(var(--error-red))]/10">
                      <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-[hsl(var(--error-red))]" />
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-[hsl(var(--error-red))]">
                    {formatCurrency(despesas)}
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">
                    A pagar {formatCurrency(aPagar)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-[hsl(var(--flowdent-blue))] bg-gradient-to-br from-[hsl(205,84%,97%)] to-[hsl(205,84%,94%)] flex-shrink-0 w-[200px] lg:w-auto border-none shadow-md">
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs lg:text-sm font-medium text-foreground/70">SALDO</span>
                    <div className="p-1.5 rounded-lg bg-[hsl(var(--flowdent-blue))]/10">
                      <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-[hsl(var(--flowdent-blue))]" />
                    </div>
                  </div>
                  <div className={`text-xl lg:text-2xl font-bold ${saldo >= 0 ? "text-[hsl(var(--flowdent-blue))]" : "text-[hsl(var(--error-red))]"}`}>
                    {formatCurrency(saldo)}
                  </div>
                  <div className="mt-1 text-xs text-foreground/60">
                    Previsto {formatCurrency(saldoPrevisto)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de transações */}
            <div className="border rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-8 md:p-12 text-center">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-8 md:p-12 text-center">
                  <div className="inline-block p-4 bg-muted rounded-lg mb-4">
                    <Download className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                  </div>
                  <p className="text-base md:text-lg font-medium">Sem resultados</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasActiveFilters ? "Tente alterar os filtros" : "Nenhuma transação neste período"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile: Cards */}
                  <div className="lg:hidden divide-y">
                    {filteredTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transaction.reference || "-"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString("pt-BR")} • {transaction.category || "-"}
                          </p>
                        </div>
                        <span className={`font-bold whitespace-nowrap ${transaction.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                          {transaction.type === "receita" ? "+" : ""}
                          {formatCurrency(transaction.type === "receita" ? transaction.value : -transaction.value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table */}
                  <Table className="hidden lg:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.date).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>{transaction.reference || "-"}</TableCell>
                          <TableCell>{transaction.category || "-"}</TableCell>
                          <TableCell className="text-right">
                            <span className={transaction.type === "receita" ? "text-green-600" : "text-red-600"}>
                              {transaction.type === "receita" ? "+" : ""}
                              {formatCurrency(transaction.type === "receita" ? transaction.value : -transaction.value)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="receber" className="m-0 p-4 md:p-6">
            {clinicId && <ReceivablesTab clinicId={clinicId} />}
          </TabsContent>

          <TabsContent value="pagar" className="m-0 p-4 md:p-6">
            {clinicId && <PayablesTab clinicId={clinicId} />}
          </TabsContent>

          <TabsContent value="calendario" className="m-0 p-4 md:p-6">
            {clinicId && <CalendarioFinanceiro clinicId={clinicId} />}
          </TabsContent>

          <TabsContent value="recorrencias" className="m-0 p-4 md:p-6">
            {clinicId && <RecorrenciasTab clinicId={clinicId} />}
          </TabsContent>

          <TabsContent value="comissoes" className="m-0 p-4 md:p-6">
            {clinicId && <ComissoesTab clinicId={clinicId} />}
          </TabsContent>

          <TabsContent value="relatorios" className="m-0 p-4 md:p-6">
            {clinicId && <RelatoriosFinanceiroTab clinicId={clinicId} />}
          </TabsContent>
        </div>
      </Tabs>

      {clinicId && (
        <NovaTransacaoModal
          open={showNovaTransacao}
          onOpenChange={setShowNovaTransacao}
          clinicId={clinicId}
          onSuccess={handleNovaTransacaoSuccess}
        />
      )}
    </div>
  );
};

export default Financeiro;
