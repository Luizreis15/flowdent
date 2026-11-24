import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Percent, TrendingUp, TrendingDown } from "lucide-react";

interface Plano {
  id: string;
  nome: string;
  percentual_ajuste: number | null;
  ativo: boolean | null;
  is_padrao: boolean | null;
}

interface EditarPlanoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: Plano | null;
  onSuccess: () => void;
}

export default function EditarPlanoModal({ open, onOpenChange, plano, onSuccess }: EditarPlanoModalProps) {
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [isPadrao, setIsPadrao] = useState(false);
  const [percentualAjuste, setPercentualAjuste] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAjusteConfirm, setShowAjusteConfirm] = useState(false);
  const [qtdProcedimentos, setQtdProcedimentos] = useState(0);
  const [aplicandoAjuste, setAplicandoAjuste] = useState(false);

  useEffect(() => {
    if (plano) {
      setNome(plano.nome);
      setAtivo(plano.ativo ?? true);
      setIsPadrao(plano.is_padrao ?? false);
      setPercentualAjuste("");
      loadQtdProcedimentos();
    }
  }, [plano]);

  const loadQtdProcedimentos = async () => {
    if (!plano) return;
    const { count } = await supabase
      .from("planos_procedimentos_itens")
      .select("*", { count: "exact", head: true })
      .eq("plano_id", plano.id);
    setQtdProcedimentos(count || 0);
  };

  const handleSave = async () => {
    if (!plano || !nome.trim()) {
      toast.error("Nome do plano é obrigatório");
      return;
    }

    setLoading(true);
    try {
      // Se está definindo como padrão, remover o padrão dos outros
      if (isPadrao && !plano.is_padrao) {
        const { data: planoData } = await supabase
          .from("planos_procedimentos")
          .select("clinica_id")
          .eq("id", plano.id)
          .single();

        if (planoData) {
          await supabase
            .from("planos_procedimentos")
            .update({ is_padrao: false })
            .eq("clinica_id", planoData.clinica_id)
            .neq("id", plano.id);
        }
      }

      const { error } = await supabase
        .from("planos_procedimentos")
        .update({
          nome: nome.trim(),
          ativo,
          is_padrao: isPadrao,
          updated_at: new Date().toISOString()
        })
        .eq("id", plano.id);

      if (error) throw error;

      toast.success("Plano atualizado com sucesso");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
      toast.error("Erro ao atualizar plano");
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarAjuste = () => {
    const valor = parseFloat(percentualAjuste);
    if (isNaN(valor) || valor === 0) {
      toast.error("Informe um percentual válido");
      return;
    }
    setShowAjusteConfirm(true);
  };

  const confirmarAjuste = async () => {
    if (!plano) return;

    const valor = parseFloat(percentualAjuste);
    const multiplicador = 1 + (valor / 100);

    setAplicandoAjuste(true);
    try {
      // Buscar todos os itens do plano
      const { data: itens, error: fetchError } = await supabase
        .from("planos_procedimentos_itens")
        .select("id, valor_customizado")
        .eq("plano_id", plano.id);

      if (fetchError) throw fetchError;

      // Atualizar cada item com o novo valor
      for (const item of itens || []) {
        const novoValor = Math.round(item.valor_customizado * multiplicador * 100) / 100;
        await supabase
          .from("planos_procedimentos_itens")
          .update({ 
            valor_customizado: novoValor,
            updated_at: new Date().toISOString()
          })
          .eq("id", item.id);
      }

      // Atualizar o percentual acumulado do plano
      const novoPercentual = (plano.percentual_ajuste || 0) + valor;
      await supabase
        .from("planos_procedimentos")
        .update({ 
          percentual_ajuste: novoPercentual,
          updated_at: new Date().toISOString()
        })
        .eq("id", plano.id);

      toast.success(`Ajuste de ${valor > 0 ? '+' : ''}${valor}% aplicado a ${itens?.length || 0} procedimentos!`);
      setPercentualAjuste("");
      setShowAjusteConfirm(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao aplicar ajuste:", error);
      toast.error("Erro ao aplicar ajuste");
    } finally {
      setAplicandoAjuste(false);
    }
  };

  const valorAjuste = parseFloat(percentualAjuste) || 0;

  if (!plano) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Plano</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Particular, Convênio..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ativo">Plano Ativo</Label>
              <Switch
                id="ativo"
                checked={ativo}
                onCheckedChange={setAtivo}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="padrao">Plano Padrão</Label>
              <Switch
                id="padrao"
                checked={isPadrao}
                onCheckedChange={setIsPadrao}
              />
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label>Ajuste em Massa</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Aplique um ajuste percentual a todos os {qtdProcedimentos} procedimentos deste plano.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={percentualAjuste}
                    onChange={(e) => setPercentualAjuste(e.target.value)}
                    placeholder="Ex: 15 ou -10"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleAplicarAjuste}
                  disabled={!percentualAjuste || aplicandoAjuste}
                >
                  {valorAjuste > 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                  ) : valorAjuste < 0 ? (
                    <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                  ) : null}
                  Aplicar
                </Button>
              </div>
              {plano?.percentual_ajuste !== null && plano?.percentual_ajuste !== 0 && (
                <p className="text-xs text-muted-foreground">
                  Ajuste acumulado: {plano.percentual_ajuste > 0 ? '+' : ''}{plano.percentual_ajuste}%
                </p>
              )}
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

      <AlertDialog open={showAjusteConfirm} onOpenChange={setShowAjusteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ajuste em Massa</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a aplicar um ajuste de{" "}
              <strong className={valorAjuste > 0 ? "text-green-600" : "text-red-600"}>
                {valorAjuste > 0 ? '+' : ''}{valorAjuste}%
              </strong>{" "}
              em <strong>{qtdProcedimentos} procedimentos</strong> do plano "{plano?.nome}".
              <br /><br />
              Esta ação não pode ser desfeita automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aplicandoAjuste}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAjuste} disabled={aplicandoAjuste}>
              {aplicandoAjuste ? "Aplicando..." : "Confirmar Ajuste"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
