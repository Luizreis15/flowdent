import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, DollarSign, Calendar, User, CreditCard, FileText, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { generateRecibo, type ReciboData } from "@/utils/generateRecibo";
import { resolveClinicLogoUrl } from "@/lib/storage";

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
  patient?: {
    full_name: string;
    phone: string;
  };
}

interface CashAccount {
  id: string;
  nome: string;
  tipo: string;
}

interface PaymentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReceivableTitle;
  titles?: ReceivableTitle[]; // batch mode
  clinicId: string;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "boleto", label: "Boleto" },
  { value: "cheque", label: "Cheque" },
  { value: "convenio", label: "Convênio" },
];

export const PaymentDrawer = ({
  open,
  onOpenChange,
  title,
  titles,
  clinicId,
  onSuccess,
}: PaymentDrawerProps) => {
  const isBatch = titles && titles.length > 1;
  const allTitles = isBatch ? titles : [title];
  const totalBalance = allTitles.reduce((s, t) => s + t.balance, 0);

  const [amount, setAmount] = useState(totalBalance.toString());
  const [method, setMethod] = useState(title.payment_method || "pix");
  const [cashAccountId, setCashAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [showReciboDialog, setShowReciboDialog] = useState(false);
  const [lastPaymentData, setLastPaymentData] = useState<{ amount: number; method: string; date: string } | null>(null);

  // Card fees
  const [taxaPercentual, setTaxaPercentual] = useState("3.5");
  const [diasRepasse, setDiasRepasse] = useState("30");
  const [antecipado, setAntecipado] = useState(false);

  const isCardPayment = method === "cartao_credito" || method === "cartao_debito";
  const paymentAmount = parseFloat(amount) || 0;
  const taxaValor = isCardPayment ? paymentAmount * (parseFloat(taxaPercentual) / 100) : 0;
  const valorLiquido = paymentAmount - taxaValor;
  const isPartialPayment = paymentAmount < totalBalance && paymentAmount > 0;

  useEffect(() => {
    if (open) {
      loadCashAccounts();
      loadUserId();
      setAmount(totalBalance.toString());
      setMethod(title.payment_method || "pix");
    }
  }, [open, title, totalBalance]);

  useEffect(() => {
    if (method === "cartao_debito") {
      setTaxaPercentual("1.5");
      setDiasRepasse("1");
    } else if (method === "cartao_credito") {
      setTaxaPercentual("3.5");
      setDiasRepasse("30");
    }
  }, [method]);

  const loadCashAccounts = async () => {
    const { data } = await supabase
      .from("caixas")
      .select("id, nome, tipo")
      .eq("clinica_id", clinicId)
      .eq("ativo", true);
    setCashAccounts(data || []);
    if (data && data.length > 0) setCashAccountId(data[0].id);
  };

  const loadUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const handleSubmit = async () => {
    if (paymentAmount <= 0) { toast.error("Valor inválido"); return; }
    if (paymentAmount > totalBalance + 0.01) { toast.error("Valor excede o saldo total"); return; }
    if (!method) { toast.error("Selecione a forma de pagamento"); return; }

    const dataRepasse = isCardPayment
      ? (() => {
          const d = new Date(paidAt);
          d.setDate(d.getDate() + parseInt(diasRepasse));
          return d.toISOString().split("T")[0];
        })()
      : null;

    setLoading(true);

    try {
      // Build title payments with proportional distribution
      let remaining = paymentAmount;
      const titlePayments = allTitles
        .filter((t) => t.status !== "paid" && t.status !== "cancelled")
        .map((t) => {
          const payForThis = Math.min(remaining, t.balance);
          remaining -= payForThis;
          return { title_id: t.id, amount: payForThis };
        })
        .filter((tp) => tp.amount > 0);

      const { data, error } = await supabase.functions.invoke("record-payment", {
        body: {
          titles: titlePayments,
          amount: paymentAmount,
          paid_at: paidAt,
          method,
          cash_account_id: cashAccountId || null,
          notes: notes || null,
          created_by: userId,
          taxa_adquirente: isCardPayment ? taxaValor : null,
          valor_liquido: isCardPayment ? valorLiquido : paymentAmount,
          data_repasse: dataRepasse,
          antecipado,
          emit_receipt: true,
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      const successCount = data?.results?.filter((r: any) => r.success)?.length || 0;
      toast.success(
        isBatch
          ? `${successCount} parcela(s) baixada(s) — Total: ${formatCurrency(paymentAmount)}`
          : `Pagamento de ${formatCurrency(paymentAmount)} registrado!`
      );

      setLastPaymentData({ amount: paymentAmount, method, date: paidAt });
      setShowReciboDialog(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao registrar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const handleEmitirRecibo = async () => {
    if (!lastPaymentData) return;

    try {
      const [clinicRes, patientRes, configRes] = await Promise.all([
        supabase.from("clinicas").select("nome, cnpj, telefone, address").eq("id", clinicId).single(),
        supabase.from("patients").select("cpf").eq("id", title.patient_id).single(),
        supabase.from("configuracoes_clinica").select("logotipo_url").eq("clinica_id", clinicId).single(),
      ]);

      const clinic = clinicRes.data;
      const patient = patientRes.data;
      const addressObj = clinic?.address as Record<string, string> | null;
      const addressStr = addressObj
        ? [addressObj.street, addressObj.number, addressObj.neighborhood, addressObj.city, addressObj.state].filter(Boolean).join(", ")
        : undefined;

      const reciboData: ReciboData = {
        titleNumber: title.title_number,
        installmentNumber: title.installment_number,
        totalInstallments: title.total_installments,
        patientName: title.patient?.full_name || "Paciente",
        patientCpf: patient?.cpf || undefined,
        amount: lastPaymentData.amount,
        paymentMethod: lastPaymentData.method,
        paymentDate: lastPaymentData.date,
        clinicName: clinic?.nome || "Clínica",
        clinicCnpj: clinic?.cnpj || undefined,
        clinicPhone: clinic?.telefone || undefined,
        clinicAddress: addressStr,
        clinicLogoUrl: await resolveClinicLogoUrl(configRes.data?.logotipo_url),
      };

      await generateRecibo(reciboData);
    } catch (error) {
      console.error("Erro ao gerar recibo:", error);
      toast.error("Erro ao gerar recibo");
    } finally {
      setShowReciboDialog(false);
      onSuccess();
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg flex flex-col max-h-[100dvh]">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Registrar Pagamento
            </SheetTitle>
            <SheetDescription>
              {isBatch
                ? `${allTitles.length} parcelas selecionadas`
                : `${title.installment_label || `Parcela ${title.installment_number}/${title.total_installments}`}`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
            {/* Titles being paid */}
            {isBatch && (
              <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                {allTitles.map((t) => (
                  <div key={t.id} className="flex justify-between items-center p-2 text-sm">
                    <span className="truncate">{t.installment_label || t.notes || `Parcela ${t.installment_number}`}</span>
                    <span className="font-medium ml-2">{formatCurrency(t.balance)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Patient info */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{title.patient?.full_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Vencimento</span>
                  <div className="font-medium">{new Date(title.due_date).toLocaleDateString("pt-BR")}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Saldo total</span>
                  <div className="font-medium">{formatCurrency(totalBalance)}</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>Valor do Pagamento</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={totalBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 text-lg font-medium"
                />
              </div>
              {isPartialPayment && (
                <div className="flex items-center gap-1.5 text-sm">
                  <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                  <span className="text-yellow-600">
                    Pagamento parcial — restará {formatCurrency(totalBalance - paymentAmount)}
                  </span>
                </div>
              )}
              {isBatch && (
                <div className="flex gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => setAmount(totalBalance.toString())}
                  >
                    Pagar tudo ({formatCurrency(totalBalance)})
                  </Badge>
                </div>
              )}
            </div>

            {/* Card fees */}
            {isCardPayment && (
              <div className="space-y-3 p-3 bg-accent/30 border border-accent rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4" />
                  Taxas do Cartão
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Taxa MDR (%)</Label>
                    <Input type="number" step="0.1" min="0" max="10" value={taxaPercentual} onChange={(e) => setTaxaPercentual(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dias p/ Repasse</Label>
                    <Select value={diasRepasse} onValueChange={setDiasRepasse}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">D+1</SelectItem>
                        <SelectItem value="2">D+2</SelectItem>
                        <SelectItem value="14">D+14</SelectItem>
                        <SelectItem value="30">D+30</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={antecipado} onChange={(e) => setAntecipado(e.target.checked)} className="rounded" />
                  Antecipado
                </label>
                <Separator />
                <div className="space-y-0.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Bruto:</span><span>{formatCurrency(paymentAmount)}</span></div>
                  <div className="flex justify-between text-destructive"><span>Taxa ({taxaPercentual}%):</span><span>-{formatCurrency(taxaValor)}</span></div>
                  <div className="flex justify-between font-medium text-primary"><span>Líquido:</span><span>{formatCurrency(valorLiquido)}</span></div>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Data do Pagamento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="pl-10" />
              </div>
            </div>

            {/* Method */}
            <div className="space-y-1.5">
              <Label>Forma de Pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cash account */}
            {cashAccounts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Conta/Caixa de Destino</Label>
                <Select value={cashAccountId} onValueChange={setCashAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o caixa..." /></SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome} ({a.tipo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea placeholder="Observações..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <SheetFooter className="flex-shrink-0 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[hsl(var(--success-green))] hover:bg-[hsl(var(--success-green)/0.9)]"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" />Confirmar Pagamento</>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Receipt dialog */}
      <Dialog open={showReciboDialog} onOpenChange={() => { setShowReciboDialog(false); onSuccess(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Pagamento Registrado!
            </DialogTitle>
            <DialogDescription>
              {lastPaymentData && `${formatCurrency(lastPaymentData.amount)} recebido. Deseja emitir o recibo?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setShowReciboDialog(false); onSuccess(); }}>
              Não, obrigado
            </Button>
            <Button onClick={handleEmitirRecibo}>
              <FileText className="h-4 w-4 mr-2" />
              Emitir Recibo PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
