import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronRight, Building2, Calendar, Repeat, AlertCircle, Settings } from "lucide-react";

interface NovaDespesaModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  onSuccess: () => void;
}

interface MacroType {
  id: string;
  nome: string;
  codigo: string;
}

interface ExpenseGroup {
  id: string;
  nome: string;
  macro_type_id: string | null;
}

interface ExpenseItem {
  id: string;
  nome: string;
  group_id: string | null;
  centro_custo: string | null;
  fornecedor_padrao_id: string | null;
  forma_pagamento_padrao: string | null;
  recorrente: boolean | null;
  frequencia: string | null;
}

interface Supplier {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

interface Caixa {
  id: string;
  nome: string;
}

export const NovaDespesaModalV2 = ({ open, onOpenChange, clinicId, onSuccess }: NovaDespesaModalV2Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Options
  const [macroTypes, setMacroTypes] = useState<MacroType[]>([]);
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  
  // Check if catalog is empty
  const isCatalogEmpty = groups.length === 0 && items.length === 0;

  // Form data
  const [formData, setFormData] = useState({
    macroTypeId: "",
    groupId: "",
    expenseItemId: "",
    description: "",
    supplierId: "",
    contaBancariaId: "",
    competencia: new Date().toISOString().slice(0, 7), // YYYY-MM
    dueDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "pix",
    documentNumber: "",
    centroCusto: "",
    parcelado: false,
    numeroParcelas: "2",
    isRecorrente: false,
    frequencia: "monthly",
    notes: "",
  });

  // Filtered options based on selection
  const filteredGroups = groups.filter(g => g.macro_type_id === formData.macroTypeId);
  const filteredItems = items.filter(i => i.group_id === formData.groupId);

  useEffect(() => {
    if (open) {
      loadOptions();
      resetForm();
    }
  }, [open, clinicId]);

  // Auto-fill when item is selected
  useEffect(() => {
    if (formData.expenseItemId) {
      const selectedItem = items.find(i => i.id === formData.expenseItemId);
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          description: selectedItem.nome,
          centroCusto: selectedItem.centro_custo || prev.centroCusto,
          supplierId: selectedItem.fornecedor_padrao_id || prev.supplierId,
          paymentMethod: selectedItem.forma_pagamento_padrao || prev.paymentMethod,
          isRecorrente: selectedItem.recorrente || false,
          frequencia: selectedItem.frequencia || "monthly",
        }));
      }
    }
  }, [formData.expenseItemId, items]);

  const loadOptions = async () => {
    try {
      const [macroRes, groupsRes, itemsRes, suppliersRes, caixasRes] = await Promise.all([
        supabase.from("expense_macro_types").select("id, nome, codigo")
          .or(`clinic_id.eq.${clinicId},is_system.eq.true`)
          .eq("ativo", true)
          .order("ordem"),
        supabase.from("expense_groups").select("id, nome, macro_type_id")
          .or(`clinic_id.eq.${clinicId},clinic_id.is.null`)
          .eq("ativo", true),
        supabase.from("expense_items").select("*")
          .or(`clinic_id.eq.${clinicId},clinic_id.is.null`)
          .eq("ativo", true),
        supabase.from("suppliers").select("id, razao_social, nome_fantasia")
          .eq("clinica_id", clinicId)
          .eq("ativo", true),
        supabase.from("caixas").select("id, nome")
          .eq("clinica_id", clinicId)
          .eq("ativo", true),
      ]);

      if (macroRes.data) setMacroTypes(macroRes.data);
      if (groupsRes.data) setGroups(groupsRes.data);
      if (itemsRes.data) setItems(itemsRes.data as ExpenseItem[]);
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (caixasRes.data) setCaixas(caixasRes.data);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      macroTypeId: "",
      groupId: "",
      expenseItemId: "",
      description: "",
      supplierId: "",
      contaBancariaId: "",
      competencia: new Date().toISOString().slice(0, 7),
      dueDate: new Date().toISOString().split("T")[0],
      amount: "",
      paymentMethod: "pix",
      documentNumber: "",
      centroCusto: "",
      parcelado: false,
      numeroParcelas: "2",
      isRecorrente: false,
      frequencia: "monthly",
      notes: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.dueDate) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const amount = parseFloat(formData.amount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      // Create recurrence if needed
      let recurrenceId = null;
      if (formData.isRecorrente) {
        const { data: recurrence, error: recError } = await supabase
          .from("financial_recurrences")
          .insert({
            clinic_id: clinicId,
            expense_item_id: formData.expenseItemId || null,
            tipo: "pagar",
            frequencia: formData.frequencia,
            valor: amount,
            dia_vencimento: new Date(formData.dueDate).getDate(),
            data_inicio: formData.dueDate,
            supplier_id: formData.supplierId || null,
            conta_bancaria_id: formData.contaBancariaId || null,
            descricao: formData.description,
            centro_custo: formData.centroCusto || null,
            ativo: true,
          })
          .select("id")
          .single();

        if (recError) throw recError;
        recurrenceId = recurrence?.id;
      }

      // Handle installments
      if (formData.parcelado) {
        const numParcelas = parseInt(formData.numeroParcelas);
        const valorParcela = amount / numParcelas;
        
        for (let i = 0; i < numParcelas; i++) {
          const dueDate = new Date(formData.dueDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          await supabase.from("payable_titles").insert({
            clinic_id: clinicId,
            description: `${formData.description} (${i + 1}/${numParcelas})`,
            expense_item_id: formData.expenseItemId || null,
            supplier_id: formData.supplierId || null,
            amount: valorParcela,
            balance: valorParcela,
            due_date: dueDate.toISOString().split("T")[0],
            competencia: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-01`,
            document_number: formData.documentNumber || null,
            notes: formData.notes || null,
            created_by: user?.id,
            status: "open",
            recurrence_id: recurrenceId,
            parcelado: true,
            parcela_numero: i + 1,
            total_parcelas: numParcelas,
            centro_custo: formData.centroCusto || null,
          });
        }
      } else {
        // Single payment
        const { error } = await supabase.from("payable_titles").insert({
          clinic_id: clinicId,
          description: formData.description,
          expense_item_id: formData.expenseItemId || null,
          supplier_id: formData.supplierId || null,
          amount: amount,
          balance: amount,
          due_date: formData.dueDate,
          competencia: `${formData.competencia}-01`,
          document_number: formData.documentNumber || null,
          notes: formData.notes || null,
          created_by: user?.id,
          status: "open",
          recurrence_id: recurrenceId,
          centro_custo: formData.centroCusto || null,
        });

        if (error) throw error;
      }

      toast.success(formData.parcelado 
        ? `${formData.numeroParcelas} parcelas criadas com sucesso!` 
        : "Despesa criada com sucesso");
      
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      toast.error("Erro ao criar despesa");
    } finally {
      setLoading(false);
    }
  };

  const getSupplierDisplayName = (supplier: Supplier) => {
    return supplier.nome_fantasia || supplier.razao_social;
  };

  const getSelectedPath = () => {
    const macro = macroTypes.find(m => m.id === formData.macroTypeId);
    const group = groups.find(g => g.id === formData.groupId);
    const item = items.find(i => i.id === formData.expenseItemId);
    
    const parts = [];
    if (macro) parts.push(macro.nome);
    if (group) parts.push(group.nome);
    if (item) parts.push(item.nome);
    
    return parts.join(" → ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Nova Despesa
            {formData.expenseItemId && (
              <span className="text-sm font-normal text-muted-foreground">
                | {getSelectedPath()}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Select from catalog */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
              Selecione do Catálogo
            </div>

            {isCatalogEmpty && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span>
                      O catálogo de despesas está vazio. Para ter grupos e itens disponíveis, importe o catálogo padrão.
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-amber-300 hover:bg-amber-100 shrink-0"
                      onClick={() => {
                        onOpenChange(false);
                        navigate("/dashboard/configuracoes?tab=despesas");
                      }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configurar Catálogo
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo Macro *</Label>
                <Select 
                  value={formData.macroTypeId} 
                  onValueChange={(v) => setFormData({ ...formData, macroTypeId: v, groupId: "", expenseItemId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {macroTypes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Grupo {!isCatalogEmpty && formData.macroTypeId && filteredGroups.length === 0 && "(nenhum)"}</Label>
                <Select 
                  value={formData.groupId} 
                  onValueChange={(v) => setFormData({ ...formData, groupId: v, expenseItemId: "" })}
                  disabled={!formData.macroTypeId || filteredGroups.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.macroTypeId 
                        ? "Selecione tipo" 
                        : filteredGroups.length === 0 
                          ? "Sem grupos" 
                          : "Selecione..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Item {!isCatalogEmpty && formData.groupId && filteredItems.length === 0 && "(nenhum)"}</Label>
                <Select 
                  value={formData.expenseItemId} 
                  onValueChange={(v) => setFormData({ ...formData, expenseItemId: v })}
                  disabled={!formData.groupId || filteredItems.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.groupId 
                        ? "Selecione grupo" 
                        : filteredItems.length === 0 
                          ? "Sem itens" 
                          : "Selecione..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredItems.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 2: Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
              Detalhes da Despesa
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Aluguel janeiro/2026"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div>
                <Label htmlFor="competencia">Competência</Label>
                <Input
                  id="competencia"
                  type="month"
                  value={formData.competencia}
                  onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Vencimento *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Forma Pagamento</Label>
                <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Fornecedor
                </Label>
                <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{getSupplierDisplayName(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Conta Bancária (saída)</Label>
                <Select value={formData.contaBancariaId} onValueChange={(v) => setFormData({ ...formData, contaBancariaId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {caixas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documentNumber">Nº Documento/NF</Label>
                <Input
                  id="documentNumber"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="Ex: NF-12345"
                />
              </div>

              <div>
                <Label htmlFor="centroCusto">Centro de Custo</Label>
                <Select value={formData.centroCusto} onValueChange={(v) => setFormData({ ...formData, centroCusto: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinica">Clínica</SelectItem>
                    <SelectItem value="recepcao">Recepção</SelectItem>
                    <SelectItem value="laboratorio">Laboratório</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 3: Installments & Recurrence */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
              Parcelamento e Recorrência
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Parcelamento */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label>Parcelado?</Label>
                  </div>
                  <Switch
                    checked={formData.parcelado}
                    onCheckedChange={(v) => setFormData({ ...formData, parcelado: v, isRecorrente: v ? false : formData.isRecorrente })}
                  />
                </div>

                {formData.parcelado && (
                  <div>
                    <Label>Número de Parcelas</Label>
                    <Select value={formData.numeroParcelas} onValueChange={(v) => setFormData({ ...formData, numeroParcelas: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.amount && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {formData.numeroParcelas}x de R$ {(parseFloat(formData.amount.replace(",", ".")) / parseInt(formData.numeroParcelas)).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Recorrência */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <Label>Recorrente?</Label>
                  </div>
                  <Switch
                    checked={formData.isRecorrente}
                    onCheckedChange={(v) => setFormData({ ...formData, isRecorrente: v, parcelado: v ? false : formData.parcelado })}
                  />
                </div>

                {formData.isRecorrente && (
                  <div>
                    <Label>Frequência</Label>
                    <Select value={formData.frequencia} onValueChange={(v) => setFormData({ ...formData, frequencia: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Será criada automaticamente todo mês
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? "Salvando..." : "Salvar Despesa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
