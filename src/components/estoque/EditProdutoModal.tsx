import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface EditProdutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
}

export function EditProdutoModal({ open, onOpenChange, product }: EditProdutoModalProps) {
  const { register, handleSubmit, reset, setValue } = useForm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product && open) {
      reset({
        nome: product.nome,
        sku: product.sku || "",
        ean: product.ean || "",
        categoria: product.categoria || "",
        marca: product.marca || "",
        unidade: product.unidade || "un",
        estoque_minimo: product.estoque_minimo || 0,
        estoque_maximo: product.estoque_maximo || "",
        preco_venda: product.preco_venda || "",
        metodo_custeio: product.metodo_custeio || "media_ponderada",
      });
      setValue("unidade", product.unidade || "un");
      setValue("metodo_custeio", product.metodo_custeio || "media_ponderada");
    }
  }, [product, open, reset, setValue]);

  const onSubmit = async (formData: any) => {
    if (!product?.id) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          nome: formData.nome,
          sku: formData.sku || null,
          ean: formData.ean || null,
          categoria: formData.categoria || null,
          marca: formData.marca || null,
          unidade: formData.unidade || "un",
          estoque_minimo: formData.estoque_minimo || 0,
          estoque_maximo: formData.estoque_maximo || null,
          metodo_custeio: formData.metodo_custeio || "media_ponderada",
          preco_venda: formData.preco_venda || null,
        })
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "Produto atualizado",
        description: "Produto atualizado com sucesso",
      });

      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao atualizar produto",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
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
              <Select 
                defaultValue={product.unidade || "un"} 
                onValueChange={(value) => setValue("unidade", value)}
              >
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
              <Select 
                defaultValue={product.metodo_custeio || "media_ponderada"} 
                onValueChange={(value) => setValue("metodo_custeio", value)}
              >
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
              {isSubmitting ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
