import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface LaboratorioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LaboratorioModal({
  open,
  onOpenChange,
  onSuccess,
}: LaboratorioModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    responsavel: "",
    telefone: "",
    whatsapp: "",
    prazo_medio_dias: "7",
    forma_pagamento: "",
    condicoes_comerciais: "",
  });

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o nome do laboratório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase.from("profiles").select("clinic_id").single();

      const { error } = await supabase.from("laboratorios").insert({
        clinica_id: profile?.clinic_id,
        ...formData,
        prazo_medio_dias: parseInt(formData.prazo_medio_dias),
      });

      if (error) throw error;

      toast({
        title: "Laboratório cadastrado",
        description: "O laboratório foi adicionado com sucesso",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        nome: "",
        responsavel: "",
        telefone: "",
        whatsapp: "",
        prazo_medio_dias: "7",
        forma_pagamento: "",
        condicoes_comerciais: "",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar laboratório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Laboratório</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Fantasia *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Lab Express"
            />
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input
              value={formData.responsavel}
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              placeholder="Nome do contato"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prazo Médio (dias úteis)</Label>
            <Input
              type="number"
              value={formData.prazo_medio_dias}
              onChange={(e) => setFormData({ ...formData, prazo_medio_dias: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Input
              value={formData.forma_pagamento}
              onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
              placeholder="Ex: PIX, Boleto, 50% entrada"
            />
          </div>

          <div className="space-y-2">
            <Label>Condições Comerciais</Label>
            <Textarea
              value={formData.condicoes_comerciais}
              onChange={(e) => setFormData({ ...formData, condicoes_comerciais: e.target.value })}
              rows={3}
              placeholder="Observações sobre condições de pagamento, descontos, etc."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Cadastrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
