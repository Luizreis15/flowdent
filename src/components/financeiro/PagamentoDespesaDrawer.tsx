import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface PayableTitle {
  id: string;
  title_number: number;
  description: string;
  supplier_id: string | null;
  due_date: string;
  amount: number;
  balance: number;
  supplier?: {
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
}

interface Caixa {
  id: string;
  nome: string;
}

interface PagamentoDespesaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: PayableTitle;
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
];

export const PagamentoDespesaDrawer = ({ 
  open, 
  onOpenChange, 
  title, 
  clinicId, 
  onSuccess 
}: PagamentoDespesaDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "pix",
    cashAccountId: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadCaixas();
      setPaymentData({
        amount: title.balance.toString().replace(".", ","),
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "pix",
        cashAccountId: "",
        notes: "",
      });
    }
  }, [open, title]);

  const loadCaixas = async () => {
    try {
      const { data, error } = await supabase
        .from("caixas")
        .select("id, nome")
        .eq("clinica_id", clinicId)
        .eq("ativo", true);

      if (error) throw error;
      if (data) setCaixas(data as Caixa[]);
    } catch (error) {
      console.error("Erro ao carregar caixas:", error);
    }
  };

  const getSupplierName = () => {
    if (!title.supplier) return "—";
    return title.supplier.nome_fantasia || title.supplier.razao_social;
  };

  const handleSubmit = async () => {
    const amount = parseFloat(paymentData.amount.replace(",", "."));

    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (amount > title.balance) {
      toast.error("O valor não pode ser maior que o saldo");
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("payable_payments").insert({
        payable_id: title.id,
        amount: amount,
        payment_date: paymentData.paymentDate,
        payment_method: paymentData.paymentMethod,
        cash_account_id: paymentData.cashAccountId || null,
        notes: paymentData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Pagamento registrado com sucesso");
      onSuccess();
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      toast.error("Erro ao registrar pagamento");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-lg flex flex-col max-h-[85vh]">
          <DrawerHeader className="px-6 pb-2 flex-shrink-0">
            <DrawerTitle>Baixar Pagamento</DrawerTitle>
            <DrawerDescription>
              #{title.title_number} - {title.description}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            {/* Info do título */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fornecedor:</span>
                <span className="font-medium">{getSupplierName()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vencimento:</span>
                <span className="font-medium">{new Date(title.due_date).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Original:</span>
                <span className="font-medium">{formatCurrency(title.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo a Pagar:</span>
                <span className="font-bold text-lg text-red-600">{formatCurrency(title.balance)}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Valor do Pagamento *</Label>
              <Input
                id="amount"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label htmlFor="paymentDate">Data do Pagamento *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select 
                value={paymentData.paymentMethod} 
                onValueChange={(v) => setPaymentData({ ...paymentData, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {caixas.length > 0 && (
              <div>
                <Label htmlFor="cashAccount">Caixa/Conta</Label>
                <Select 
                  value={paymentData.cashAccountId} 
                  onValueChange={(v) => setPaymentData({ ...paymentData, cashAccountId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um caixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {caixas.map((caixa) => (
                      <SelectItem key={caixa.id} value={caixa.id}>
                        {caixa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Observações do pagamento..."
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4 pb-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? "Processando..." : "Confirmar Pagamento"}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
