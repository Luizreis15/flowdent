import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface NovoModeloAnamneseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clinicaId?: string | null;
}

export default function NovoModeloAnamneseModal({
  open,
  onOpenChange,
  onSuccess,
  clinicaId = null,
}: NovoModeloAnamneseModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast.error("O nome do modelo é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("anamnese_modelos").insert({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        ativo,
        clinica_id: clinicaId,
      });

      if (error) throw error;

      toast.success("Modelo criado com sucesso");
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Erro ao criar modelo:", error);
      toast.error("Erro ao criar modelo de anamnese");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNome("");
    setDescricao("");
    setAtivo(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {clinicaId ? "Novo Modelo de Anamnese" : "Novo Modelo Global"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome do Modelo *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Anamnese Adulto"
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o objetivo deste modelo de anamnese"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo">Modelo ativo</Label>
            <Switch
              id="ativo"
              checked={ativo}
              onCheckedChange={setAtivo}
            />
          </div>

          {!clinicaId && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Este modelo será global e ficará disponível para todas as clínicas do sistema.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={loading}>
            {loading ? "Salvando..." : "Criar Modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
