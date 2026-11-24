import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

interface SaidaEstoqueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaidaEstoqueModal({ open, onOpenChange }: SaidaEstoqueModalProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const selectedProductId = watch("product_id");
  const selectedLocationId = watch("location_id");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", user.id)
        .single();
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products", profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("clinica_id", profile.clinic_id)
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
    enabled: !!profile?.clinic_id,
  });

  const { data: locations } = useQuery({
    queryKey: ["stock-locations", profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      const { data } = await supabase
        .from("stock_locations")
        .select("*")
        .eq("clinica_id", profile.clinic_id)
        .eq("ativo", true);
      return data || [];
    },
    enabled: !!profile?.clinic_id,
  });

  const { data: availableStock } = useQuery({
    queryKey: ["available-stock", selectedProductId, selectedLocationId],
    queryFn: async () => {
      if (!selectedProductId || !selectedLocationId) return [];
      const { data } = await supabase
        .from("stocks")
        .select(`
          *,
          batches(codigo, data_validade)
        `)
        .eq("product_id", selectedProductId)
        .eq("location_id", selectedLocationId)
        .gt("quantidade", 0);
      return data || [];
    },
    enabled: !!selectedProductId && !!selectedLocationId,
  });

  const totalAvailable = availableStock?.reduce((sum, s) => sum + Number(s.quantidade), 0) || 0;

  const onSubmit = async (data: any) => {
    if (!profile?.clinic_id) return;

    const quantidade = Number(data.quantidade);
    if (quantidade <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    if (quantidade > totalAvailable) {
      toast({
        title: "Estoque insuficiente",
        description: `Disponível: ${totalAvailable}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const product = products?.find(p => p.id === data.product_id);
      if (!product) throw new Error("Product not found");

      // Get stock to deduct (FEFO - First Expire First Out)
      let remainingQty = quantidade;
      const stocksToUpdate = [...(availableStock || [])].sort((a, b) => {
        const dateA = a.batches?.data_validade ? new Date(a.batches.data_validade).getTime() : Infinity;
        const dateB = b.batches?.data_validade ? new Date(b.batches.data_validade).getTime() : Infinity;
        return dateA - dateB;
      });

      for (const stock of stocksToUpdate) {
        if (remainingQty <= 0) break;

        const qtdToDeduct = Math.min(remainingQty, Number(stock.quantidade));
        const newQty = Number(stock.quantidade) - qtdToDeduct;

        // Update stock
        await supabase
          .from("stocks")
          .update({ quantidade: newQty })
          .eq("id", stock.id);

        // Create stock move
        await supabase.from("stock_moves").insert({
          clinica_id: profile.clinic_id,
          tipo: data.motivo || "saida",
          product_id: data.product_id,
          quantidade: -qtdToDeduct,
          custo_unitario: stock.custo_medio,
          custo_total: -qtdToDeduct * Number(stock.custo_medio),
          location_from_id: data.location_id,
          batch_id: stock.batch_id,
          doc_tipo: "saida_manual",
          observacoes: data.observacoes || null,
          usuario_id: user.id,
        });

        remainingQty -= qtdToDeduct;
      }

      toast({
        title: "Saída registrada",
        description: `${quantidade} unidade(s) removida(s) do estoque`,
      });

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["stock-moves"] });
      queryClient.invalidateQueries({ queryKey: ["available-stock"] });
      
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao registrar saída",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Saída de estoque</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="product_id">Produto *</Label>
            <Select onValueChange={(value) => setValue("product_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location_id">Local *</Label>
            <Select onValueChange={(value) => setValue("location_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o local" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProductId && selectedLocationId && (
            <div className="p-4 border rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Disponível:</span>
                <span className="text-lg">{totalAvailable}</span>
                {totalAvailable === 0 && (
                  <AlertTriangle className="h-4 w-4 text-destructive ml-2" />
                )}
              </div>
              {availableStock && availableStock.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  {availableStock.map((stock: any, idx) => (
                    <div key={idx}>
                      {stock.batches?.codigo && `Lote: ${stock.batches.codigo} • `}
                      Qtd: {stock.quantidade}
                      {stock.batches?.data_validade && 
                        ` • Validade: ${new Date(stock.batches.data_validade).toLocaleDateString('pt-BR')}`
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="quantidade">Quantidade *</Label>
            <Input
              id="quantidade"
              type="number"
              step="0.01"
              {...register("quantidade")}
              required
            />
          </div>

          <div>
            <Label htmlFor="motivo">Motivo</Label>
            <Select onValueChange={(value) => setValue("motivo", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saida">Consumo</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
                <SelectItem value="devolucao">Devolução</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register("observacoes")}
              placeholder="Informações adicionais sobre a saída..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || totalAvailable === 0}>
              {isSubmitting ? "Salvando…" : "Confirmar saída"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
