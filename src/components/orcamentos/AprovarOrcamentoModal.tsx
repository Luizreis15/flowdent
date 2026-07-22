import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateRecibo, type ReciboData } from "@/utils/generateRecibo";
import { resolveClinicLogoUrl } from "@/lib/storage";
import { generateContractTemplate, generateContractNumber } from "@/utils/generateContractTemplate";
import {
  Check,
  ChevronRight,
  CreditCard,
  DollarSign,
  Info,
  Plus,
  Trash2,
  User,
  FileText,
  Loader2,
  Printer,
  CheckCircle,
} from "lucide-react";

const IMMEDIATE_METHODS = ["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia", "carteira_digital"];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "cheque", label: "Cheque" },
  { value: "convenio", label: "Convênio" },
  { value: "carteira_digital", label: "Carteira Digital" },
];

interface Allocation {
  id: string;
  payment_method: string;
  amount: number;
  installments_count: number;
  first_due_date: string;
  is_immediate: boolean;
}

interface BudgetDetails {
  id: string;
  title: string;
  description?: string;
  total_value: number;
  discount_value: number;
  final_value: number;
  patient_id: string;
  clinic_id: string;
  financial_responsible_contact_id?: string;
  budget_items: {
    id: string;
    procedure_name: string;
    unit_price: number;
    quantity: number;
    total_price: number;
    professional_id?: string;
    tooth_region?: string;
  }[];
}

interface Contact {
  id: string;
  name: string;
  relation: string | null;
  cpf: string | null;
}

interface AprovarOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  onSuccess: () => void;
}

export const AprovarOrcamentoModal = ({
  open,
  onOpenChange,
  budgetId,
  onSuccess,
}: AprovarOrcamentoModalProps) => {
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState<BudgetDetails | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(true);

  useEffect(() => {
    if (open && budgetId) {
      loadBudget();
    }
  }, [open, budgetId]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setAllocations([]);
      setResponsavelId("");
    }
  }, [open]);

  const loadBudget = async () => {
    setLoadingBudget(true);
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          budget_items(*)
        `)
        .eq("id", budgetId)
        .single();

      if (error) throw error;

      setBudget({
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        total_value: data.total_value || 0,
        discount_value: data.discount_value || 0,
        final_value: data.final_value || data.total_value || 0,
        patient_id: data.patient_id,
        clinic_id: data.clinic_id,
        financial_responsible_contact_id: data.financial_responsible_contact_id || undefined,
        budget_items: data.budget_items || [],
      });

      if (data.financial_responsible_contact_id) {
        setResponsavelId(data.financial_responsible_contact_id);
      }

      // Load contacts
      const { data: contactsData } = await supabase
        .from("patient_contacts")
        .select("id, name, relation, cpf")
        .eq("patient_id", data.patient_id);

      setContacts(contactsData || []);
    } catch (error: any) {
      console.error("Erro ao carregar orçamento:", error);
      toast.error("Erro ao carregar orçamento");
    } finally {
      setLoadingBudget(false);
    }
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remaining = (budget?.final_value || 0) - totalAllocated;

  const addAllocation = () => {
    setAllocations([
      ...allocations,
      {
        id: crypto.randomUUID(),
        payment_method: "pix",
        amount: remaining > 0 ? remaining : 0,
        installments_count: 1,
        first_due_date: format(new Date(), "yyyy-MM-dd"),
        is_immediate: false,
      },
    ]);
  };

  const updateAllocation = (id: string, field: keyof Allocation, value: any) => {
    setAllocations(
      allocations.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const removeAllocation = (id: string) => {
    setAllocations(allocations.filter((a) => a.id !== id));
  };

  // Generate preview installments from allocations
  const generatePreviewInstallments = () => {
    const installments: {
      label: string;
      dueDate: string;
      amount: number;
      method: string;
      isImmediate: boolean;
    }[] = [];

    allocations.forEach((alloc, allocIdx) => {
      if (alloc.installments_count === 1) {
        installments.push({
          label: alloc.is_immediate
            ? `Entrada (${getMethodLabel(alloc.payment_method)})`
            : `Pagamento ${allocIdx + 1} (${getMethodLabel(alloc.payment_method)})`,
          dueDate: alloc.first_due_date,
          amount: alloc.amount,
          method: alloc.payment_method,
          isImmediate: alloc.is_immediate,
        });
      } else {
        const parcelaValue = alloc.amount / alloc.installments_count;
        for (let i = 0; i < alloc.installments_count; i++) {
          const dueDate = addMonths(new Date(alloc.first_due_date), i);
          installments.push({
            label: `Parcela ${i + 1}/${alloc.installments_count} (${getMethodLabel(alloc.payment_method)})`,
            dueDate: format(dueDate, "yyyy-MM-dd"),
            amount: parcelaValue,
            method: alloc.payment_method,
            isImmediate: false,
          });
        }
      }
    });

    return installments.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  };

  const getMethodLabel = (value: string) =>
    PAYMENT_METHODS.find((m) => m.value === value)?.label || value;

  const canProceedStep2 = () => {
    if (allocations.length === 0) return false;
    if (Math.abs(remaining) > 0.01) return false;
    return allocations.every((a) => a.amount > 0);
  };

  const isAllImmediate = () =>
    allocations.length > 0 && allocations.every((a) => IMMEDIATE_METHODS.includes(a.payment_method));

  const getPaymentMethodSummary = () => {
    const methods = allocations.map((a) => {
      const label = getMethodLabel(a.payment_method);
      return a.installments_count > 1 ? `${label} ${a.installments_count}x` : label;
    });
    return methods.join(" + ");
  };

  const handleApprove = async () => {
    if (!budget) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke("approve-budget", {
        body: {
          budget_id: budget.id,
          approved_by: user.id,
          financial_responsible_id: responsavelId || null,
          allocations: allocations.map((a, idx) => ({
            sequence: idx + 1,
            payment_method_planned: a.payment_method,
            amount: a.amount,
            installments_count: a.installments_count,
            first_due_date: a.first_due_date,
            is_immediate: a.is_immediate,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const createdTitles = data?.titles || [];

      // If all methods are immediate, auto-pay all titles and generate consolidated receipt
      if (isAllImmediate() && createdTitles.length > 0) {
        const primaryMethod = allocations[0].payment_method;
        const paymentDate = new Date().toISOString();

        // Batch pay all titles
        const { data: payData, error: payError } = await supabase.functions.invoke("record-payment", {
          body: {
            titles: createdTitles.map((t: any) => ({
              title_id: t.id,
              amount: t.balance || t.amount,
            })),
            amount: budget.final_value,
            method: primaryMethod,
            created_by: user.id,
            paid_at: paymentDate,
            emit_receipt: true,
          },
        });

        if (payError) {
          console.error("Erro ao registrar pagamento automático:", payError);
          toast.warning("Orçamento aprovado, mas houve erro ao registrar pagamento automático.");
        } else {
          // Generate consolidated receipt
          try {
            // Fetch clinic and patient data for receipt
            const [clinicRes, patientRes, configRes] = await Promise.all([
              supabase.from("clinicas").select("nome, cnpj, telefone, address").eq("id", budget.clinic_id).single(),
              supabase.from("patients").select("full_name, cpf").eq("id", budget.patient_id).single(),
              supabase.from("configuracoes_clinica").select("logotipo_url").eq("clinica_id", budget.clinic_id).maybeSingle(),
            ]);

            const clinic = clinicRes.data;
            const patient = patientRes.data;
            const config = configRes.data;

            const proceduresList = budget.budget_items.map((i) => i.procedure_name).join(", ");
            const description = `${budget.title} — ${proceduresList} — ${getPaymentMethodSummary()}`;

            const address = clinic?.address as any;
            const clinicAddress = address
              ? [address.street, address.number, address.neighborhood, address.city, address.state]
                  .filter(Boolean)
                  .join(", ")
              : undefined;

            const reciboData: ReciboData = {
              receiptNumber: createdTitles[0]?.title_number || 1,
              titleNumber: createdTitles[0]?.title_number || 1,
              installmentNumber: 1,
              totalInstallments: 1,
              patientName: patient?.full_name || "Paciente",
              patientCpf: patient?.cpf || undefined,
              amount: budget.final_value,
              paymentMethod: primaryMethod,
              paymentDate: format(new Date(), "yyyy-MM-dd"),
              clinicName: clinic?.nome || "Clínica",
              clinicCnpj: clinic?.cnpj || undefined,
              clinicPhone: clinic?.telefone || undefined,
              clinicAddress,
              clinicLogoUrl: await resolveClinicLogoUrl(config?.logotipo_url),
              description,
            };

            await generateRecibo(reciboData);
          } catch (receiptErr) {
            console.error("Erro ao gerar recibo:", receiptErr);
            toast.warning("Pagamento registrado, mas houve erro ao gerar o recibo.");
          }
        }
      }

      // Auto-generate contract document
      try {
        const [clinicRes, patientRes, configRes] = await Promise.all([
          supabase.from("clinicas").select("nome, cnpj, telefone, address").eq("id", budget.clinic_id).single(),
          supabase.from("patients").select("full_name, cpf, address, responsible_name, responsible_cpf").eq("id", budget.patient_id).single(),
          supabase.from("configuracoes_clinica").select("*").eq("clinica_id", budget.clinic_id).maybeSingle(),
        ]);

        const clinic = clinicRes.data;
        const patient = patientRes.data;

        // Get first professional from budget items
        const firstProfId = budget.budget_items.find((i) => i.professional_id)?.professional_id;
        let prof: any = null;
        if (firstProfId) {
          const { data: profData } = await supabase
            .from("profissionais")
            .select("nome, cro, especialidade")
            .eq("id", firstProfId)
            .single();
          prof = profData;
        }

        const clinicAddr = clinic?.address as any;
        const clinicAddressStr = clinicAddr
          ? [clinicAddr.street, clinicAddr.number, clinicAddr.neighborhood, clinicAddr.city, clinicAddr.state].filter(Boolean).join(", ")
          : "";
        const clinicCity = clinicAddr?.city || "";
        const clinicUf = clinicAddr?.state || "";

        const proceduresList = budget.budget_items.map((i) => i.procedure_name).join(", ");
        const contractNum = generateContractNumber();

        // Build payment summary from allocations
        const paymentMethodLabel = getPaymentMethodSummary();
        const firstAlloc = allocations[0];
        const totalInstallments = allocations.reduce((sum, a) => sum + a.installments_count, 0);

        const contractContent = generateContractTemplate({
          clinicName: clinic?.nome || "",
          clinicCnpj: clinic?.cnpj || "",
          clinicAddress: clinicAddressStr,
          clinicCity,
          clinicUf,
          clinicPhone: clinic?.telefone || "",
          professionalName: prof?.nome || "",
          professionalCro: prof?.cro || "",
          professionalSpecialty: prof?.especialidade || "",
          patientName: patient?.full_name || "",
          patientCpf: patient?.cpf || "",
          patientAddress: patient?.address || "",
          patientCity: clinicCity,
          responsibleName: (patient as any)?.responsible_name || undefined,
          responsibleCpf: (patient as any)?.responsible_cpf || undefined,
          mainProcedure: proceduresList,
          totalValue: budget.final_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
          downPayment: firstAlloc?.is_immediate ? firstAlloc.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : undefined,
          installmentsCount: totalInstallments > 1 ? String(totalInstallments) : undefined,
          installmentValue: totalInstallments > 1 ? (budget.final_value / totalInstallments).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : undefined,
          paymentMethod: paymentMethodLabel,
          signingCity: clinicCity,
          signingDate: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
          courtDistrict: clinicCity,
          contractNumber: contractNum,
          contractVersion: "1",
        });

        await supabase.from("patient_documents").insert({
          patient_id: budget.patient_id,
          clinic_id: budget.clinic_id,
          document_type: "contrato",
          title: `Contrato de Prestacao de Servicos - ${patient?.full_name || "Paciente"}`,
          content: contractContent,
          created_by: user.id,
          status: "finalizado",
          professional_id: firstProfId || null,
          budget_id: budget.id,
          contract_value: budget.final_value,
          procedures_list: proceduresList,
          patient_cpf: patient?.cpf || null,
          patient_address: patient?.address || null,
          contract_number: contractNum,
          contract_version: 1,
        });
      } catch (contractErr) {
        console.error("Erro ao gerar contrato automatico:", contractErr);
        // Non-blocking — approval still succeeds
      }

      toast.success(
        isAllImmediate()
          ? `Orçamento aprovado e pagamento registrado! Recibo gerado.`
          : `Orçamento aprovado! ${data?.titles_created || 0} parcela(s) gerada(s).`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao aprovar:", error);
      toast.error(error.message || "Erro ao aprovar orçamento");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Resumo", "Pagamento", "Parcelas", "Confirmar"];

  if (loadingBudget) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!budget) return null;

  const previewInstallments = step >= 3 ? generatePreviewInstallments() : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Aprovar Orçamento</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-4">
          {stepLabels.map((label, idx) => (
            <div key={idx} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
                  step > idx + 1
                    ? "bg-primary text-primary-foreground"
                    : step === idx + 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > idx + 1 ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  step === idx + 1 ? "font-semibold" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
              {idx < 3 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Resumo */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {budget.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-lg divide-y">
                  {budget.budget_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 text-sm"
                    >
                      <div>
                        <span className="font-medium">{item.procedure_name}</span>
                        {item.tooth_region && (
                          <span className="text-muted-foreground ml-2">
                            ({item.tooth_region})
                          </span>
                        )}
                      </div>
                      <span className="font-medium">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(budget.total_value)}</span>
                  </div>
                  {budget.discount_value > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Desconto</span>
                      <span>-{formatCurrency(budget.discount_value)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(budget.final_value)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Responsável financeiro */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Responsável Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Próprio paciente (padrão)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprio">Próprio paciente</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.relation ? ` (${c.relation})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione quem será o responsável pelo pagamento
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setStep(2)}>
                Definir Pagamento <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Condições de pagamento */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Composição do Pagamento
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total: {formatCurrency(budget.final_value)} — Adicione uma ou
                  mais formas de pagamento
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addAllocation}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {allocations.length === 0 && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhuma forma de pagamento definida
                </p>
                <Button size="sm" onClick={addAllocation}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar forma de pagamento
                </Button>
              </div>
            )}

            {allocations.map((alloc, idx) => (
              <Card key={alloc.id} className="relative">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      Bloco {idx + 1}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => removeAllocation(alloc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Forma de pagamento</Label>
                      <Select
                        value={alloc.payment_method}
                        onValueChange={(v) =>
                          updateAllocation(alloc.id, "payment_method", v)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          value={alloc.amount || ""}
                          onChange={(e) =>
                            updateAllocation(
                              alloc.id,
                              "amount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="pl-9 h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nº de parcelas</Label>
                      <Select
                        value={alloc.installments_count.toString()}
                        onValueChange={(v) =>
                          updateAllocation(
                            alloc.id,
                            "installments_count",
                            parseInt(v)
                          )
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i + 1).map(
                            (n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n === 1
                                  ? "À vista"
                                  : `${n}x de ${formatCurrency(alloc.amount / n)}`}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {alloc.installments_count === 1
                          ? "Data do pagamento"
                          : "1º vencimento"}
                      </Label>
                      <Input
                        type="date"
                        value={alloc.first_due_date}
                        onChange={(e) =>
                          updateAllocation(
                            alloc.id,
                            "first_due_date",
                            e.target.value
                          )
                        }
                        className="h-9"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={alloc.is_immediate}
                      onChange={(e) =>
                        updateAllocation(
                          alloc.id,
                          "is_immediate",
                          e.target.checked
                        )
                      }
                      className="rounded"
                    />
                    Pagamento imediato (entrada)
                  </label>
                </CardContent>
              </Card>
            ))}

            {/* Summary bar */}
            {allocations.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total alocado</span>
                  <span
                    className={
                      Math.abs(remaining) < 0.01
                        ? "text-primary font-semibold"
                        : "text-destructive font-semibold"
                    }
                  >
                    {formatCurrency(totalAllocated)}
                  </span>
                </div>
                {Math.abs(remaining) > 0.01 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>
                      {remaining > 0 ? "Faltam alocar" : "Excesso"}
                    </span>
                    <span>{formatCurrency(Math.abs(remaining))}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2()}>
                Revisar Parcelas <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview das parcelas */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Parcelas que serão geradas ({previewInstallments.length})
            </h3>

            <div className="border rounded-lg divide-y max-h-[40vh] overflow-y-auto">
              {previewInstallments.map((inst, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{inst.label}</div>
                    <div className="text-xs text-muted-foreground">
                      Venc:{" "}
                      {new Date(inst.dueDate + "T12:00:00").toLocaleDateString(
                        "pt-BR"
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inst.isImmediate && (
                      <Badge
                        variant="outline"
                        className="text-xs border-primary/30 text-primary"
                      >
                        Entrada
                      </Badge>
                    )}
                    <span className="font-semibold">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between font-bold">
                <span>Total das parcelas</span>
                <span>
                  {formatCurrency(
                    previewInstallments.reduce((s, i) => s + i.amount, 0)
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button onClick={() => setStep(4)}>
                Confirmar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmação final */}
        {step === 4 && (
          <div className="space-y-4">
            {isAllImmediate() ? (
              <Alert className="bg-primary/10 border-primary/30">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  Pagamento imediato detectado. Ao confirmar, o sistema irá:{" "}
                  <strong>aprovar o orçamento</strong>,{" "}
                  <strong>registrar a baixa de todas as parcelas</strong> e{" "}
                  <strong>gerar o recibo consolidado</strong> automaticamente.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-accent/50 border-accent">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Ao confirmar, serão criados automaticamente:{" "}
                  <strong>plano financeiro</strong>,{" "}
                  <strong>{previewInstallments.length} parcelas</strong>,{" "}
                  <strong>tratamento</strong> e{" "}
                  <strong>provisões de comissão</strong>. As parcelas ficarão abertas para baixa individual.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Orçamento</span>
                <span className="font-medium">{budget.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor total</span>
                <span className="font-medium">
                  {formatCurrency(budget.final_value)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Formas de pagamento</span>
                <span className="font-medium">
                  {allocations.map((a) => getMethodLabel(a.payment_method)).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parcelas</span>
                <span className="font-medium">{previewInstallments.length}</span>
              </div>
              {responsavelId && responsavelId !== "proprio" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Responsável financeiro
                  </span>
                  <span className="font-medium">
                    {contacts.find((c) => c.id === responsavelId)?.name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Voltar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="bg-[hsl(var(--success-green))] hover:bg-[hsl(var(--success-green)/0.9)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar Orçamento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
