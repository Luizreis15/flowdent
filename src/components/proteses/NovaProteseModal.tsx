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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LaboratorioModal } from "./LaboratorioModal";
import { Plus } from "lucide-react";

const TIPOS_PROCEDIMENTO = [
  "Coroas",
  "Prótese Parcial Removível",
  "Prótese Total",
  "Facetas / Lentes",
  "Onlay / Inlay",
  "Pivô",
  "Barra / Overdenture",
  "Implante – Protetização",
  "Outro",
];

const MATERIAIS = [
  "Zircônia",
  "Porcelana",
  "Metal-Porcelana",
  "Resina Acrílica",
  "E-max",
  "Dissilicato de Lítio",
  "Metal",
  "Outro",
];

const CORES_VITA = [
  "A1", "A2", "A3", "A3.5", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D2", "D3", "D4",
];

interface NovaProteseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaProteseModal({
  open,
  onOpenChange,
  onSuccess,
}: NovaProteseModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("trabalho");

  const [formData, setFormData] = useState({
    // Dados gerais do trabalho
    paciente_id: "",
    profissional_id: "",
    procedimento_tipo: "",
    procedimento_nome: "",
    dente_elemento: "",
    material: "",
    cor_final: "",
    observacoes: "",
    // Primeira etapa
    etapa_nome: "Coleta de Moldagem",
    tipo_laboratorio: "externo",
    laboratorio_id: "",
    data_envio_prevista: "",
    data_retorno_prevista: "",
    etapa_custo: "",
    etapa_observacoes: "",
    // Financeiro geral
    custo_total_estimado: "",
    forma_pagamento: "",
  });

  const { data: pacientes } = useQuery({
    queryKey: ["patients-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name");
      return data || [];
    },
  });

  const { data: profissionais } = useQuery({
    queryKey: ["profissionais-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  const { data: laboratorios, refetch: refetchLabs } = useQuery({
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
    if (!formData.paciente_id || !formData.profissional_id || !formData.procedimento_nome) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha paciente, profissional e procedimento",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase.from("profiles").select("clinic_id").single();

      // 1. Criar prótese com novos campos
      const { data: protese, error: proteseError } = await supabase
        .from("proteses")
        .insert({
          clinica_id: profile?.clinic_id,
          paciente_id: formData.paciente_id,
          profissional_id: formData.profissional_id,
          procedimento_tipo: formData.procedimento_tipo,
          procedimento_nome: formData.procedimento_nome,
          dente_elemento: formData.dente_elemento || null,
          material: formData.material || null,
          cor_final: formData.cor_final || null,
          tipo_laboratorio: formData.tipo_laboratorio as "interno" | "externo",
          laboratorio_id: formData.laboratorio_id || null,
          data_envio_prevista: formData.data_envio_prevista || null,
          data_entrega_prevista: formData.data_retorno_prevista || null,
          custo_laboratorial: formData.custo_total_estimado ? parseFloat(formData.custo_total_estimado) : null,
          forma_pagamento: formData.forma_pagamento || null,
          observacoes: formData.observacoes || null,
        })
        .select()
        .single();

      if (proteseError) throw proteseError;

      // 2. Criar primeira etapa
      const { data: etapa, error: etapaError } = await supabase
        .from("protese_etapas")
        .insert({
          protese_id: protese.id,
          ordem: 1,
          nome_etapa: formData.etapa_nome || "Coleta de Moldagem",
          status: "pendente",
          laboratorio_id: formData.laboratorio_id || null,
          cor: formData.cor_final || null,
          data_envio: formData.data_envio_prevista || null,
          data_retorno_prevista: formData.data_retorno_prevista || null,
          custo: formData.etapa_custo ? parseFloat(formData.etapa_custo) : null,
          observacoes: formData.etapa_observacoes || null,
        })
        .select()
        .single();

      if (etapaError) throw etapaError;

      // 3. Atualizar prótese com etapa atual
      await supabase
        .from("proteses")
        .update({ etapa_atual_id: etapa.id })
        .eq("id", protese.id);

      // 4. Criar agendamento na agenda geral se há data de retorno prevista
      if (formData.data_retorno_prevista && formData.paciente_id && formData.profissional_id) {
        await supabase
          .from("appointments")
          .insert({
            patient_id: formData.paciente_id,
            dentist_id: formData.profissional_id,
            title: `Prótese - ${formData.etapa_nome || "Coleta de Moldagem"} - ${formData.procedimento_nome}`,
            appointment_date: `${formData.data_retorno_prevista}T09:00:00`,
            duration_minutes: 30,
            status: "scheduled",
            description: `Etapa protética: ${formData.etapa_nome || "Coleta de Moldagem"}. Prótese ID: ${protese.id}`,
          });
      }

      // 5. Se tem custo, criar despesa
      const custoEtapa = formData.etapa_custo ? parseFloat(formData.etapa_custo) : 0;
      if (custoEtapa > 0) {
        await supabase
          .from("financial_transactions")
          .insert({
            clinic_id: profile?.clinic_id,
            type: "expense",
            category: "Laboratório Protético",
            value: custoEtapa,
            date: formData.data_retorno_prevista || new Date().toISOString().split("T")[0],
            reference: `Prótese - ${formData.procedimento_nome} - Etapa 1`,
          });
      }

      toast({
        title: "Prótese criada",
        description: "O trabalho foi adicionado ao Kanban com a primeira etapa",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao criar prótese",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      paciente_id: "",
      profissional_id: "",
      procedimento_tipo: "",
      procedimento_nome: "",
      dente_elemento: "",
      material: "",
      cor_final: "",
      observacoes: "",
      etapa_nome: "Coleta de Moldagem",
      tipo_laboratorio: "externo",
      laboratorio_id: "",
      data_envio_prevista: "",
      data_retorno_prevista: "",
      etapa_custo: "",
      etapa_observacoes: "",
      custo_total_estimado: "",
      forma_pagamento: "",
    });
    setCurrentTab("trabalho");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Prótese</DialogTitle>
          </DialogHeader>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trabalho">Trabalho</TabsTrigger>
              <TabsTrigger value="etapa">1ª Etapa</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            </TabsList>

            {/* Tab 1: Dados Gerais do Trabalho */}
            <TabsContent value="trabalho" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={formData.paciente_id} onValueChange={(v) => setFormData({ ...formData, paciente_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {pacientes?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Profissional *</Label>
                  <Select value={formData.profissional_id} onValueChange={(v) => setFormData({ ...formData, profissional_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Procedimento *</Label>
                  <Select value={formData.procedimento_tipo} onValueChange={(v) => setFormData({ ...formData, procedimento_tipo: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PROCEDIMENTO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dente/Elemento</Label>
                  <Input
                    value={formData.dente_elemento}
                    onChange={(e) => setFormData({ ...formData, dente_elemento: e.target.value })}
                    placeholder="Ex: 11, 11-14, 46"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição do Trabalho *</Label>
                <Input
                  value={formData.procedimento_nome}
                  onChange={(e) => setFormData({ ...formData, procedimento_nome: e.target.value })}
                  placeholder="Ex: Coroa de Porcelana Elemento 11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Select value={formData.material} onValueChange={(v) => setFormData({ ...formData, material: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAIS.map((mat) => (
                        <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cor Final (VITA)</Label>
                  <Select value={formData.cor_final} onValueChange={(v) => setFormData({ ...formData, cor_final: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CORES_VITA.map((cor) => (
                        <SelectItem key={cor} value={cor}>{cor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações Gerais</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={2}
                  placeholder="Observações sobre o trabalho..."
                />
              </div>
            </TabsContent>

            {/* Tab 2: Primeira Etapa */}
            <TabsContent value="etapa" className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure os dados da primeira etapa do trabalho. Você poderá adicionar mais etapas depois.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nome da Etapa</Label>
                <Input
                  value={formData.etapa_nome}
                  onChange={(e) => setFormData({ ...formData, etapa_nome: e.target.value })}
                  placeholder="Ex: Coleta de Moldagem"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Laboratório</Label>
                <Select value={formData.tipo_laboratorio} onValueChange={(v) => setFormData({ ...formData, tipo_laboratorio: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interno">Interno</SelectItem>
                    <SelectItem value="externo">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo_laboratorio === "externo" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Laboratório</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLabModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Novo Lab
                    </Button>
                  </div>
                  <Select value={formData.laboratorio_id} onValueChange={(v) => setFormData({ ...formData, laboratorio_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o laboratório" />
                    </SelectTrigger>
                    <SelectContent>
                      {laboratorios?.map((lab) => (
                        <SelectItem key={lab.id} value={lab.id}>{lab.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Envio</Label>
                  <Input
                    type="date"
                    value={formData.data_envio_prevista}
                    onChange={(e) => setFormData({ ...formData, data_envio_prevista: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Retorno Previsto</Label>
                  <Input
                    type="date"
                    value={formData.data_retorno_prevista}
                    onChange={(e) => setFormData({ ...formData, data_retorno_prevista: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Custo desta Etapa (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.etapa_custo}
                  onChange={(e) => setFormData({ ...formData, etapa_custo: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Observações da Etapa</Label>
                <Textarea
                  value={formData.etapa_observacoes}
                  onChange={(e) => setFormData({ ...formData, etapa_observacoes: e.target.value })}
                  rows={2}
                  placeholder="Observações específicas desta etapa..."
                />
              </div>
            </TabsContent>

            {/* Tab 3: Financeiro */}
            <TabsContent value="financeiro" className="space-y-4">
              <div className="space-y-2">
                <Label>Custo Total Estimado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.custo_total_estimado}
                  onChange={(e) => setFormData({ ...formData, custo_total_estimado: e.target.value })}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">
                  Estimativa do custo total de todas as etapas do trabalho
                </p>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={formData.forma_pagamento} onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="ted">TED/DOC</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Criar Prótese"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LaboratorioModal
        open={labModalOpen}
        onOpenChange={setLabModalOpen}
        onSuccess={refetchLabs}
      />
    </>
  );
}
