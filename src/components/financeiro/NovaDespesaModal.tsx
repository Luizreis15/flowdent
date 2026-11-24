import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NovaDespesaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  onSuccess: () => void;
}

interface Supplier {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

interface Category {
  id: string;
  nome: string;
  cor: string;
}

interface ExpenseType {
  id: string;
  nome: string;
  tipo: string;
}

export const NovaDespesaModal = ({ open, onOpenChange, clinicId, onSuccess }: NovaDespesaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);

  const [formData, setFormData] = useState({
    description: "",
    supplierId: "",
    categoryId: "",
    expenseTypeId: "",
    amount: "",
    dueDate: new Date().toISOString().split("T")[0],
    documentNumber: "",
    recurrence: "none",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadOptions();
    }
  }, [open, clinicId]);

  const loadOptions = async () => {
    try {
      const [suppliersRes, categoriesRes, typesRes] = await Promise.all([
        supabase.from("suppliers").select("id, razao_social, nome_fantasia").eq("clinica_id", clinicId).eq("ativo", true),
        supabase.from("expense_categories").select("id, nome, cor").eq("clinic_id", clinicId).eq("ativo", true),
        supabase.from("expense_types").select("id, nome, tipo").eq("clinic_id", clinicId).eq("ativo", true),
      ]);

      if (suppliersRes.data) setSuppliers(suppliersRes.data as Supplier[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
      if (typesRes.data) setExpenseTypes(typesRes.data as ExpenseType[]);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    }
  };

  const getSupplierDisplayName = (supplier: Supplier) => {
    return supplier.nome_fantasia || supplier.razao_social;
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

      const { error } = await supabase.from("payable_titles").insert({
        clinic_id: clinicId,
        description: formData.description,
        supplier_id: formData.supplierId || null,
        category_id: formData.categoryId || null,
        expense_type_id: formData.expenseTypeId || null,
        amount: amount,
        balance: amount,
        due_date: formData.dueDate,
        document_number: formData.documentNumber || null,
        recurrence: formData.recurrence,
        notes: formData.notes || null,
        created_by: user?.id,
        status: "open",
      });

      if (error) throw error;

      toast.success("Despesa criada com sucesso");
      resetForm();
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      toast.error("Erro ao criar despesa");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: "",
      supplierId: "",
      categoryId: "",
      expenseTypeId: "",
      amount: "",
      dueDate: new Date().toISOString().split("T")[0],
      documentNumber: "",
      recurrence: "none",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Despesa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Material de escritório"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{getSupplierDisplayName(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNumber">Nº Documento/NF</Label>
              <Input
                id="documentNumber"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="Ex: NF-12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseType">Tipo</Label>
              <Select value={formData.expenseTypeId} onValueChange={(v) => setFormData({ ...formData, expenseTypeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} ({t.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence">Recorrência</Label>
              <Select value={formData.recurrence} onValueChange={(v) => setFormData({ ...formData, recurrence: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Despesa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
