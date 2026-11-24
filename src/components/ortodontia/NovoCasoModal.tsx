import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface NovoCasoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovoCasoModal({ open, onOpenChange, onSuccess }: NovoCasoModalProps) {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [responsibleContactId, setResponsibleContactId] = useState("");
  const [tipoTratamento, setTipoTratamento] = useState("aparelho_fixo");
  const [classificacaoAngle, setClassificacaoAngle] = useState("");
  const [tipoMordida, setTipoMordida] = useState("");
  const [apinhamento, setApinhamento] = useState("");
  const [arcada, setArcada] = useState("ambas");
  const [marcaAparelho, setMarcaAparelho] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [previsaoTermino, setPrevisaoTermino] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [valorMensalidade, setValorMensalidade] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const [totalMeses, setTotalMeses] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const { data: patients } = useQuery({
    queryKey: ["patients-list", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("clinic_id", clinicId!)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: professionals } = useQuery({
    queryKey: ["professionals-list", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("clinica_id", clinicId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Load contacts for selected patient (responsible contacts)
  const { data: contacts } = useQuery({
    queryKey: ["patient-contacts", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("patient_contacts")
        .select("id, name, relation")
        .eq("patient_id", patientId);
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });

  const resetForm = () => {
    setPatientId("");
    setProfessionalId("");
    setResponsibleContactId("");
    setTipoTratamento("aparelho_fixo");
    setClassificacaoAngle("");
    setTipoMordida("");
    setApinhamento("");
    setArcada("ambas");
    setMarcaAparelho("");
    setDataInicio(new Date().toISOString().split("T")[0]);
    setPrevisaoTermino("");
    setValorTotal("");
    setValorEntrada("");
    setValorMensalidade("");
    setDiaVencimento("");
    setTotalMeses("");
    setObservacoes("");
  };

  const handleSubmit = async () => {
    if (!patientId || !professionalId) {
      toast.error("Selecione o paciente e o profissional");
      return;
    }

    setLoading(true);
    try {
      if (!clinicId) {
        toast.error("Clínica não encontrada");
        return;
      }

      const { data: newCase, error } = await supabase.from("ortho_cases").insert({
        clinic_id: clinicId,
        patient_id: patientId,
        professional_id: professionalId,
        responsible_contact_id: responsibleContactId || null,
        tipo_tratamento: tipoTratamento,
        classificacao_angle: classificacaoAngle || null,
        tipo_mordida: tipoMordida || null,
        apinhamento: apinhamento || null,
        arcada,
        marca_aparelho: marcaAparelho || null,
        data_inicio: dataInicio,
        previsao_termino: previsaoTermino || null,
        valor_total: parseFloat(valorTotal) || 0,
        valor_entrada: valorEntrada ? parseFloat(valorEntrada) : null,
        valor_mensalidade: valorMensalidade ? parseFloat(valorMensalidade) : null,
        dia_vencimento: diaVencimento ? parseInt(diaVencimento) : null,
        total_meses: totalMeses ? parseInt(totalMeses) : null,
        observacoes_clinicas: observacoes || null,
      }).select("id").single();

      if (error) throw error;

      // Auto-generate installments if financial data is complete
      if (newCase && valorMensalidade && totalMeses) {
        try {
          const { data: installmentResult, error: installmentError } = await supabase.functions.invoke("generate-ortho-installments", {
            body: { ortho_case_id: newCase.id },
          });
          if (!installmentError && installmentResult?.count) {
            toast.success(`${installmentResult.count} parcela(s) gerada(s) automaticamente!`);
          }
        } catch {
          // Non-blocking: case was created successfully
          toast.warning("Caso criado, mas houve erro ao gerar parcelas. Gere manualmente na aba Financeiro.");
        }
      }

      toast.success("Caso ortodôntico criado com sucesso");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao criar caso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Caso Ortodôntico</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Paciente */}
          <div className="space-y-2">
            <Label>Paciente *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <Label>Ortodontista *</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsável Financeiro */}
          {contacts && contacts.length > 0 && (
            <div className="space-y-2">
              <Label>Responsável Financeiro</Label>
              <Select value={responsibleContactId} onValueChange={setResponsibleContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (paciente é responsável)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Paciente é o responsável</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.relation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo Tratamento */}
          <div className="space-y-2">
            <Label>Tipo de Tratamento</Label>
            <Select value={tipoTratamento} onValueChange={setTipoTratamento}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aparelho_fixo">Aparelho Fixo</SelectItem>
                <SelectItem value="alinhadores">Alinhadores Invisíveis</SelectItem>
                <SelectItem value="movel">Aparelho Móvel</SelectItem>
                <SelectItem value="contencao">Contenção</SelectItem>
                <SelectItem value="ortopedia">Ortopedia Funcional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Classificação Angle */}
          <div className="space-y-2">
            <Label>Classificação de Angle</Label>
            <Select value={classificacaoAngle} onValueChange={setClassificacaoAngle}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classe_i">Classe I</SelectItem>
                <SelectItem value="classe_ii_div1">Classe II - Div 1</SelectItem>
                <SelectItem value="classe_ii_div2">Classe II - Div 2</SelectItem>
                <SelectItem value="classe_iii">Classe III</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo Mordida */}
          <div className="space-y-2">
            <Label>Tipo de Mordida</Label>
            <Select value={tipoMordida} onValueChange={setTipoMordida}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="profunda">Profunda</SelectItem>
                <SelectItem value="cruzada">Cruzada</SelectItem>
                <SelectItem value="topo">Topo a Topo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Apinhamento */}
          <div className="space-y-2">
            <Label>Apinhamento</Label>
            <Select value={apinhamento} onValueChange={setApinhamento}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="moderado">Moderado</SelectItem>
                <SelectItem value="severo">Severo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Arcada */}
          <div className="space-y-2">
            <Label>Arcada</Label>
            <Select value={arcada} onValueChange={setArcada}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="superior">Superior</SelectItem>
                <SelectItem value="inferior">Inferior</SelectItem>
                <SelectItem value="ambas">Ambas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Marca Aparelho */}
          <div className="space-y-2">
            <Label>Marca do Aparelho/Alinhador</Label>
            <Input value={marcaAparelho} onChange={(e) => setMarcaAparelho(e.target.value)} placeholder="Ex: Invisalign, 3M..." />
          </div>

          {/* Data Início */}
          <div className="space-y-2">
            <Label>Data de Início *</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>

          {/* Previsão Término */}
          <div className="space-y-2">
            <Label>Previsão de Término</Label>
            <Input type="date" value={previsaoTermino} onChange={(e) => setPrevisaoTermino(e.target.value)} />
          </div>

          {/* Valor Total */}
          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} placeholder="0,00" />
          </div>

          {/* Valor Entrada */}
          <div className="space-y-2">
            <Label>Valor Entrada (R$)</Label>
            <Input type="number" step="0.01" value={valorEntrada} onChange={(e) => setValorEntrada(e.target.value)} placeholder="0,00" />
          </div>

          {/* Valor Mensalidade */}
          <div className="space-y-2">
            <Label>Mensalidade (R$)</Label>
            <Input type="number" step="0.01" value={valorMensalidade} onChange={(e) => setValorMensalidade(e.target.value)} placeholder="0,00" />
          </div>

          {/* Dia Vencimento */}
          <div className="space-y-2">
            <Label>Dia do Vencimento</Label>
            <Input type="number" min="1" max="31" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} placeholder="10" />
          </div>

          {/* Total Meses */}
          <div className="space-y-2">
            <Label>Duração (meses)</Label>
            <Input type="number" value={totalMeses} onChange={(e) => setTotalMeses(e.target.value)} placeholder="24" />
          </div>

          {/* Observações */}
          <div className="md:col-span-2 space-y-2">
            <Label>Observações Clínicas</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Anotações sobre o caso..." rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Criar Caso"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
