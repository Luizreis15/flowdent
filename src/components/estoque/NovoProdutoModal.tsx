import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface NovoProdutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoProdutoModal({ open, onOpenChange }: NovoProdutoModalProps) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (formData: any) => {
    if (!profile?.clinic_id) return;
    
    setIsSubmitting(true);
    try {
      // Generate codigo_interno
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("clinica_id", profile.clinic_id);

      const codigoInterno = `PROD-${String((count || 0) + 1).padStart(6, "0")}`;

      const { error } = await supabase.from("products").insert({
        clinica_id: profile.clinic_id,
        codigo_interno: codigoInterno,
        nome: formData.nome,
        sku: formData.sku || null,
        ean: formData.ean || null,
        categoria: formData.categoria || null,
        marca: formData.marca || null,
        unidade: formData.unidade || "un",
        controle_lote: false,
        controle_validade: false,
        estoque_minimo: formData.estoque_minimo || 0,
        estoque_maximo: formData.estoque_maximo || null,
        local_padrao_id: null,
        metodo_custeio: formData.metodo_custeio || "media_ponderada",
        preco_venda: formData.preco_venda || null,
      });

      if (error) throw error;

      toast({
        title: "Produto cadastrado",
        description: "Produto cadastrado com sucesso",
      });

      queryClient.invalidateQueries({ queryKey: ["products"] });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao cadastrar produto",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome">Nome do produto *</Label>
              <Input id="nome" {...register("nome")} required />
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} />
            </div>

            <div>
              <Label htmlFor="ean">Código de barras (EAN)</Label>
              <Input id="ean" {...register("ean")} />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input id="categoria" {...register("categoria")} />
            </div>

            <div>
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" {...register("marca")} />
            </div>

            <div>
              <Label htmlFor="unidade">Unidade</Label>
              <Select defaultValue="un" onValueChange={(value) => setValue("unidade", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Unidade</SelectItem>
                  <SelectItem value="cx">Caixa</SelectItem>
                  <SelectItem value="pct">Pacote</SelectItem>
                  <SelectItem value="ml">Mililitro</SelectItem>
                  <SelectItem value="g">Grama</SelectItem>
                  <SelectItem value="kg">Quilograma</SelectItem>
                  <SelectItem value="l">Litro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
              <Input id="estoque_minimo" type="number" step="0.01" {...register("estoque_minimo")} />
            </div>

            <div>
              <Label htmlFor="estoque_maximo">Estoque máximo</Label>
              <Input id="estoque_maximo" type="number" step="0.01" {...register("estoque_maximo")} />
            </div>

            <div>
              <Label htmlFor="preco_venda">Preço de venda</Label>
              <Input id="preco_venda" type="number" step="0.01" {...register("preco_venda")} />
            </div>

            <div>
              <Label htmlFor="metodo_custeio">Método de custeio</Label>
              <Select defaultValue="media_ponderada" onValueChange={(value) => setValue("metodo_custeio", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="media_ponderada">Média Ponderada</SelectItem>
                  <SelectItem value="fifo">FIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : "Salvar produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}