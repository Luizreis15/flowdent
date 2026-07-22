import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, FileText, Calendar, DollarSign, Printer, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AprovarOrcamentoModal } from "./AprovarOrcamentoModal";
import { supabase } from "@/integrations/supabase/client";
import { generateRecibo, type ReciboData } from "@/utils/generateRecibo";
import { resolveClinicLogoUrl } from "@/lib/storage";
import { toast } from "sonner";
import { format } from "date-fns";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  transferencia: "Transferência Bancária",
  boleto: "Boleto",
  cheque: "Cheque",
  convenio: "Convênio",
  carteira_digital: "Carteira Digital",
};

interface Budget {
  id: string;
  title: string;
  description?: string;
  total_value: number;
  discount_value: number;
  final_value: number;
  status: string;
  valid_until?: string;
  created_at: string;
  approved_at?: string;
}

interface OrcamentosTabProps {
  budgets: Budget[];
  onRefresh: () => void;
  onNewBudget: () => void;
}

export const OrcamentosTab = ({ budgets, onRefresh, onNewBudget }: OrcamentosTabProps) => {
  const [approvalBudgetId, setApprovalBudgetId] = useState<string | null>(null);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Rascunho", variant: "secondary" as const },
      pending: { label: "Pendente", variant: "outline" as const },
      sent: { label: "Enviado", variant: "outline" as const },
      approved: { label: "Aprovado", variant: "default" as const },
      rejected: { label: "Rejeitado", variant: "destructive" as const },
      expired: { label: "Expirado", variant: "secondary" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const canApprove = (status: string) =>
    status === "draft" || status === "pending" || status === "sent";

  const handleEmitirRecibo = async (budget: Budget) => {
    setGeneratingReceipt(budget.id);
    try {
      // Fetch titles, budget_items, clinic, patient data
      const [titlesRes, itemsRes] = await Promise.all([
        supabase
          .from("receivable_titles")
          .select("title_number, payment_method, status, amount, patient_id, clinic_id")
          .eq("budget_id", budget.id)
          .order("installment_number", { ascending: true }),
        supabase
          .from("budget_items")
          .select("procedure_name")
          .eq("budget_id", budget.id),
      ]);

      const titles = titlesRes.data || [];
      const items = itemsRes.data || [];

      if (titles.length === 0) {
        toast.error("Nenhuma parcela encontrada para este orçamento.");
        return;
      }

      const firstTitle = titles[0];
      const clinicId = firstTitle.clinic_id;
      const patientId = firstTitle.patient_id;

      const [clinicRes, patientRes, configRes] = await Promise.all([
        supabase.from("clinicas").select("nome, cnpj, telefone, address").eq("id", clinicId).single(),
        supabase.from("patients").select("full_name, cpf").eq("id", patientId).single(),
        supabase.from("configuracoes_clinica").select("logotipo_url").eq("clinica_id", clinicId).maybeSingle(),
      ]);

      const clinic = clinicRes.data;
      const patient = patientRes.data;
      const config = configRes.data;

      const proceduresList = items.map((i) => i.procedure_name).join(", ");
      const primaryMethod = firstTitle.payment_method || "pix";
      const installmentsCount = titles.length;
      const methodLabel = PAYMENT_METHOD_LABELS[primaryMethod] || primaryMethod;
      const methodSummary = installmentsCount > 1 ? `${methodLabel} ${installmentsCount}x` : methodLabel;
      const description = `${budget.title} — ${proceduresList} — ${methodSummary}`;

      const address = clinic?.address as any;
      const clinicAddress = address
        ? [address.street, address.number, address.neighborhood, address.city, address.state]
            .filter(Boolean)
            .join(", ")
        : undefined;

      const reciboData: ReciboData = {
        receiptNumber: firstTitle.title_number || 1,
        titleNumber: firstTitle.title_number || 1,
        installmentNumber: 1,
        totalInstallments: 1,
        patientName: patient?.full_name || "Paciente",
        patientCpf: patient?.cpf || undefined,
        amount: budget.final_value,
        paymentMethod: primaryMethod,
        paymentDate: budget.approved_at ? format(new Date(budget.approved_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        clinicName: clinic?.nome || "Clínica",
        clinicCnpj: clinic?.cnpj || undefined,
        clinicPhone: clinic?.telefone || undefined,
        clinicAddress,
        clinicLogoUrl: await resolveClinicLogoUrl(config?.logotipo_url),
        description,
      };

      await generateRecibo(reciboData);
      toast.success("Recibo gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar recibo:", error);
      toast.error("Erro ao gerar recibo");
    } finally {
      setGeneratingReceipt(null);
    }
  };

  if (budgets.length === 0) {
    return (
      <div className="space-y-6">
        <Button 
          className="bg-[hsl(var(--success-green))] hover:bg-[hsl(var(--success-green)/0.9)]"
          onClick={onNewBudget}
        >
          <Plus className="h-4 w-4 mr-2" />
          NOVO ORÇAMENTO
        </Button>

        <Card className="border-none shadow-none">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-48 h-48 mb-4">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <rect x="50" y="30" width="100" height="140" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" rx="4"/>
                <rect x="60" y="50" width="80" height="8" fill="hsl(var(--primary))" rx="2"/>
                <rect x="60" y="70" width="60" height="6" fill="hsl(var(--border))" rx="2"/>
                <rect x="60" y="85" width="70" height="6" fill="hsl(var(--border))" rx="2"/>
                <rect x="60" y="100" width="50" height="6" fill="hsl(var(--border))" rx="2"/>
                <circle cx="90" cy="130" r="15" fill="hsl(var(--primary))" opacity="0.2"/>
                <path d="M 85 130 L 88 133 L 95 125" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">
                Crie o primeiro orçamento
              </h3>
              <p className="text-lg font-semibold text-primary">
                para este paciente
              </p>
            </div>

            <div className="max-w-2xl space-y-3 text-left">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-[hsl(var(--success-green))] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Transforme o orçamento em <span className="font-semibold text-foreground">tratamentos e débitos</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-[hsl(var(--success-green))] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Composição <span className="font-semibold text-foreground">híbrida de pagamento</span> com múltiplas formas
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-[hsl(var(--success-green))] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Fácil e completo, com <span className="font-semibold text-foreground">odontograma</span> e <span className="font-semibold text-foreground">aprovação guiada</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Orçamentos</h2>
        <Button 
          className="bg-[hsl(var(--success-green))] hover:bg-[hsl(var(--success-green)/0.9)]"
          onClick={onNewBudget}
        >
          <Plus className="h-4 w-4 mr-2" />
          NOVO ORÇAMENTO
        </Button>
      </div>

      <div className="grid gap-4">
        {budgets.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{b.title}</CardTitle>
                  {b.description && (
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                  )}
                </div>
                {getStatusBadge(b.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="font-semibold">{formatCurrency(b.final_value)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="font-semibold">{formatDate(b.created_at)}</p>
                  </div>
                </div>
                {b.valid_until && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Válido até</p>
                      <p className="font-semibold">{formatDate(b.valid_until)}</p>
                    </div>
                  </div>
                )}
              </div>

              {b.discount_value > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(b.discount_value)}
                  </span>
                </div>
              )}

              <div className="flex gap-2 items-center flex-wrap">
                {canApprove(b.status) && (
                  <Button
                    size="sm"
                    onClick={() => setApprovalBudgetId(b.id)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar Orçamento
                  </Button>
                )}
                
                {b.status === "approved" && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Aprovado em {formatDate(b.approved_at!)}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEmitirRecibo(b)}
                      disabled={generatingReceipt === b.id}
                    >
                      {generatingReceipt === b.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4 mr-2" />
                      )}
                      Emitir Recibo
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Aprovação Guiada */}
      {approvalBudgetId && (
        <AprovarOrcamentoModal
          open={!!approvalBudgetId}
          onOpenChange={(open) => {
            if (!open) setApprovalBudgetId(null);
          }}
          budgetId={approvalBudgetId}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
