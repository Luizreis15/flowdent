import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtratoFinanceiroPaciente } from "./ExtratoFinanceiroPaciente";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Download,
  Filter,
  Receipt,
  CreditCard,
  Wallet,
  FileText,
  CheckSquare,
  Printer,
  Ban,
  Loader2,
  RefreshCcw,
  Undo2,
  XCircle,
  Plus,
} from "lucide-react";
import { generateRecibo, type ReciboData } from "@/utils/generateRecibo";
import { resolveClinicLogoUrl } from "@/lib/storage";
import { RenegociacaoModal } from "@/components/financeiro/RenegociacaoModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentDrawer } from "@/components/financeiro/PaymentDrawer";
import { NovoTituloAvulsoModal } from "./NovoTituloAvulsoModal";

interface FinanceiroTabProps {
  patientId: string;
  clinicId: string;
}

interface Titulo {
  id: string;
  title_number: number;
  patient_id: string;
  notes: string | null;
  amount: number;
  balance: number;
  paid_amount: number | null;
  status: string;
  due_date: string;
  created_at: string;
  origin: string | null;
  installment_number: number | null;
  total_installments: number;
  installment_label: string | null;
  budget_id: string | null;
  payment_method: string | null;
  payment_plan_id: string | null;
  competencia: string | null;
  taxa_adquirente: number | null;
  data_repasse: string | null;
  antecipado: boolean | null;
  valor_liquido: number | null;
  paid_at: string | null;
  patient?: {
    full_name: string;
    phone: string;
  };
}

interface Pagamento {
  id: string;
  value: number;
  payment_method: string | null;
  payment_date: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  proof_file_url: string | null;
  transaction_reference: string | null;
}

interface ReceiptDoc {
  id: string;
  receipt_number: number;
  issue_date: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  payment_id: string | null;
  clinic_id: string;
}

export const FinanceiroTab = ({ patientId, clinicId }: FinanceiroTabProps) => {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [recibos, setRecibos] = useState<ReceiptDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("resumo");
  const [selectedTitulo, setSelectedTitulo] = useState<Titulo | null>(null);
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [renegoOpen, setRenegoOpen] = useState(false);
  const [showNovoTitulo, setShowNovoTitulo] = useState(false);

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [titulosRes, pagamentosRes, recibosRes] = await Promise.all([
        supabase
          .from("receivable_titles")
          .select("*, patient:patients(full_name, phone)")
          .eq("patient_id", patientId)
          .order("due_date", { ascending: true }),
        supabase
          .from("payments")
          .select("*")
          .eq("patient_id", patientId)
          .order("payment_date", { ascending: false }),
        supabase
          .from("receipt_documents")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
      ]);

      if (titulosRes.error) throw titulosRes.error;
      setTitulos((titulosRes.data as Titulo[]) || []);
      setPagamentos(pagamentosRes.data || []);
      setRecibos(recibosRes.data || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados financeiros:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const totalOrcado = titulos.reduce((acc, t) => acc + t.amount, 0);
  const totalAberto = titulos
    .filter((t) => t.status === "open" || t.status === "partial")
    .reduce((acc, t) => acc + t.balance, 0);
  const totalPago = pagamentos
    .filter((p) => p.status === "completed")
    .reduce((acc, p) => acc + p.value, 0);
  const totalVencido = titulos
    .filter((t) => {
      const vencido = new Date(t.due_date) < new Date();
      return (t.status === "open" || t.status === "partial") && vencido;
    })
    .reduce((acc, t) => acc + t.balance, 0);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      paid: { label: "Pago", className: "bg-[hsl(var(--success-green))] text-white" },
      partial: { label: "Parcial", className: "bg-yellow-500 text-white" },
      open: { label: "Em aberto", className: "bg-primary text-primary-foreground" },
      overdue: { label: "Vencido", className: "bg-destructive text-destructive-foreground" },
      cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
      renegotiated: { label: "Renegociado", className: "bg-muted text-muted-foreground" },
    };
    const c = config[status] || { label: status, className: "" };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getMethodLabel = (m: string | null) => {
    const map: Record<string, string> = {
      dinheiro: "Dinheiro",
      pix: "PIX",
      cartao_credito: "Cartão Crédito",
      cartao_debito: "Cartão Débito",
      boleto: "Boleto",
      transferencia: "Transferência",
      cheque: "Cheque",
      convenio: "Convênio",
    };
    return map[m || ""] || m || "-";
  };

  const openTitles = titulos.filter(
    (t) => t.status !== "paid" && t.status !== "cancelled" && t.status !== "renegotiated"
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectedTitles = titulos.filter((t) => selectedIds.has(t.id));
  const selectedTotal = selectedTitles.reduce((s, t) => s + t.balance, 0);

  const handleOpenPayment = (titulo: Titulo) => {
    setSelectedTitulo(titulo);
    setPaymentDrawerOpen(true);
  };

  const handleBatchPayment = () => {
    if (selectedTitles.length === 0) return;
    setSelectedTitulo(selectedTitles[0]);
    setPaymentDrawerOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentDrawerOpen(false);
    setSelectedTitulo(null);
    setSelectedIds(new Set());
    setBatchMode(false);
    loadData();
  };

  const handleReprintRecibo = async (receipt: ReceiptDoc) => {
    try {
      // Fetch payment details to get method/date
      let paymentMethod = "pix";
      let paymentDate = receipt.issue_date;
      let titleNumber = 0;
      let installmentNumber = 1;
      let totalInstallments = 1;

      if (receipt.payment_id) {
        const { data: payment } = await supabase
          .from("payments")
          .select("payment_method, payment_date, title_id")
          .eq("id", receipt.payment_id)
          .single();
        if (payment) {
          paymentMethod = payment.payment_method || "pix";
          paymentDate = payment.payment_date?.split("T")[0] || receipt.issue_date;
          if (payment.title_id) {
            const { data: tit } = await supabase
              .from("receivable_titles")
              .select("title_number, installment_number, total_installments")
              .eq("id", payment.title_id)
              .single();
            if (tit) {
              titleNumber = tit.title_number;
              installmentNumber = tit.installment_number;
              totalInstallments = tit.total_installments;
            }
          }
        }
      }

      // Fetch clinic + patient + config
      const [clinicRes, patientRes, configRes] = await Promise.all([
        supabase.from("clinicas").select("nome, cnpj, telefone, address").eq("id", clinicId).single(),
        supabase.from("patients").select("full_name, cpf").eq("id", patientId).single(),
        supabase.from("configuracoes_clinica").select("logotipo_url").eq("clinica_id", clinicId).single(),
      ]);

      const clinic = clinicRes.data;
      const patient = patientRes.data;
      const addressObj = clinic?.address as Record<string, string> | null;
      const addressStr = addressObj
        ? [addressObj.street, addressObj.number, addressObj.neighborhood, addressObj.city, addressObj.state].filter(Boolean).join(", ")
        : undefined;

      await generateRecibo({
        receiptNumber: receipt.receipt_number,
        titleNumber,
        installmentNumber,
        totalInstallments,
        patientName: patient?.full_name || "Paciente",
        patientCpf: patient?.cpf || undefined,
        amount: receipt.amount,
        paymentMethod,
        paymentDate,
        clinicName: clinic?.nome || "Clínica",
        clinicCnpj: clinic?.cnpj || undefined,
        clinicPhone: clinic?.telefone || undefined,
        clinicAddress: addressStr,
        clinicLogoUrl: await resolveClinicLogoUrl(configRes.data?.logotipo_url),
        description: receipt.description || undefined,
      });
    } catch (error) {
      console.error("Erro ao reimprimir recibo:", error);
      toast.error("Erro ao reimprimir recibo");
    }
  };

  const handleVoidRecibo = async (receiptId: string) => {
    if (!confirm("Deseja anular este recibo? Esta ação não pode ser desfeita.")) return;
    try {
      const { error } = await supabase
        .from("receipt_documents")
        .update({ status: "voided" })
        .eq("id", receiptId);
      if (error) throw error;
      toast.success("Recibo anulado com sucesso");
      loadData();
    } catch (error) {
      console.error("Erro ao anular recibo:", error);
      toast.error("Erro ao anular recibo");
    }
  };

  const handleReversePayment = async (paymentId: string, value: number) => {
    const reason = prompt(`Motivo do estorno de ${formatCurrency(value)}:`);
    if (!reason) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("financial-reversal", {
        body: {
          action: "reverse_payment",
          payment_id: paymentId,
          reason,
          performed_by: user?.id,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`Pagamento de ${formatCurrency(value)} estornado com sucesso`);
      loadData();
    } catch (error) {
      console.error("Erro ao estornar:", error);
      toast.error("Erro ao estornar pagamento");
    }
  };

  const handleCancelTitle = async (titleId: string, titleNumber: number) => {
    const reason = prompt(`Motivo do cancelamento do título #${titleNumber}:`);
    if (!reason) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("financial-reversal", {
        body: {
          action: "cancel_title",
          title_id: titleId,
          reason,
          performed_by: user?.id,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`Título #${titleNumber} cancelado`);
      loadData();
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      toast.error("Erro ao cancelar título");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Orçado</p>
            <p className="text-xl font-bold">{formatCurrency(totalOrcado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Recebido</p>
            <p className="text-xl font-bold text-[hsl(var(--success-green))]">{formatCurrency(totalPago)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Em Aberto</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalAberto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Vencido</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totalVencido)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="extrato">Extrato</TabsTrigger>
          <TabsTrigger value="titulos">Parcelas</TabsTrigger>
          <TabsTrigger value="pagamentos">Recebimentos</TabsTrigger>
          <TabsTrigger value="recibos">Recibos</TabsTrigger>
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Próximos Vencimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {openTitles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">Nenhum título em aberto</p>
                ) : (
                  <div className="space-y-2">
                    {openTitles.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/80"
                        onClick={() => handleOpenPayment(t)}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {t.installment_label || t.notes || `Parcela ${t.installment_number || 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence em {format(new Date(t.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="font-semibold text-sm">{formatCurrency(t.balance)}</span>
                          {getStatusBadge(t.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Últimos Recebimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pagamentos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">Nenhum pagamento registrado</p>
                ) : (
                  <div className="space-y-2">
                    {pagamentos.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{getMethodLabel(p.payment_method)}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.payment_date ? format(new Date(p.payment_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </p>
                        </div>
                        <span className="font-semibold text-sm text-[hsl(var(--success-green))]">
                          {formatCurrency(p.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Extrato / Relatórios */}
        <TabsContent value="extrato" className="mt-4">
          <ExtratoFinanceiroPaciente
            titulos={titulos}
            pagamentos={pagamentos}
            patientId={patientId}
            clinicId={clinicId}
          />
        </TabsContent>

        {/* Parcelas */}
        <TabsContent value="titulos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Parcelas</CardTitle>
              <div className="flex gap-2 items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNovoTitulo(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Título avulso
                </Button>
                {batchMode && selectedIds.size > 0 && (
                  <>
                    <Button size="sm" onClick={handleBatchPayment}>
                      <DollarSign className="h-4 w-4 mr-1" />
                      Pagar {selectedIds.size} ({formatCurrency(selectedTotal)})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRenegoOpen(true)}
                    >
                      <RefreshCcw className="h-4 w-4 mr-1" />
                      Renegociar
                    </Button>
                  </>
                )}
                <Button
                  variant={batchMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setBatchMode(!batchMode);
                    setSelectedIds(new Set());
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  {batchMode ? "Cancelar seleção" : "Baixa múltipla"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {titulos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Nenhuma parcela</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {batchMode && <TableHead className="w-10" />}
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {titulos.map((t) => {
                      const canPay = t.status !== "paid" && t.status !== "cancelled" && t.status !== "renegotiated";
                      const isOverdue = canPay && new Date(t.due_date) < new Date();

                      return (
                        <TableRow
                          key={t.id}
                          className={`${canPay ? "cursor-pointer hover:bg-muted/80" : ""} ${isOverdue ? "bg-destructive/5" : ""}`}
                          onClick={() => !batchMode && canPay && handleOpenPayment(t)}
                        >
                          {batchMode && (
                            <TableCell>
                              {canPay && (
                                <Checkbox
                                  checked={selectedIds.has(t.id)}
                                  onCheckedChange={() => toggleSelect(t.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                            </TableCell>
                          )}
                          <TableCell className="font-medium text-sm">
                            {t.installment_label || t.notes || `Parcela ${t.installment_number || 1}`}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(t.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(t.amount)}</TableCell>
                          <TableCell className="text-right text-sm text-[hsl(var(--success-green))]">
                            {formatCurrency(t.paid_amount || 0)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">{formatCurrency(t.balance)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{getMethodLabel(t.payment_method)}</TableCell>
                          <TableCell>{getStatusBadge(isOverdue && t.status === "open" ? "overdue" : t.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canPay && !batchMode && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleOpenPayment(t); }}
                                >
                                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                                  Pagar
                                </Button>
                              )}
                              {canPay && !batchMode && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleCancelTitle(t.id, t.title_number); }}
                                  title="Cancelar título"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {t.status === "paid" && !batchMode && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const receipt = recibos.find(r => r.status === "issued" && r.payment_id && pagamentos.some(p => p.id === r.payment_id));
                                    const matchedReceipt = recibos.find(r => r.status === "issued");
                                    if (matchedReceipt) {
                                      handleReprintRecibo(matchedReceipt);
                                    } else {
                                      toast.info("Nenhum recibo encontrado para esta parcela. Registre o pagamento primeiro.");
                                    }
                                  }}
                                  title="Imprimir recibo"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recebimentos */}
        <TabsContent value="pagamentos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Recebimentos</CardTitle>
            </CardHeader>
            <CardContent>
              {pagamentos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Nenhum recebimento</p>
              ) : (
                <Table>
                  <TableHeader>
                     <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Obs</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagamentos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">
                          {p.payment_date ? format(new Date(p.payment_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">{getMethodLabel(p.payment_method)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm text-[hsl(var(--success-green))]">
                          {formatCurrency(p.value)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                            {p.status === "completed" ? "Confirmado" : p.status === "reversed" ? "Estornado" : p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                          {p.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "completed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleReversePayment(p.id, p.value)}
                              title="Estornar pagamento"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recibos */}
        <TabsContent value="recibos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recibos Emitidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recibos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Nenhum recibo emitido</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recibos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">#{r.receipt_number}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(r.issue_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm">{r.description || "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{formatCurrency(r.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "issued" ? "default" : "secondary"}>
                            {r.status === "issued" ? "Emitido" : r.status === "voided" ? "Anulado" : r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.status === "issued" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReprintRecibo(r)}
                                  title="Reimprimir recibo"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleVoidRecibo(r.id)}
                                  title="Anular recibo"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Drawer */}
      {selectedTitulo && (
        <PaymentDrawer
          open={paymentDrawerOpen}
          onOpenChange={setPaymentDrawerOpen}
          title={selectedTitulo}
          titles={batchMode && selectedTitles.length > 1 ? selectedTitles : undefined}
          clinicId={clinicId}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Renegotiation Modal */}
      {renegoOpen && selectedTitles.length > 0 && (
        <RenegociacaoModal
          open={renegoOpen}
          onOpenChange={setRenegoOpen}
          titles={selectedTitles}
          patientId={patientId}
          clinicId={clinicId}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Manual Title Modal */}
      <NovoTituloAvulsoModal
        open={showNovoTitulo}
        onOpenChange={setShowNovoTitulo}
        patientId={patientId}
        clinicId={clinicId}
        onSuccess={loadData}
      />
    </div>
  );
};
