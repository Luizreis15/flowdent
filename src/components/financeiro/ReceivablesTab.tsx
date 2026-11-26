import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { EsqueletoLista } from "@/components/sistema/EsqueletoLista";
import { separarMoeda } from "@/lib/moeda";
import { useState, useEffect, useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {Search, Filter, AlertTriangle, Clock, CheckCircle, XCircle, DollarSign, FileText, RefreshCcw, ChevronLeft, ChevronRight, Undo2} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentDrawer } from "./PaymentDrawer";
import { RenegociacaoModal } from "./RenegociacaoModal";
import { formatCurrency } from "@/lib/utils";
import { generateRecibo, type ReciboData } from "@/utils/generateRecibo";
import { resolveClinicLogoUrl } from "@/lib/storage";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReceivableTitle {
  id: string;
  title_number: number;
  patient_id: string;
  budget_id: string | null;
  installment_number: number;
  total_installments: number;
  due_date: string;
  amount: number;
  balance: number;
  paid_amount?: number;
  status: string;
  origin: string;
  payment_method: string | null;
  installment_label?: string | null;
  notes: string | null;
  competencia: string | null;
  taxa_adquirente: number | null;
  data_repasse: string | null;
  antecipado: boolean | null;
  valor_liquido: number | null;
  clinic_id?: string;
  patient?: {
    full_name: string;
    phone: string;
  };
}

interface AgingSummary {
  aVencer: number;
  vencido1a30: number;
  vencido31a60: number;
  vencido60mais: number;
  total: number;
  totalPago: number;
}

interface ReceivablesTabProps {
  clinicId: string;
}

const PAGE_SIZE = 25;

const PAYMENT_METHODS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_debito: "Débito",
  cartao_credito: "Crédito",
  transferencia: "Transferência",
  boleto: "Boleto",
  cheque: "Cheque",
  convenio: "Convênio",
};

export const ReceivablesTab = ({ clinicId }: ReceivablesTabProps) => {
  const { can } = usePermissions();
  const canEstorno = can("financeiro", "estorno");
  const [titles, setTitles] = useState<ReceivableTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [agingFilter, setAgingFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<ReceivableTitle | null>(null);
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [renegoOpen, setRenegoOpen] = useState(false);

  useEffect(() => {
    loadTitles();
  }, [clinicId, statusFilter, paymentMethodFilter]);

  const loadTitles = async () => {
    try {
      setLoading(true);
      setErroCarregar(false);
      let query = supabase
        .from("receivable_titles")
        .select("*, patient:patients(full_name, phone)")
        .eq("clinic_id", clinicId)
        .order("due_date", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (paymentMethodFilter !== "all") {
        query = query.eq("payment_method", paymentMethodFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTitles(data || []);
    } catch (error) {
      console.error("Erro ao carregar títulos:", error);
      setErroCarregar(true);
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
      // Search
      const matchesSearch =
        !searchTerm ||
        t.patient?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title_number.toString().includes(searchTerm) ||
        (t.installment_label || "").toLowerCase().includes(searchTerm.toLowerCase());

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
        if (t.status === "paid" || t.status === "cancelled" || t.status === "renegotiated") return false;

        switch (agingFilter) {
          case "aVencer": return days < 0;
          case "vencido1a30": return days >= 0 && days <= 30;
          case "vencido31a60": return days > 30 && days <= 60;
          case "vencido60mais": return days > 60;
        }
      }

      return true;
    });
  }, [titles, searchTerm, statusFilter, paymentMethodFilter, agingFilter, periodFilter]);

  const aging = useMemo<AgingSummary>(() => {
    const summary: AgingSummary = { aVencer: 0, vencido1a30: 0, vencido31a60: 0, vencido60mais: 0, total: 0, totalPago: 0 };

    titles.forEach((t) => {
      if (t.status === "cancelled" || t.status === "renegotiated") return;
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

  // Totals for current page
  const pageTotals = useMemo(() => ({
    amount: filteredTitles.reduce((s, t) => s + t.amount, 0),
    balance: filteredTitles.reduce((s, t) => s + t.balance, 0),
    taxa: filteredTitles.reduce((s, t) => s + (t.taxa_adquirente || 0), 0),
  }), [filteredTitles]);

  const selectedTitles = titles.filter((t) => selectedIds.has(t.id));
  const selectedTotal = selectedTitles.reduce((s, t) => s + t.balance, 0);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = due < today && status !== "paid" && status !== "cancelled" && status !== "renegotiated";

    const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      paid: { label: "Pago", icon: <CheckCircle className="h-3 w-3 mr-1" />, className: "bg-sinal-ok text-white" },
      cancelled: { label: "Cancelado", icon: <XCircle className="h-3 w-3 mr-1" />, className: "bg-muted text-muted-foreground" },
      renegotiated: { label: "Renegociado", icon: <RefreshCcw className="h-3 w-3 mr-1" />, className: "bg-muted text-muted-foreground" },
      partial: { label: "Parcial", icon: <Clock className="h-3 w-3 mr-1" />, className: "bg-yellow-500 text-white" },
    };

    if (isOverdue) {
      return <Badge className="bg-destructive text-destructive-foreground"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
    }

    const c = config[status];
    if (c) return <Badge className={c.className}>{c.icon}{c.label}</Badge>;
    return <Badge className="bg-primary text-primary-foreground"><Clock className="h-3 w-3 mr-1" />Em aberto</Badge>;
  };

  const handlePayment = (title: ReceivableTitle) => {
    setSelectedTitle(title);
    setShowPaymentDrawer(true);
  };

  const handleBatchPayment = () => {
    if (selectedTitles.length === 0) return;
    setSelectedTitle(selectedTitles[0]);
    setShowPaymentDrawer(true);
  };

  const handleReversePayment = async (titleId: string, titleNumber: number) => {
    // Find payments for this title
    const { data: payments } = await supabase
      .from("payments")
      .select("id, value")
      .eq("title_id", titleId)
      .eq("status", "completed")
      .order("payment_date", { ascending: false })
      .limit(1);

    if (!payments || payments.length === 0) {
      toast.error("Nenhum pagamento encontrado para estornar");
      return;
    }

    const payment = payments[0];
    const reason = prompt(`Motivo do estorno de ${formatCurrency(payment.value)} (Título #${titleNumber}):`);
    if (!reason) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("financial-reversal", {
        body: {
          action: "reverse_payment",
          payment_id: payment.id,
          reason,
          performed_by: user?.id,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`Pagamento estornado com sucesso`);
      loadTitles();
    } catch {
      toast.error("Erro ao estornar pagamento");
    }
  };

  const handleRecibo = async (title: ReceivableTitle) => {
    try {
      const [clinicRes, patientRes, configRes] = await Promise.all([
        supabase.from("clinicas").select("nome, cnpj, telefone, address").eq("id", clinicId).single(),
        supabase.from("patients").select("cpf").eq("id", title.patient_id).single(),
        supabase.from("configuracoes_clinica").select("logotipo_url").eq("clinica_id", clinicId).single(),
      ]);

      const clinic = clinicRes.data;
      const addressObj = clinic?.address as Record<string, string> | null;
      const addressStr = addressObj
        ? [addressObj.street, addressObj.number, addressObj.neighborhood, addressObj.city, addressObj.state].filter(Boolean).join(", ")
        : undefined;

      await generateRecibo({
        titleNumber: title.title_number,
        installmentNumber: title.installment_number,
        totalInstallments: title.total_installments,
        patientName: title.patient?.full_name || "Paciente",
        patientCpf: patientRes.data?.cpf || undefined,
        amount: title.amount,
        paymentMethod: title.payment_method || "dinheiro",
        paymentDate: title.due_date,
        clinicName: clinic?.nome || "Clínica",
        clinicCnpj: clinic?.cnpj || undefined,
        clinicPhone: clinic?.telefone || undefined,
        clinicAddress: addressStr,
        clinicLogoUrl: await resolveClinicLogoUrl(configRes.data?.logotipo_url),
      });
    } catch {
      toast.error("Erro ao gerar recibo");
    }
  };

  const handleSuccess = () => {
    loadTitles();
    setShowPaymentDrawer(false);
    setSelectedTitle(null);
    setSelectedIds(new Set());
    setBatchMode(false);
    setRenegoOpen(false);
  };

  const filtrando = statusFilter !== "all" || paymentMethodFilter !== "all" || !!searchTerm;
  return (
    <div className="space-y-4 md:space-y-6">
      <FaixaIndicadores
        compacto
        itens={[
          { rotulo: "Em aberto", ...separarMoeda(formatCurrency(aging.total)), selecionado: agingFilter === "all", onClick: () => setAgingFilter("all") },
          { rotulo: "A vencer", ...separarMoeda(formatCurrency(aging.aVencer)), selecionado: agingFilter === "aVencer", onClick: () => setAgingFilter("aVencer") },
          { rotulo: "1–30 dias", ...separarMoeda(formatCurrency(aging.vencido1a30)), tom: aging.vencido1a30 > 0 ? "espera" : "padrao", selecionado: agingFilter === "vencido1a30", onClick: () => setAgingFilter("vencido1a30") },
          { rotulo: "31–60 dias", ...separarMoeda(formatCurrency(aging.vencido31a60)), tom: aging.vencido31a60 > 0 ? "espera" : "padrao", selecionado: agingFilter === "vencido31a60", onClick: () => setAgingFilter("vencido31a60") },
          { rotulo: "60+ dias", ...separarMoeda(formatCurrency(aging.vencido60mais)), tom: aging.vencido60mais > 0 ? "alerta" : "padrao", selecionado: agingFilter === "vencido60mais", onClick: () => setAgingFilter("vencido60mais") },
          { rotulo: "Total recebido", ...separarMoeda(formatCurrency(aging.totalPago)) },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente, nº ou descrição..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="renegotiated">Renegociado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentMethodFilter} onValueChange={(v) => { setPaymentMethodFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Forma Pgto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas formas</SelectItem>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="lastMonth">Mês anterior</SelectItem>
            <SelectItem value="thisMonth">Este mês</SelectItem>
            <SelectItem value="nextMonth">Próximo mês</SelectItem>
            <SelectItem value="next3Months">Próx. 3 meses</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={batchMode ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap"
          onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
        >
          {batchMode ? "Cancelar seleção" : "Seleção múltipla"}
        </Button>
      </div>

      {/* Batch actions */}
      {batchMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionado(s) — {formatCurrency(selectedTotal)}
          </span>
          <div className="flex-1" />
          <Button size="sm" onClick={handleBatchPayment}>
            <DollarSign className="h-4 w-4 mr-1" />
            Pagar selecionados
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRenegoOpen(true)}>
            <RefreshCcw className="h-4 w-4 mr-1" />
            Renegociar
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg bg-card">
        {erroCarregar ? (
          <EstadoErro titulo="Não foi possível carregar as contas a receber" onTentarDeNovo={loadTitles} />
        ) : loading ? (
          <EsqueletoLista linhas={6} colunas={3} className="rounded-none border-0" />
        ) : filteredTitles.length === 0 ? (
          filtrando ? (
            <EstadoVazio icone={DollarSign} titulo="Nenhum título encontrado" descricao="Tente alterar a busca ou os filtros." />
          ) : (
            <EstadoVazio icone={DollarSign} titulo="Nenhum título a receber" descricao="Os títulos aparecem aqui quando um orçamento é aprovado." />
          )
        ) : (
          <>
            {/* Mobile cards */}
            <div className="lg:hidden divide-y">
              {pagedTitles.map((title) => {
                const daysOverdue = getDaysOverdue(title.due_date);
                const isOverdue = daysOverdue > 0 && title.status !== "paid" && title.status !== "cancelled" && title.status !== "renegotiated";
                const canPay = title.status !== "paid" && title.status !== "cancelled" && title.status !== "renegotiated";

                return (
                  <div key={title.id} className={`p-4 space-y-3 ${isOverdue ? "bg-destructive/5" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {batchMode && canPay && (
                          <Checkbox
                            checked={selectedIds.has(title.id)}
                            onCheckedChange={() => toggleSelect(title.id)}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{title.patient?.full_name || "—"}</p>
                          <p className="text-sm text-muted-foreground">
                            #{title.title_number} • {title.installment_label || `${title.installment_number}/${title.total_installments}`}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(title.status, title.due_date)}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Venc: </span>
                        {format(new Date(title.due_date), "dd/MM/yyyy")}
                        {isOverdue && <span className="text-xs text-destructive ml-1">({daysOverdue}d)</span>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(title.balance)}</div>
                        {title.balance !== title.amount && (
                          <div className="text-xs text-muted-foreground line-through">{formatCurrency(title.amount)}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {canPay && !batchMode && (
                        <Button size="sm" onClick={() => handlePayment(title)} className="flex-1">
                          <DollarSign className="h-4 w-4 mr-1" />Baixar
                        </Button>
                      )}
                      {title.status === "paid" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleRecibo(title)} className="flex-1">
                            <FileText className="h-4 w-4 mr-1" />Recibo
                          </Button>
                          {canEstorno && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleReversePayment(title.id, title.title_number)}>
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <Table className="hidden lg:table">
              <TableHeader>
                <TableRow>
                  {batchMode && <TableHead className="w-10" />}
                  <TableHead>Nº</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead>Repasse</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTitles.map((title) => {
                  const daysOverdue = getDaysOverdue(title.due_date);
                  const valorLiquido = title.valor_liquido ?? (title.amount - (title.taxa_adquirente || 0));
                  const isCard = title.payment_method?.includes("cartao");
                  const isOverdue = daysOverdue > 0 && title.status !== "paid" && title.status !== "cancelled" && title.status !== "renegotiated";
                  const canPay = title.status !== "paid" && title.status !== "cancelled" && title.status !== "renegotiated";

                  return (
                    <TableRow key={title.id} className={isOverdue ? "bg-destructive/5" : ""}>
                      {batchMode && (
                        <TableCell>
                          {canPay && (
                            <Checkbox
                              checked={selectedIds.has(title.id)}
                              onCheckedChange={() => toggleSelect(title.id)}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">#{title.title_number}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{title.patient?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{title.patient?.phone}</div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">
                        {title.installment_label || title.notes || `Parcela ${title.installment_number}/${title.total_installments}`}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{format(new Date(title.due_date), "dd/MM/yyyy")}</div>
                        {isOverdue && <div className="text-xs text-destructive">{daysOverdue}d atrás</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PAYMENT_METHODS[title.payment_method || ""] || title.payment_method || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(title.amount)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {isCard && title.taxa_adquirente ? (
                          <span className="text-destructive">-{formatCurrency(title.taxa_adquirente)}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {isCard ? formatCurrency(valorLiquido) : formatCurrency(title.amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {title.data_repasse ? (
                          <div>
                            <div className="text-xs">{format(new Date(title.data_repasse), "dd/MM/yyyy")}</div>
                            {title.antecipado && <Badge className="bg-accent text-accent-foreground text-[10px]">Antecipado</Badge>}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatCurrency(title.balance)}</TableCell>
                      <TableCell>{getStatusBadge(title.status, title.due_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canPay && !batchMode && (
                            <Button size="sm" onClick={() => handlePayment(title)}>
                              <DollarSign className="h-3.5 w-3.5 mr-1" />Baixar
                            </Button>
                          )}
                          {title.status === "paid" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleRecibo(title)}>
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                              {canEstorno && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleReversePayment(title.id, title.title_number)}
                                  title="Estornar"
                                >
                                  <Undo2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
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
                  {batchMode && <TableCell />}
                  <TableCell colSpan={5} className="font-bold text-sm">
                    Totais ({filteredTitles.length} títulos)
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">{formatCurrency(pageTotals.amount)}</TableCell>
                  <TableCell className="text-right font-bold text-sm text-destructive">
                    {pageTotals.taxa > 0 ? `-${formatCurrency(pageTotals.taxa)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">{formatCurrency(pageTotals.amount - pageTotals.taxa)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-bold text-sm">{formatCurrency(pageTotals.balance)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t">
                <span className="text-sm text-muted-foreground">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredTitles.length)} de {filteredTitles.length}
                </span>
                <div className="flex items-center gap-1">
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

      {/* Payment Drawer */}
      {selectedTitle && (
        <PaymentDrawer
          open={showPaymentDrawer}
          onOpenChange={setShowPaymentDrawer}
          title={selectedTitle}
          titles={batchMode && selectedTitles.length > 1 ? selectedTitles : undefined}
          clinicId={clinicId}
          onSuccess={handleSuccess}
        />
      )}

      {/* Renegotiation Modal */}
      {renegoOpen && selectedTitles.length > 0 && (
        <RenegociacaoModal
          open={renegoOpen}
          onOpenChange={setRenegoOpen}
          titles={selectedTitles}
          patientId={selectedTitles[0].patient_id}
          clinicId={clinicId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
