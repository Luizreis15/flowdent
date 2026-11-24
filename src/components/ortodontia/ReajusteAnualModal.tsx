import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

interface ReajusteAnualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReajusteAnualModal({ open, onOpenChange, onSuccess }: ReajusteAnualModalProps) {
  const [percentual, setPercentual] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ casesUpdated: number; titulosUpdated: number } | null>(null);

  const { data: casosAtivos } = useQuery({
    queryKey: ["ortho-active-cases-for-adjustment"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.clinic_id) return [];

      const { data, error } = await supabase
        .from("ortho_cases")
        .select("id, valor_mensalidade, patient:patients!ortho_cases_patient_id_fkey(full_name)")
        .eq("clinic_id", profile.clinic_id)
        .eq("status", "ativo");

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const perc = parseFloat(percentual) || 0;

  const handleSubmit = async () => {
    if (!perc || perc <= 0) {
      toast.error("Informe um percentual válido");
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase.functions.invoke("ortho-price-adjustment", {
        body: {
          mode: "bulk",
          clinic_id: profile?.clinic_id,
          percentual_reajuste: perc,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResultado({ casesUpdated: data.casesUpdated, titulosUpdated: data.titulosUpdated });
      toast.success(`Reajuste aplicado: ${data.casesUpdated} caso(s) e ${data.titulosUpdated} parcela(s) atualizadas`);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao aplicar reajuste: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setResultado(null);
      setPercentual("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Reajuste Anual em Massa
          </DialogTitle>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4 text-center py-4">
            <div className="text-sinal-ok text-lg font-semibold">Reajuste aplicado</div>
            <p className="text-sm text-muted-foreground">
              {resultado.casesUpdated} caso(s) reajustado(s) e {resultado.titulosUpdated} parcela(s) atualizada(s).
            </p>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Percentual de Reajuste (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                placeholder="Ex: 8.5"
              />
            </div>

            {casosAtivos && casosAtivos.length > 0 && perc > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Preview do reajuste</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {casosAtivos.map((c: any) => {
                      const atual = Number(c.valor_mensalidade);
                      const novo = Math.round(atual * (1 + perc / 100) * 100) / 100;
                      return (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{c.patient?.full_name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-muted-foreground line-through">R$ {atual.toFixed(2)}</span>
                            <span className="font-medium tabular-nums text-foreground">R$ {novo.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {casosAtivos?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">Nenhum caso ativo encontrado.</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={loading || !perc || (casosAtivos?.length || 0) === 0}>
                {loading ? "Aplicando..." : "Aplicar Reajuste"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
