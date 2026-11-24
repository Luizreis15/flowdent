import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ProcedimentoItem {
  id: string;
  procedimento_id: string;
  valor_customizado: number;
  procedimento: {
    codigo_sistema: string;
    descricao: string;
    especialidade: string;
    valor: number;
  };
}

interface EditarProcedimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProcedimentoItem | null;
  onSuccess: () => void;
}

export default function EditarProcedimentoModal({ open, onOpenChange, item, onSuccess }: EditarProcedimentoModalProps) {
  const [valorCustomizado, setValorCustomizado] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setValorCustomizado(item.valor_customizado.toString());
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    const valor = parseFloat(valorCustomizado);
    if (isNaN(valor) || valor < 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("planos_procedimentos_itens")
        .update({
          valor_customizado: valor,
          updated_at: new Date().toISOString()
        })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Valor atualizado com sucesso");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar valor:", error);
      toast.error("Erro ao atualizar valor");
    } finally {
      setLoading(false);
    }
  };


  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Valor do Procedimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Código</Label>
            <p className="font-mono text-sm">{item.procedimento.codigo_sistema}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Procedimento</Label>
            <p className="text-sm">{item.procedimento.descricao}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Especialidade</Label>
            <p className="text-sm">{item.procedimento.especialidade}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Valor Base (Tabela)</Label>
            <p className="text-sm">{formatCurrency(item.procedimento.valor)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor no Plano (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={valorCustomizado}
              onChange={(e) => setValorCustomizado(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
