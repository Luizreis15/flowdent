import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface ReajusteIndividualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casoId: string;
  valorAtual: number;
  onSuccess: () => void;
}

export function ReajusteIndividualModal({ open, onOpenChange, casoId, valorAtual, onSuccess }: ReajusteIndividualModalProps) {
  const [tipo, setTipo] = useState<"percentual" | "fixo">("percentual");
  const [percentual, setPercentual] = useState("");
  const [valorFixo, setValorFixo] = useState("");
  const [loading, setLoading] = useState(false);

  const novoValor = tipo === "percentual"
    ? Math.round(valorAtual * (1 + (parseFloat(percentual) || 0) / 100) * 100) / 100
    : parseFloat(valorFixo) || 0;

  const handleSubmit = async () => {
    if (tipo === "percentual" && (!percentual || parseFloat(percentual) <= 0)) {
      toast.error("Informe um percentual válido");
      return;
    }
    if (tipo === "fixo" && (!valorFixo || parseFloat(valorFixo) <= 0)) {
      toast.error("Informe um valor válido");
      return;
    }

    setLoading(true);
    try {
      const body: any = { mode: "individual", ortho_case_id: casoId };
      if (tipo === "percentual") {
        body.percentual_reajuste = parseFloat(percentual);
      } else {
        body.valor_fixo_novo = parseFloat(valorFixo);
      }

      const { data, error } = await supabase.functions.invoke("ortho-price-adjustment", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Reajuste aplicado: ${data.titulosUpdated} parcela(s) atualizada(s)`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar Reajuste</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            Valor atual: <span className="font-bold">R$ {valorAtual.toFixed(2)}</span>
          </div>

          <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="percentual" id="perc" />
              <Label htmlFor="perc">Percentual</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="fixo" id="fixo" />
              <Label htmlFor="fixo">Valor fixo</Label>
            </div>
          </RadioGroup>

          {tipo === "percentual" ? (
            <div className="space-y-2">
              <Label>Percentual (%)</Label>
              <Input type="number" step="0.01" value={percentual} onChange={(e) => setPercentual(e.target.value)} placeholder="Ex: 10" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Novo valor (R$)</Label>
              <Input type="number" step="0.01" value={valorFixo} onChange={(e) => setValorFixo(e.target.value)} placeholder="0,00" />
            </div>
          )}

          {novoValor > 0 && (
            <div className="text-sm bg-muted p-3 rounded-md">
              Novo valor: <span className="font-semibold tabular-nums text-foreground">R$ {novoValor.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Aplicando..." : "Confirmar Reajuste"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
