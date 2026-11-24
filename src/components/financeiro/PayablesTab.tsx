import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, AlertTriangle, Clock, CheckCircle, XCircle,
  DollarSign, Plus, ChevronLeft, ChevronRight, Download, Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NovaDespesaModalV2 } from "./NovaDespesaModalV2";
import { PagamentoDespesaDrawer } from "./PagamentoDespesaDrawer";
import { formatCurrency } from "@/lib/utils";
import { useRelatorioExport } from "@/hooks/useRelatorioExport";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PayableTitle {
  id: string;
  title_number: number;
  description: string;
  supplier_id: string | null;
  category_id: string | null;
  expense_type_id: string | null;
  expense_item_id: string | null;
  due_date: string;
  amount: number;
  balance: number;
  status: string;
  document_number: string | null;
  notes: string | null;
  recurrence: string;
  competencia: string | null;
  centro_custo: string | null;
  supplier?: {
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  category?: {
    nome: string;
    cor: string;
  } | null;
  expense_type?: {
    nome: string;
    tipo: string;
  } | null;
}

interface AgingSummary {
  aVencer: number;
  vencido1a30: number;
  vencido31a60: number;
  vencido60mais: number;
  total: number;
  totalPago: number;
}

interface PayablesTabProps {
  clinicId: string;
}

const PAGE_SIZE = 25;

export const PayablesTab = ({ clinicId }: PayablesTabProps) => {
  const [titles, setTitles] = useState<PayableTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agingFilter, setAgingFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<PayableTitle | null>(null);
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [showNovaDespesa, setShowNovaDespesa] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  const { exportToCSV, exportToExcel, exportToPDF } = useRelatorioExport();

  useEffect(() => {
    loadTitles();
  }, [clinicId, statusFilter]);

  const loadTitles = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("payable_titles")
        .select(`
          *,
          supplier:suppliers(razao_social, nome_fantasia),
          category:expense_categories(nome, cor),
          expense_type:expense_types(nome, tipo)
        `)
        .eq("clinic_id", clinicId)
        .order("due_date", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTitles((data || []) as PayableTitle[]);
    } catch (error) {
      console.error("Erro ao carregar títulos:", error);
      toast.error("Erro ao carregar contas a pagar");
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredTitles = useMemo(() => {
    return titles.filter((t) => {
      const supplierName = getSupplierName(t);
      const matchesSearch =
        !searchTerm ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title_number.toString().includes(searchTerm);

      if (!matchesSearch) return false;

      // Period filter
      if (periodFilter !== "all") {
        const due = new Date(t.due_date);
        const now = new Date();
        let start: Date, end: Date;

        switch (periodFilter) {
          case "thisMonth":
            start = startOfMonth(now);
            end = endOfMonth(now);
            break;
          case "lastMonth":
            start = startOfMonth(subMonths(now, 1));
            end = endOfMonth(subMonths(now, 1));
            break;
          case "nextMonth":
            start = startOfMonth(addMonths(now, 1));
            end = endOfMonth(addMonths(now, 1));
            break;
          case "next3Months":
            start = now;
            end = endOfMonth(addMonths(now, 3));
            break;
          default:
            start = new Date(0);
            end = new Date(9999, 11);
        }

        if (due < start || due > end) return false;
      }

      // Aging filter
      if (agingFilter !== "all") {
        const days = getDaysOverdue(t.due_date);
        if (t.status === "paid" || t.status === "cancelled") return false;

        switch (agingFilter) {
          case "aVencer": return days < 0;
          case "vencido1a30": return days >= 0 && days <= 30;
          case "vencido31a60": return days > 30 && days <= 60;
          case "vencido60mais": return days > 60;
        }
      }

      return true;
    });
  }, [titles, searchTerm, statusFilter, agingFilter, periodFilter]);

  const aging = useMemo<AgingSummary>(() => {
    const summary: AgingSummary = { aVencer: 0, vencido1a30: 0, vencido31a60: 0, vencido60mais: 0, total: 0, totalPago: 0 };

    titles.forEach((t) => {
      if (t.status === "cancelled") return;
      if (t.status === "paid") { summary.totalPago += t.amount; return; }

      const days = getDaysOverdue(t.due_date);
      summary.total += t.balance;

      if (days < 0) summary.aVencer += t.balance;
      else if (days <= 30) summary.vencido1a30 += t.balance;
      else if (days <= 60) summary.vencido31a60 += t.balance;
      else summary.vencido60mais += t.balance;
    });

    return summary;
  }, [titles]);

  const totalPages = Math.ceil(filteredTitles.length / PAGE_SIZE);
  const pagedTitles = filteredTitles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Totals for filtered view
  const filteredTotals = useMemo(() => {
    const totals = { amount: 0, balance: 0, paid: 0 };
    filteredTitles.forEach((t) => {
      totals.amount += t.amount;
      totals.balance += t.balance;
      totals.paid += (t.amount - t.balance);
    });
    return totals;
  }, [filteredTitles]);

  function getSupplierName(title: PayableTitle) {
    if (!title.supplier) return "Sem fornecedor";
    return title.supplier.nome_fantasia || title.supplier.razao_social;
  }

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = due < today && status !== "paid" && status !== "cancelled";

    if (status === "paid") {
      return <Badge className="bg-[hsl(var(--success-green))]/10 text-[hsl(var(--success-green))] hover:bg-[hsl(var(--success-green))]/10"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
    }
    if (status === "cancelled") {
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
    }
    if (isOverdue) {
      return <Badge className="bg-[hsl(var(--error-red))]/10 text-[hsl(var(--error-red))] hover:bg-[hsl(var(--error-red))]/10"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
    }
    if (status === "partial") {
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100"><Clock className="h-3 w-3 mr-1" />Parcial</Badge>;
    }
    return <Badge className="bg-[hsl(var(--flowdent-blue))]/10 text-[hsl(var(--flowdent-blue))] hover:bg-[hsl(var(--flowdent-blue))]/10"><Clock className="h-3 w-3 mr-1" />Em aberto</Badge>;
  };

  const handlePayment = (title: PayableTitle) => {
    setSelectedTitle(title);
    setShowPaymentDrawer(true);
  };

  const handleCancel = async (title: PayableTitle) => {
    const reason = prompt("Motivo do cancelamento:");
    if (!reason) return;

    try {
      const { error } = await supabase
        .from("payable_titles")
        .update({ status: "cancelled", notes: `${title.notes || ""}\n[CANCELADO] ${reason}`.trim() })
        .eq("id", title.id);

      if (error) throw error;
      toast.success("Título cancelado com sucesso");
      loadTitles();
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      toast.error("Erro ao cancelar título");
    }
  };

  const handleBatchPayment = () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um título");
      return;
    }
    // Pay the first selected — sequential workflow
    const firstId = Array.from(selectedIds)[0];
    const title = titles.find((t) => t.id === firstId);
    if (title) handlePayment(title);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const openTitles = pagedTitles.filter((t) => t.status !== "paid" && t.status !== "cancelled");
    if (selectedIds.size === openTitles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(openTitles.map((t) => t.id)));
    }
  };

  // Export
  const exportColumns = [
    { header: "Nº", key: "title_number" },
    { header: "Fornecedor", key: "supplier_name" },
    { header: "Descrição", key: "description" },
    { header: "Vencimento", key: "due_date_fmt" },
    { header: "Valor", key: "amount_fmt" },
    { header: "Saldo", key: "balance_fmt" },
    { header: "Status", key: "status" },
  ];

  const exportData = filteredTitles.map((t) => ({
    title_number: `#${t.title_number}`,
    supplier_name: getSupplierName(t),
    description: t.description,
    due_date_fmt: new Date(t.due_date).toLocaleDateString("pt-BR"),
    amount_fmt: formatCurrency(t.amount),
    balance_fmt: formatCurrency(t.balance),
    status: t.status === "paid" ? "Pago" : t.status === "cancelled" ? "Cancelado" : t.status === "partial" ? "Parcial" : "Aberto",
  }));

  const handleExport = (type: "csv" | "excel" | "pdf") => {
    const fileName = `contas-a-pagar-${format(new Date(), "yyyy-MM-dd")}`;
    if (type === "csv") exportToCSV(exportData, exportColumns, fileName);
    else if (type === "excel") exportToExcel(exportData, exportColumns, fileName);
    else exportToPDF(exportData, exportColumns, fileName, "Contas a Pagar");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Aging Cards */}
      <div className="flex lg:grid lg:grid-cols-6 gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
        <Card
          className={`cursor-pointer transition-all flex-shrink-0 w-[130px] lg:w-auto ${agingFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setAgingFilter("all"); setPage(0); }}
        >
          <CardContent className="p-3 lg:pt-4">
            <div className="text-xs font-medium text-muted-foreground">Total a Pagar</div>
            <div className="text-lg lg:text-2xl font-bold">{formatCurrency(aging.total)}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 border-l-[hsl(var(--flowdent-blue))] flex-shrink-0 w-[130px] lg:w-auto ${agingFilter === "aVencer" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setAgingFilter("aVencer"); setPage(0); }}
        >
          <CardContent className="p-3 lg:pt-4">
            <div className="text-xs font-medium text-muted-foreground">A Vencer</div>
            <div className="text-lg lg:text-2xl font-bold text-[hsl(var(--flowdent-blue))]">{formatCurrency(aging.aVencer)}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 border-l-amber-500 flex-shrink-0 w-[130px] lg:w-auto ${agingFilter === "vencido1a30" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setAgingFilter("vencido1a30"); setPage(0); }}
        >
          <CardContent className="p-3 lg:pt-4">
            <div className="text-xs font-medium text-muted-foreground">1-30 dias</div>
            <div className="text-lg lg:text-2xl font-bold text-amber-600">{formatCurrency(aging.vencido1a30)}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 border-l-orange-500 flex-shrink-0 w-[130px] lg:w-auto ${agingFilter === "vencido31a60" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setAgingFilter("vencido31a60"); setPage(0); }}
        >
          <CardContent className="p-3 lg:pt-4">
            <div className="text-xs font-medium text-muted-foreground">31-60 dias</div>
            <div className="text-lg lg:text-2xl font-bold text-orange-600">{formatCurrency(aging.vencido31a60)}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 border-l-[hsl(var(--error-red))] flex-shrink-0 w-[130px] lg:w-auto ${agingFilter === "vencido60mais" ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setAgingFilter("vencido60mais"); setPage(0); }}
        >
          <CardContent className="p-3 lg:pt-4">
            <div className="text-xs font-medium text-muted-foreground">60+ dias</div>
            <div className="text-lg lg:text-2xl font-bold text-[hsl(var(--error-red))]">{formatCurrency(aging.vencido60mais)}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-l-4 border-l-[hsl(var(--success-green))] flex-shrink-0 w-[130px] lg:w-auto`}
        >
          <CardContent className="p-3 lg:pt-4">
            <div className="text-xs font-medium text-muted-foreground">Total Pago</div>
            <div className="text-lg lg:text-2xl font-bold text-[hsl(var(--success-green))]">{formatCurrency(aging.totalPago)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor ou descrição..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="thisMonth">Mês atual</SelectItem>
            <SelectItem value="lastMonth">Mês anterior</SelectItem>
            <SelectItem value="nextMonth">Próximo mês</SelectItem>
            <SelectItem value="next3Months">Próximos 3 meses</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Select onValueChange={(v) => handleExport(v as "csv" | "excel" | "pdf")}>
            <SelectTrigger className="w-full md:w-[130px]">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Exportar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setShowNovaDespesa(true)} className="bg-[hsl(var(--error-red))] hover:bg-[hsl(var(--error-red))]/90 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Batch actions */}
      {batchMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <Button size="sm" onClick={handleBatchPayment}>
            <DollarSign className="h-4 w-4 mr-1" />
            Baixar Selecionados
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBatchMode(false); }}>
            Cancelar Seleção
          </Button>
        </div>
      )}

      {/* List */}
      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 md:p-12 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : filteredTitles.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <div className="inline-block p-4 bg-muted rounded-lg mb-4">
              <DollarSign className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
            </div>
            <p className="text-base md:text-lg font-medium">Nenhuma despesa encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== "all" || searchTerm ? "Tente alterar os filtros" : "Adicione uma nova despesa para começar"}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="lg:hidden divide-y">
              {pagedTitles.map((title) => {
                const daysOverdue = getDaysOverdue(title.due_date);
                const isOverdue = daysOverdue > 0 && title.status !== "paid" && title.status !== "cancelled";
                return (
                  <div
                    key={title.id}
                    className={`p-4 space-y-3 ${isOverdue ? "bg-destructive/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{title.description}</p>
                        <p className="text-sm text-muted-foreground">{getSupplierName(title)}</p>
                      </div>
                      {getStatusBadge(title.status, title.due_date)}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Venc: </span>
                        {new Date(title.due_date).toLocaleDateString("pt-BR")}
                        {isOverdue && (
                          <span className="text-xs text-[hsl(var(--error-red))] ml-1">({daysOverdue}d)</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(title.balance)}</div>
                        {title.balance !== title.amount && (
                          <div className="text-xs text-muted-foreground line-through">{formatCurrency(title.amount)}</div>
                        )}
                      </div>
                    </div>

                    {title.category && (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: title.category.cor }}
                        />
                        <span className="text-xs text-muted-foreground">{title.category.nome}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {title.status !== "paid" && title.status !== "cancelled" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePayment(title)}
                            className="flex-1"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Baixar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(title)}
                            className="text-[hsl(var(--error-red))]"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table */}
            <Table className="hidden lg:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === pagedTitles.filter((t) => t.status !== "paid" && t.status !== "cancelled").length}
                      onCheckedChange={() => { setBatchMode(true); toggleSelectAll(); }}
                    />
                  </TableHead>
                  <TableHead>Nº</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTitles.map((title) => {
                  const daysOverdue = getDaysOverdue(title.due_date);
                  const isOverdue = daysOverdue > 0 && title.status !== "paid" && title.status !== "cancelled";
                  const isOpen = title.status !== "paid" && title.status !== "cancelled";
                  return (
                    <TableRow key={title.id} className={isOverdue ? "bg-destructive/5" : ""}>
                      <TableCell>
                        {isOpen && (
                          <Checkbox
                            checked={selectedIds.has(title.id)}
                            onCheckedChange={() => { setBatchMode(true); toggleSelect(title.id); }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">#{title.title_number}</TableCell>
                      <TableCell>
                        <div className="font-medium max-w-[150px] truncate">{getSupplierName(title)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">{title.description}</div>
                      </TableCell>
                      <TableCell>
                        {title.category && (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: title.category.cor }}
                            />
                            <span className="text-sm truncate">{title.category.nome}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{new Date(title.due_date).toLocaleDateString("pt-BR")}</div>
                          {isOverdue && (
                            <div className="text-xs text-[hsl(var(--error-red))]">{daysOverdue} dias atrás</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(title.amount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(title.balance)}</TableCell>
                      <TableCell>{getStatusBadge(title.status, title.due_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isOpen && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePayment(title)}
                                className="text-[hsl(var(--success-green))] hover:text-[hsl(var(--success-green))]"
                                title="Baixar pagamento"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancel(title)}
                                className="text-[hsl(var(--error-red))] hover:text-[hsl(var(--error-red))]"
                                title="Cancelar título"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="text-right font-medium">Totais filtrados:</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(filteredTotals.amount)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(filteredTotals.balance)}</TableCell>
                  <TableCell colSpan={2}>
                    <span className="text-xs text-muted-foreground">Pago: {formatCurrency(filteredTotals.paid)}</span>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredTitles.length)} de {filteredTitles.length}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Nova Despesa Modal */}
      <NovaDespesaModalV2
        open={showNovaDespesa}
        onOpenChange={setShowNovaDespesa}
        clinicId={clinicId}
        onSuccess={() => {
          loadTitles();
          setShowNovaDespesa(false);
        }}
      />

      {/* Payment Drawer */}
      {selectedTitle && (
        <PagamentoDespesaDrawer
          open={showPaymentDrawer}
          onOpenChange={setShowPaymentDrawer}
          title={selectedTitle}
          clinicId={clinicId}
          onSuccess={() => {
            loadTitles();
            setShowPaymentDrawer(false);
            setSelectedTitle(null);
            // Remove from batch selection
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (selectedTitle) next.delete(selectedTitle.id);
              return next;
            });
          }}
        />
      )}
    </div>
  );
};
