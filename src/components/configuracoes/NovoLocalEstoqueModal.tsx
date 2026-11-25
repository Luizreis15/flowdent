import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface NovoLocalEstoqueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
}

export function NovoLocalEstoqueModal({ open, onOpenChange, clinicaId }: NovoLocalEstoqueModalProps) {
  const { register, handleSubmit, reset, setValue } = useForm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("stock_locations").insert({
        clinica_id: clinicaId,
        nome: formData.nome,
        descricao: formData.descricao || null,
        tipo: formData.tipo || "deposito",
      });

      if (error) throw error;

      toast({
        title: "Local cadastrado",
        description: "Local de estoque cadastrado com sucesso",
      });

      queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar local",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo local de estoque</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do local *</Label>
              <Input id="nome" {...register("nome")} required placeholder="Ex: Consultório 1, Depósito Principal" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select defaultValue="deposito" onValueChange={(value) => setValue("tipo", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="consultorio">Consultório</SelectItem>
                  <SelectItem value="armario">Armário</SelectItem>
                  <SelectItem value="sala">Sala</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} placeholder="Informações adicionais sobre o local" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
