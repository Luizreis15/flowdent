import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NovaTransacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  onSuccess: () => void;
}

export function NovaTransacaoModal({ open, onOpenChange, clinicId, onSuccess }: NovaTransacaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "receita",
    date: new Date().toISOString().split("T")[0],
    value: "",
    category: "",
    reference: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.value || !formData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("financial_transactions")
        .insert({
          clinic_id: clinicId,
          type: formData.type,
          date: formData.date,
          value: parseFloat(formData.value),
          category: formData.category,
          reference: formData.reference || null,
        });

      if (error) throw error;

      toast.success("Transação adicionada com sucesso");
      onSuccess();
      onOpenChange(false);
      
      setFormData({
        type: "receita",
        date: new Date().toISOString().split("T")[0],
        value: "",
        category: "",
        reference: "",
      });
    } catch (error: any) {
      console.error("Erro ao adicionar transação:", error);
      toast.error("Erro ao adicionar transação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formData.type === "receita" ? (
                    <>
                      <SelectItem value="Consulta">Consulta</SelectItem>
                      <SelectItem value="Tratamento">Tratamento</SelectItem>
                      <SelectItem value="Estética">Estética</SelectItem>
                      <SelectItem value="Ortodontia">Ortodontia</SelectItem>
                      <SelectItem value="Endodontia">Endodontia</SelectItem>
                      <SelectItem value="Implante">Implante</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Materiais">Materiais</SelectItem>
                      <SelectItem value="Equipamentos">Equipamentos</SelectItem>
                      <SelectItem value="Salários">Salários</SelectItem>
                      <SelectItem value="Aluguel">Aluguel</SelectItem>
                      <SelectItem value="Fornecedores">Fornecedores</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Impostos">Impostos</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referência/Descrição</Label>
            <Textarea
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              rows={3}
              placeholder="Ex: Paciente João Silva - Consulta"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
