import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Camera, Info, DollarSign, Calendar, User, CreditCard } from "lucide-react";
import { AdicionarTratamentoSection } from "./AdicionarTratamentoSection";
import { ListaTratamentosSection } from "./ListaTratamentosSection";
import { format, addMonths } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface NovoOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  clinicaId: string;
  onSuccess: () => void;
}

interface TratamentoItem {
  id: string;
  procedimento_id: string;
  procedure_code?: string;
  nome: string;
  valor: number;
  dentista_id?: string;
  dentista_nome?: string;
  dente_regiao?: string;
  tooth_faces?: string;
  checked?: boolean;
}

interface PaymentPlan {
  entrada: number;
  parcelas: number;
  metodo: string;
  vencimentos: string[];
}

interface Professional {
  id: string;
  nome: string;
  especialidade: string | null;
}

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

export const NovoOrcamentoModal = ({
  open,
  onOpenChange,
  patientId,
  clinicaId,
  onSuccess,
}: NovoOrcamentoModalProps) => {
  const [step, setStep] = useState<"adicionar" | "listar" | "pagamento">("adicionar");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [planoSelecionado, setPlanoSelecionado] = useState("");
  const [tratamentos, setTratamentos] = useState<TratamentoItem[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [observacao, setObservacao] = useState("");
  const [emitirContrato, setEmitirContrato] = useState(false);
  const [configImpressao, setConfigImpressao] = useState({
    valorTotal: true,
    valorPorTratamento: true,
    parcelas: false,
    dentista: true,
    odontograma: true,
  });
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>({
    entrada: 0,
    parcelas: 1,
    metodo: "pix",
    vencimentos: [],
  });
  const [primeiroVencimento, setPrimeiroVencimento] = useState(
    format(addMonths(new Date(), 1), "yyyy-MM-dd")
  );

  useEffect(() => {
    if (open) {
      loadPlanos();
      loadUserInfo();
      loadProfessionals();
    }
  }, [open, clinicaId]);

  useEffect(() => {
    const vencimentos: string[] = [];
    const baseDate = new Date(primeiroVencimento);
    for (let i = 0; i < paymentPlan.parcelas; i++) {
      const date = addMonths(baseDate, i);
      vencimentos.push(format(date, "yyyy-MM-dd"));
    }
    setPaymentPlan(prev => ({ ...prev, vencimentos }));
  }, [paymentPlan.parcelas, primeiroVencimento]);

  const loadPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from("planos_procedimentos")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true)
        .order("is_padrao", { ascending: false });
      if (error) throw error;
      setPlanos(data || []);
      const planoPadrao = data?.find(p => p.is_padrao);
      if (planoPadrao) setPlanoSelecionado(planoPadrao.id);
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
    }
  };

  const loadProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, especialidade")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
    }
  };

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile) setResponsavel(profile.full_name);
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    }
  };

  const handleAdicionarTratamento = (tratamento: TratamentoItem) => {
    setTratamentos([...tratamentos, { ...tratamento, id: crypto.randomUUID(), checked: false }]);
  };

  const handleRemoverTratamento = (id: string) => {
    setTratamentos(tratamentos.filter(t => t.id !== id));
  };

  const handleToggleTratamento = (id: string) => {
    setTratamentos(tratamentos.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const handleUpdateProfessional = (tratamentoId: string, professionalId: string) => {
    const professional = professionals.find(p => p.id === professionalId);
    setTratamentos(tratamentos.map(t =>
      t.id === tratamentoId
        ? { ...t, dentista_id: professionalId, dentista_nome: professional?.nome }
        : t
    ));
  };

  const calcularValorTotal = () => tratamentos.reduce((sum, t) => sum + t.valor, 0);
  const calcularValorSelecionado = () => tratamentos.filter(t => t.checked).reduce((sum, t) => sum + t.valor, 0);
  const calcularTotal = () => calcularValorTotal() - desconto;
  const calcularValorParcela = () => {
    const valorRestante = calcularTotal() - paymentPlan.entrada;
    return paymentPlan.parcelas > 0 ? valorRestante / paymentPlan.parcelas : 0;
  };

  const handleSalvar = async (aprovar: boolean = false) => {
    if (!descricao.trim()) { toast.error("Digite a descrição do orçamento"); return; }
    if (tratamentos.length === 0) { toast.error("Adicione pelo menos um tratamento"); return; }
    if (aprovar) {
      const semProfissional = tratamentos.filter(t => !t.dentista_id);
      if (semProfissional.length > 0) {
        toast.error("Todos os tratamentos devem ter um profissional responsável para aprovar");
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const paymentPlanJson = {
        entrada: paymentPlan.entrada,
        parcelas: paymentPlan.parcelas,
        metodo: paymentPlan.metodo,
        vencimentos: paymentPlan.vencimentos,
      };

      const { data: orcamento, error: orcamentoError } = await supabase
        .from("budgets")
        .insert({
          patient_id: patientId,
          clinic_id: clinicaId,
          created_by: user.id,
          title: descricao,
          description: observacao,
          total_value: calcularValorTotal(),
          discount_value: desconto,
          final_value: calcularTotal(),
          status: "draft",
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          payment_plan: paymentPlanJson,
        })
        .select()
        .single();

      if (orcamentoError) throw orcamentoError;

      const itens = tratamentos.map(t => ({
        budget_id: orcamento.id,
        procedure_id: t.procedimento_id,
        procedure_code: t.procedure_code,
        procedure_name: t.nome,
        unit_price: t.valor,
        quantity: 1,
        total_price: t.valor,
        discount: 0,
        tooth_region: t.dente_regiao,
        tooth_faces: t.tooth_faces,
        professional_id: t.dentista_id || null,
        status: "pending",
      }));

      const { error: itensError } = await supabase.from("budget_items").insert(itens);
      if (itensError) throw itensError;

      if (aprovar) {
        const { data: approveResult, error: approveError } = await supabase.functions.invoke(
          "approve-budget",
          { body: { budget_id: orcamento.id, approved_by: user.id } }
        );
        if (approveError) {
          toast.error("Orçamento criado, mas erro ao aprovar. Tente aprovar manualmente.");
        } else if (approveResult.error) {
          toast.error(approveResult.error);
        } else {
          toast.success(`Orçamento aprovado! ${approveResult.titles?.length || 0} títulos gerados.`);
        }
      } else {
        toast.success("Orçamento criado com sucesso");
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Erro ao salvar orçamento:", error);
      toast.error("Erro ao salvar orçamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("adicionar");
    setDescricao("");
    setData(format(new Date(), "yyyy-MM-dd"));
    setTratamentos([]);
    setDesconto(0);
    setObservacao("");
    setEmitirContrato(false);
    setPaymentPlan({ entrada: 0, parcelas: 1, metodo: "pix", vencimentos: [] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-auto">
        <DialogHeader>
          <DialogTitle>Novo orçamento</DialogTitle>
        </DialogHeader>

        {step === "adicionar" && (
          <>
            {/* Mobile: single column, Desktop: 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="descricao">Descrição*</Label>
                <Input
                  id="descricao"
                  placeholder="Ex: Plano tratamento de Maria Luiza"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="h-12 sm:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <div className="relative">
                  <Input
                    id="responsavel"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    className="h-12 sm:h-10"
                  />
                  {responsavel && (
                    <button
                      onClick={() => setResponsavel("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <div className="sm:col-span-3 space-y-2">
                <Label htmlFor="data">Data*</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="h-12 sm:h-10"
                />
              </div>
            </div>

            <AdicionarTratamentoSection
              planos={planos}
              planoSelecionado={planoSelecionado}
              onPlanoChange={setPlanoSelecionado}
              clinicaId={clinicaId}
              onAdicionarTratamento={handleAdicionarTratamento}
            />

            <div className="flex justify-between pt-4 gap-3">
              <Button variant="outline" onClick={handleClose} className="h-12 sm:h-10 flex-1 sm:flex-none">
                Fechar
              </Button>
              <Button
                onClick={() => setStep("listar")}
                disabled={tratamentos.length === 0}
                className="h-12 sm:h-10 flex-1 sm:flex-none"
              >
                Continuar
              </Button>
            </div>
          </>
        )}

        {step === "listar" && (
          <>
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Tratamentos e Profissionais
              </h3>
              <div className="border rounded-lg divide-y">
                {tratamentos.map((t) => (
                  <div key={t.id} className="p-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{t.nome}</div>
                      {t.dente_regiao && (
                        <div className="text-xs text-muted-foreground">Região: {t.dente_regiao}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <Select
                        value={t.dentista_id || ""}
                        onValueChange={(value) => handleUpdateProfessional(t.id, value)}
                      >
                        <SelectTrigger className="w-full sm:w-[200px] h-10">
                          <SelectValue placeholder="Profissional" />
                        </SelectTrigger>
                        <SelectContent>
                          {professionals.map((prof) => (
                            <SelectItem key={prof.id} value={prof.id}>{prof.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-right font-medium text-sm whitespace-nowrap">
                        {formatCurrency(t.valor)}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoverTratamento(t.id)} className="h-8 w-8 p-0 flex-shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calcularValorTotal())}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Desconto:</span>
                  <Input
                    type="number"
                    value={desconto}
                    onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                    className="w-28 text-right h-10"
                  />
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calcularTotal())}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  placeholder="Observações sobre o orçamento..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  maxLength={5000}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 gap-3">
              <Button variant="outline" onClick={() => setStep("adicionar")} className="h-12 sm:h-10 flex-1 sm:flex-none">
                Voltar
              </Button>
              <Button onClick={() => setStep("pagamento")} className="h-12 sm:h-10 flex-1 sm:flex-none">
                Configurar pagamento
              </Button>
            </div>
          </>
        )}

        {step === "pagamento" && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CreditCard className="h-5 w-5" />
                  Plano de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Entrada (opcional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input
                        type="number"
                        value={paymentPlan.entrada}
                        onChange={(e) => setPaymentPlan({ ...paymentPlan, entrada: parseFloat(e.target.value) || 0 })}
                        className="pl-10 h-12 sm:h-10"
                        max={calcularTotal()}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Parcelas</Label>
                    <Select
                      value={paymentPlan.parcelas.toString()}
                      onValueChange={(value) => setPaymentPlan({ ...paymentPlan, parcelas: parseInt(value) })}
                    >
                      <SelectTrigger className="h-12 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n}x de {formatCurrency((calcularTotal() - paymentPlan.entrada) / n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Primeiro Vencimento</Label>
                    <Input
                      type="date"
                      value={primeiroVencimento}
                      onChange={(e) => setPrimeiroVencimento(e.target.value)}
                      className="h-12 sm:h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select
                      value={paymentPlan.metodo}
                      onValueChange={(value) => setPaymentPlan({ ...paymentPlan, metodo: value })}
                    >
                      <SelectTrigger className="h-12 sm:h-10">
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
                </div>

                <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
                  <div className="font-medium mb-2 text-sm">Resumo do Pagamento</div>
                  {paymentPlan.entrada > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Entrada:</span>
                      <span>{formatCurrency(paymentPlan.entrada)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>{paymentPlan.parcelas}x parcelas de:</span>
                    <span>{formatCurrency(calcularValorParcela())}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(calcularTotal())}</span>
                  </div>
                </div>

                {paymentPlan.vencimentos.length > 0 && (
                  <div className="space-y-2">
                    <Label>Vencimentos</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {paymentPlan.vencimentos.map((v, i) => (
                        <div key={i} className="text-sm bg-muted rounded p-2 text-center">
                          <div className="text-muted-foreground text-xs">Parcela {i + 1}</div>
                          <div className="font-medium text-xs sm:text-sm">
                            {new Date(v).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Switch id="contrato" checked={emitirContrato} onCheckedChange={setEmitirContrato} />
                <Label htmlFor="contrato" className="cursor-pointer text-sm">
                  Emitir <strong>contrato</strong> ao aprovar
                </Label>
              </div>
            </div>

            <Alert className="bg-acao-tenue border-primary/30">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Ao <strong>aprovar</strong>, serão criados automaticamente: tratamento, títulos a receber e provisões de comissão.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row justify-between pt-4 gap-3">
              <Button variant="outline" onClick={() => setStep("listar")} className="h-12 sm:h-10">
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSalvar(false)} disabled={loading} className="h-12 sm:h-10 flex-1 sm:flex-none">
                  Rascunho
                </Button>
                <Button
                  onClick={() => handleSalvar(true)}
                  disabled={loading}
                  className="h-12 sm:h-10 flex-1 sm:flex-none"
                >
                  {loading ? "PROCESSANDO..." : "APROVAR"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
