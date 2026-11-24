import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Save, CheckCircle2 } from "lucide-react";

interface Modelo {
  id: string;
  nome: string;
  descricao: string | null;
}

interface Pergunta {
  id: string;
  texto: string;
  tipo_resposta: string;
  obrigatoria: boolean;
  ordem: number;
  pergunta_pai_id: string | null;
  condicao_resposta: string | null;
}

interface Profissional {
  id: string;
  nome: string;
}

interface Resposta {
  pergunta_id: string;
  resposta: string;
  observacoes: string;
}

interface NovaAnamneseModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  duplicateFromId?: string | null;
  onSuccess: () => void;
}

export default function NovaAnamneseModal({
  open,
  onClose,
  patientId,
  duplicateFromId,
  onSuccess,
}: NovaAnamneseModalProps) {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Map<string, Resposta>>(new Map());
  
  const [modeloSelecionado, setModeloSelecionado] = useState("");
  const [profissionalSelecionado, setProfissionalSelecionado] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [anamneseId, setAnamneseId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadModelos();
      loadProfissionais();
      if (duplicateFromId) {
        loadAnamneseParaDuplicar(duplicateFromId);
      }
    }
  }, [open, duplicateFromId]);

  useEffect(() => {
    if (modeloSelecionado) {
      loadPerguntas(modeloSelecionado);
    }
  }, [modeloSelecionado]);

  const loadModelos = async () => {
    try {
      const { data, error } = await supabase
        .from("anamnese_modelos")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setModelos(data || []);
    } catch (error) {
      console.error("Erro ao carregar modelos:", error);
      toast.error("Erro ao carregar modelos de anamnese");
    }
  };

  const loadProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setProfissionais(data || []);

      // Auto-selecionar profissional logado se possível
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const profissional = data?.find((p) => p.id === userData.user.id);
        if (profissional) {
          setProfissionalSelecionado(profissional.id);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
    }
  };

  const loadPerguntas = async (modeloId: string) => {
    try {
      const { data, error } = await supabase
        .from("anamnese_perguntas")
        .select("*")
        .eq("modelo_id", modeloId)
        .order("ordem");

      if (error) throw error;
      setPerguntas(data || []);
    } catch (error) {
      console.error("Erro ao carregar perguntas:", error);
      toast.error("Erro ao carregar perguntas");
    }
  };

  const loadAnamneseParaDuplicar = async (anamneseId: string) => {
    try {
      const { data: anamnese, error: anamneseError } = await supabase
        .from("anamneses")
        .select("*, anamnese_respostas(*)")
        .eq("id", anamneseId)
        .single();

      if (anamneseError) throw anamneseError;

      setModeloSelecionado(anamnese.modelo_id);
      setProfissionalSelecionado(anamnese.profissional_id);

      // Pré-preencher respostas
      const respostasMap = new Map<string, Resposta>();
      anamnese.anamnese_respostas?.forEach((r: any) => {
        respostasMap.set(r.pergunta_id, {
          pergunta_id: r.pergunta_id,
          resposta: r.resposta,
          observacoes: r.observacoes || "",
        });
      });
      setRespostas(respostasMap);
    } catch (error) {
      console.error("Erro ao carregar anamnese:", error);
      toast.error("Erro ao carregar dados para duplicar");
    }
  };

  const handleRespostaChange = (perguntaId: string, resposta: string) => {
    const respostaAtual = respostas.get(perguntaId) || {
      pergunta_id: perguntaId,
      resposta: "",
      observacoes: "",
    };
    respostaAtual.resposta = resposta;
    setRespostas(new Map(respostas.set(perguntaId, respostaAtual)));
    autoSave();
  };

  const handleObservacoesChange = (perguntaId: string, observacoes: string) => {
    const respostaAtual = respostas.get(perguntaId) || {
      pergunta_id: perguntaId,
      resposta: "",
      observacoes: "",
    };
    respostaAtual.observacoes = observacoes;
    setRespostas(new Map(respostas.set(perguntaId, respostaAtual)));
  };

  const autoSave = async () => {
    // Auto-save implementação simplificada
    // Em produção, usar debounce
  };

  const validarObrigatorias = () => {
    const obrigatorias = perguntas.filter((p) => p.obrigatoria);
    const faltando = obrigatorias.filter((p) => {
      const resposta = respostas.get(p.id);
      return !resposta || !resposta.resposta;
    });

    if (faltando.length > 0) {
      toast.error(`${faltando.length} pergunta(s) obrigatória(s) não respondida(s)`);
      return false;
    }
    return true;
  };

  const verificarAlertasClinicoss = () => {
    const alertas = Array.from(respostas.values()).filter(
      (r) => r.resposta === "sim" && r.observacoes.toLowerCase().includes("alergia")
    );
    return alertas.length > 0;
  };

  const salvarAnamnese = async (status: "rascunho" | "finalizada") => {
    if (!modeloSelecionado || !profissionalSelecionado) {
      toast.error("Selecione o modelo e o profissional");
      return;
    }

    if (status === "finalizada" && !validarObrigatorias()) {
      return;
    }

    setLoading(true);
    try {
      const temAlerta = verificarAlertasClinicoss();
      
      // Salvar ou atualizar anamnese
      const anamneseData = {
        paciente_id: patientId,
        modelo_id: modeloSelecionado,
        profissional_id: profissionalSelecionado,
        data,
        status,
        alerta_clinico: temAlerta,
        finalizada_em: status === "finalizada" ? new Date().toISOString() : null,
      };

      let currentAnamneseId = anamneseId;

      if (!currentAnamneseId) {
        const { data: novaAnamnese, error } = await supabase
          .from("anamneses")
          .insert(anamneseData)
          .select()
          .single();

        if (error) throw error;
        currentAnamneseId = novaAnamnese.id;
        setAnamneseId(currentAnamneseId);
      } else {
        const { error } = await supabase
          .from("anamneses")
          .update(anamneseData)
          .eq("id", currentAnamneseId);

        if (error) throw error;
      }

      // Salvar respostas
      const respostasArray = Array.from(respostas.values()).map((r) => ({
        anamnese_id: currentAnamneseId,
        pergunta_id: r.pergunta_id,
        resposta: r.resposta,
        observacoes: r.observacoes,
      }));

      // Deletar respostas antigas e inserir novas
      await supabase
        .from("anamnese_respostas")
        .delete()
        .eq("anamnese_id", currentAnamneseId);

      if (respostasArray.length > 0) {
        const { error: respostasError } = await supabase
          .from("anamnese_respostas")
          .insert(respostasArray);

        if (respostasError) throw respostasError;
      }

      toast.success(
        status === "finalizada"
          ? "Anamnese finalizada com sucesso"
          : "Rascunho salvo com sucesso"
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar anamnese:", error);
      toast.error("Erro ao salvar anamnese");
    } finally {
      setLoading(false);
    }
  };

  const perguntasVisiveis = perguntas.filter((p) => {
    if (!p.pergunta_pai_id) return true;
    
    const respostaPai = respostas.get(p.pergunta_pai_id);
    return respostaPai && respostaPai.resposta === p.condicao_resposta;
  });

  const respostasCount = Array.from(respostas.values()).filter(r => r.resposta).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {duplicateFromId ? "Duplicar Anamnese" : "Nova Anamnese"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <div className="space-y-6 pb-4">
            {/* Cabeçalho */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
              <div>
                <Label>Profissional Responsável</Label>
                <Select
                  value={profissionalSelecionado}
                  onValueChange={setProfissionalSelecionado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modelo de Anamnese *</Label>
                <Select
                  value={modeloSelecionado}
                  onValueChange={setModeloSelecionado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progresso */}
            {modeloSelecionado && perguntas.length > 0 && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">
                  Progresso: {respostasCount} de {perguntasVisiveis.length} respondidas
                </p>
              </div>
            )}

            {/* Perguntas */}
            {modeloSelecionado && perguntas.length > 0 ? (
              <div className="space-y-6">
                {perguntasVisiveis.map((pergunta, index) => (
                  <div
                    key={pergunta.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <Label className="text-base">
                      {index + 1}. {pergunta.texto}
                      {pergunta.obrigatoria && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>

                    <RadioGroup
                      value={respostas.get(pergunta.id)?.resposta || ""}
                      onValueChange={(value) =>
                        handleRespostaChange(pergunta.id, value)
                      }
                    >
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id={`${pergunta.id}-sim`} />
                          <Label htmlFor={`${pergunta.id}-sim`}>Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id={`${pergunta.id}-nao`} />
                          <Label htmlFor={`${pergunta.id}-nao`}>Não</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="na" id={`${pergunta.id}-na`} />
                          <Label htmlFor={`${pergunta.id}-na`}>
                            Não se aplica
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>

                    <Textarea
                      placeholder="Observações (opcional)"
                      value={respostas.get(pergunta.id)?.observacoes || ""}
                      onChange={(e) =>
                        handleObservacoesChange(pergunta.id, e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            ) : modeloSelecionado ? (
              <div className="text-center text-muted-foreground py-8">
                Carregando perguntas...
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Selecione um modelo de anamnese para começar
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => salvarAnamnese("rascunho")}
            disabled={loading || !modeloSelecionado}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button
            onClick={() => salvarAnamnese("finalizada")}
            disabled={loading || !modeloSelecionado}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Salvar e Finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
