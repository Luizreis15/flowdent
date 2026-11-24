import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Treatment {
  id: string;
  procedure_name: string;
  treatment_status: string;
}

interface Professional {
  id: string;
  nome: string;
}

interface AdicionarEvolucaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  treatments: Treatment[];
  onSuccess: () => void;
}

export const AdicionarEvolucaoModal = ({
  open,
  onOpenChange,
  patientId,
  treatments,
  onSuccess,
}: AdicionarEvolucaoModalProps) => {
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("");
  const [description, setDescription] = useState("");
  const [evolutionDate, setEvolutionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = useState<string>("");
  const [professionalId, setProfessionalId] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadProfessionals();
      if (treatments.length === 1) {
        setSelectedTreatmentId(treatments[0].id);
      }
    }
  }, [open, treatments]);

  const loadProfessionals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("clinica_id", profile.clinic_id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setProfessionals(data || []);

      // Auto-selecionar se houver apenas um profissional
      if (data && data.length === 1) {
        setProfessionalId(data[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar profissionais:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTreatmentId || !description.trim() || !professionalId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setLoading(true);

      const evolutionData = {
        budget_item_id: selectedTreatmentId,
        patient_id: patientId,
        professional_id: professionalId,
        description: description.trim(),
        evolution_date: evolutionDate,
        status: status || "in_progress",
      };

      const { error } = await supabase
        .from("treatment_evolutions")
        .insert(evolutionData);

      if (error) throw error;

      toast.success("Evolução registrada com sucesso");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Erro ao adicionar evolução:", error);
      toast.error("Erro ao registrar evolução");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTreatmentId("");
    setDescription("");
    setEvolutionDate(new Date().toISOString().split("T")[0]);
    setStatus("");
    setProfessionalId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Evolução do Tratamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Procedimento */}
          <div className="space-y-2">
            <Label htmlFor="treatment">
              Procedimento <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedTreatmentId}
              onValueChange={setSelectedTreatmentId}
              disabled={treatments.length === 1}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                {treatments.map((treatment) => (
                  <SelectItem key={treatment.id} value={treatment.id}>
                    {treatment.procedure_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <Label htmlFor="professional">
              Profissional Responsável <span className="text-destructive">*</span>
            </Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={evolutionDate}
              onChange={(e) => setEvolutionDate(e.target.value)}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição da Evolução <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva o andamento do tratamento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status (Opcional)</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Manter atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Finalizado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se não selecionado, será marcado automaticamente como "Em andamento"
            </p>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Evolução"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
