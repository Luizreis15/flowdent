import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Cores da escala VITA
const CORES_VITA = [
  "A1", "A2", "A3", "A3.5", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D2", "D3", "D4",
];

// Tipos de etapas pré-definidas
const ETAPAS_PREDEFINIDAS = [
  "Coleta de Moldagem",
  "Base de Prova",
  "Montagem de Dentes",
  "Prova Estética",
  "Ajuste de Oclusão",
  "Aplicação de Cerâmica/Porcelana",
  "Glaze/Acabamento",
  "Retoque/Reparo",
  "Instalação Final",
  "Outra",
];

interface AdicionarEtapaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proteseId: string;
  proximaOrdem: number;
  onSuccess: () => void;
}

export function AdicionarEtapaModal({
  open,
  onOpenChange,
  proteseId,
  proximaOrdem,
  onSuccess,
}: AdicionarEtapaModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome_etapa: "",
    nome_etapa_custom: "",
    laboratorio_id: "",
    cor: "",
    data_envio: "",
    data_retorno_prevista: "",
    custo: "",
    observacoes: "",
  });

  const { data: laboratorios } = useQuery({
    queryKey: ["laboratorios-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("laboratorios")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  const handleSubmit = async () => {
    const nomeEtapa = formData.nome_etapa === "Outra" 
      ? formData.nome_etapa_custom 
      : formData.nome_etapa;

    if (!nomeEtapa) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da etapa",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Buscar dados da prótese para criar o agendamento
      const { data: proteseData } = await supabase
        .from("proteses")
        .select("paciente_id, profissional_id, procedimento_nome")
        .eq("id", proteseId)
        .single();

      // Criar a nova etapa
      const { data: novaEtapa, error } = await supabase
        .from("protese_etapas")
        .insert({
          protese_id: proteseId,
          ordem: proximaOrdem,
          nome_etapa: nomeEtapa,
          status: formData.data_envio ? "enviado" : "pendente",
          laboratorio_id: formData.laboratorio_id || null,
          cor: formData.cor || null,
          data_envio: formData.data_envio || null,
          data_retorno_prevista: formData.data_retorno_prevista || null,
          custo: formData.custo ? parseFloat(formData.custo) : null,
          observacoes: formData.observacoes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar a prótese para apontar para a nova etapa atual
      await supabase
        .from("proteses")
        .update({ etapa_atual_id: novaEtapa.id })
        .eq("id", proteseId);

      // Criar agendamento na agenda geral se há data de retorno prevista
      if (formData.data_retorno_prevista && proteseData) {
        await supabase
          .from("appointments")
          .insert({
            patient_id: proteseData.paciente_id,
            dentist_id: proteseData.profissional_id,
            title: `Prótese - ${nomeEtapa} - ${proteseData.procedimento_nome}`,
            appointment_date: `${formData.data_retorno_prevista}T09:00:00`,
            duration_minutes: 30,
            status: "scheduled",
            description: `Etapa protética: ${nomeEtapa}. Prótese ID: ${proteseId}`,
          });
      }

      toast({
        title: "Etapa adicionada",
        description: `Etapa "${nomeEtapa}" foi criada com sucesso`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao criar etapa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_etapa: "",
      nome_etapa_custom: "",
      laboratorio_id: "",
      cor: "",
      data_envio: "",
      data_retorno_prevista: "",
      custo: "",
      observacoes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Etapa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Etapa *</Label>
            <Select
              value={formData.nome_etapa}
              onValueChange={(v) => setFormData({ ...formData, nome_etapa: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de etapa" />
              </SelectTrigger>
              <SelectContent>
                {ETAPAS_PREDEFINIDAS.map((etapa) => (
                  <SelectItem key={etapa} value={etapa}>
                    {etapa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.nome_etapa === "Outra" && (
            <div className="space-y-2">
              <Label>Nome da Etapa *</Label>
              <Input
                value={formData.nome_etapa_custom}
                onChange={(e) =>
                  setFormData({ ...formData, nome_etapa_custom: e.target.value })
                }
                placeholder="Ex: Conferência de articulação"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Laboratório</Label>
            <Select
              value={formData.laboratorio_id}
              onValueChange={(v) =>
                setFormData({ ...formData, laboratorio_id: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o laboratório" />
              </SelectTrigger>
              <SelectContent>
                {laboratorios?.map((lab) => (
                  <SelectItem key={lab.id} value={lab.id}>
                    {lab.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cor (Escala VITA)</Label>
            <Select
              value={formData.cor}
              onValueChange={(v) => setFormData({ ...formData, cor: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a cor" />
              </SelectTrigger>
              <SelectContent>
                {CORES_VITA.map((cor) => (
                  <SelectItem key={cor} value={cor}>
                    {cor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Envio</Label>
              <Input
                type="date"
                value={formData.data_envio}
                onChange={(e) =>
                  setFormData({ ...formData, data_envio: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Retorno Previsto</Label>
              <Input
                type="date"
                value={formData.data_retorno_prevista}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    data_retorno_prevista: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custo desta Etapa (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.custo}
              onChange={(e) =>
                setFormData({ ...formData, custo: e.target.value })
              }
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              rows={2}
              placeholder="Observações específicas desta etapa..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Adicionar Etapa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
