import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import { examesRadiograficos, categoriasExame, ExameRadiografico } from "@/data/examesRadiograficos";

interface NovoSolicitacaoExameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

interface ExameSelecionado {
  id: string;
  exame: ExameRadiografico;
  regiao: string;
}

export const NovoSolicitacaoExameModal = ({
  open,
  onOpenChange,
  patientId,
}: NovoSolicitacaoExameModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [selectedProfissional, setSelectedProfissional] = useState<string>("");
  const [professionalData, setProfessionalData] = useState<any>(null);
  const [clinicData, setClinicData] = useState<any>(null);

  const [examesSelecionados, setExamesSelecionados] = useState<ExameSelecionado[]>([]);
  const [searchOpen, setSearchOpen] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [urgencia, setUrgencia] = useState<"rotina" | "urgente">("rotina");
  const [justificativa, setJustificativa] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSearchOpen(null);
      }
    };
    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  useEffect(() => {
    if (open && patientId) {
      loadData();
      setExamesSelecionados([]);
      setUrgencia("rotina");
      setJustificativa("");
      setObservacoes("");
      setSearchTerm("");
      setCategoriaFiltro(null);
    }
  }, [open, patientId]);

  const loadData = async () => {
    try {
      const { data: patient } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      setPatientData(patient);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", user.id)
          .single();

        if (usuario) {
          const { data: clinica } = await supabase
            .from("clinicas")
            .select("*")
            .eq("id", usuario.clinica_id)
            .single();

          setClinicData(clinica);

          const { data: profissionaisList } = await supabase
            .from("profissionais")
            .select("*")
            .eq("clinica_id", usuario.clinica_id)
            .eq("ativo", true)
            .order("nome");

          setProfissionais(profissionaisList || []);

          const currentProfissional = profissionaisList?.find(p => p.email === usuario.email);
          if (currentProfissional) {
            setSelectedProfissional(currentProfissional.id);
            setProfessionalData({
              nome: currentProfissional.nome,
              cro: currentProfissional.cro || "Não cadastrado",
              especialidade: currentProfissional.especialidade || "Odontologia",
            });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados necessários",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedProfissional) {
      const profissional = profissionais.find(p => p.id === selectedProfissional);
      if (profissional) {
        setProfessionalData({
          nome: profissional.nome,
          cro: profissional.cro || "Não cadastrado",
          especialidade: profissional.especialidade || "Odontologia",
        });
      }
    }
  }, [selectedProfissional, profissionais]);

  const adicionarExame = () => {
    setExamesSelecionados([
      ...examesSelecionados,
      {
        id: Date.now().toString(),
        exame: examesRadiograficos[0],
        regiao: "",
      },
    ]);
  };

  const removerExame = (id: string) => {
    setExamesSelecionados(examesSelecionados.filter(e => e.id !== id));
  };

  const atualizarExame = (id: string, exame: ExameRadiografico) => {
    setExamesSelecionados(
      examesSelecionados.map(e => (e.id === id ? { ...e, exame } : e))
    );
    setSearchOpen(null);
  };

  const atualizarRegiao = (id: string, regiao: string) => {
    setExamesSelecionados(
      examesSelecionados.map(e => (e.id === id ? { ...e, regiao } : e))
    );
  };

  const gerarConteudoSolicitacaoExame = () => {
    if (!patientData || !professionalData || !clinicData) return "";

    const hoje = format(new Date(), "dd/MM/yyyy");

    let conteudo = `SOLICITAÇÃO DE EXAME RADIOGRÁFICO\n\n`;
    conteudo += `${clinicData.nome}\n`;
    conteudo += `\n${"=".repeat(60)}\n\n`;

    conteudo += `Paciente: ${patientData.full_name}\n`;
    if (patientData.cpf) {
      conteudo += `CPF: ${patientData.cpf}\n`;
    }
    if (patientData.birth_date) {
      conteudo += `Data de Nascimento: ${format(new Date(patientData.birth_date), "dd/MM/yyyy")}\n`;
    }
    conteudo += `\n`;

    conteudo += `Solicito a realização do(s) seguinte(s) exame(s):\n\n`;
    examesSelecionados.forEach((item, index) => {
      conteudo += `${index + 1}. ${item.exame.nome}`;
      if (item.regiao) {
        conteudo += ` — Região: ${item.regiao}`;
      }
      conteudo += `\n`;
    });
    conteudo += `\n`;

    conteudo += `Hipótese diagnóstica / Justificativa clínica:\n${justificativa}\n\n`;
    conteudo += `Urgência: ${urgencia === "urgente" ? "Urgente" : "Rotina"}\n\n`;

    if (observacoes) {
      conteudo += `Observações: ${observacoes}\n\n`;
    }

    conteudo += `\n`;
    conteudo += `${clinicData.address?.cidade || "São Paulo"}, ${hoje}\n`;

    return conteudo;
  };

  const handleSalvar = async () => {
    if (!patientData || !professionalData || !selectedProfissional) {
      toast({
        title: "Erro",
        description: "Dados do paciente ou profissional não encontrados",
        variant: "destructive",
      });
      return;
    }

    if (examesSelecionados.length === 0) {
      toast({
        title: "Atenção",
        description: "Adicione pelo menos um exame",
        variant: "destructive",
      });
      return;
    }

    if (!justificativa.trim()) {
      toast({
        title: "Atenção",
        description: "Informe a justificativa clínica",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const content = gerarConteudoSolicitacaoExame();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("patient_documents").insert({
        patient_id: patientId,
        clinic_id: patientData.clinic_id,
        document_type: "solicitacao_exame",
        title: `Solicitação de Exame - ${format(new Date(), "dd/MM/yyyy")}`,
        content: content,
        created_by: user?.id,
        professional_id: selectedProfissional,
        status: "finalizado",
        signed_at: new Date().toISOString(),
        metadata: {
          exames: examesSelecionados.map(e => ({
            nome: e.exame.nome,
            categoria: e.exame.categoria,
            regiao: e.regiao || null,
          })),
          urgencia,
          justificativa,
          observacoes: observacoes || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação de exame criada com sucesso",
      });

      onOpenChange(false);
      setExamesSelecionados([]);
      setUrgencia("rotina");
      setJustificativa("");
      setObservacoes("");
    } catch (error) {
      console.error("Erro ao salvar solicitação de exame:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar solicitação de exame",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const examesFiltrados = examesRadiograficos.filter(exame => {
    const matchesSearch = exame.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = !categoriaFiltro || exame.categoria === categoriaFiltro;
    return matchesSearch && matchesCategoria;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Solicitação de Exame Radiográfico</DialogTitle>
          <DialogDescription>
            Selecione os exames solicitados e informe a justificativa clínica
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 px-1">
          {/* Professional Selection */}
          <div className="space-y-2">
            <Label htmlFor="profissional">Profissional*</Label>
            <Select value={selectedProfissional} onValueChange={setSelectedProfissional}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.nome} - CRO: {prof.cro || "Não cadastrado"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Exames */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Exames Solicitados*</Label>
              <Button variant="outline" size="sm" onClick={adicionarExame}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Exame
              </Button>
            </div>

            {examesSelecionados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Clique para adicionar exames</p>
              </div>
            ) : (
              <div className="space-y-4">
                {examesSelecionados.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <Label>Exame {index + 1}</Label>
                          <div className="relative" ref={searchOpen === item.id ? dropdownRef : undefined}>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => {
                                setSearchOpen(searchOpen === item.id ? null : item.id);
                                setSearchTerm("");
                                setCategoriaFiltro(null);
                              }}
                            >
                              <span className="truncate">{item.exame.nome}</span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>

                            {searchOpen === item.id && (
                              <div className="absolute z-[9999] w-full min-w-[400px] bg-popover text-popover-foreground border rounded-md shadow-lg mt-1 left-0">
                                <div className="p-2 border-b">
                                  <Input
                                    placeholder="Buscar exame..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                <div className="flex gap-2 p-2 border-b flex-wrap">
                                  <Badge
                                    variant={categoriaFiltro === null ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => setCategoriaFiltro(null)}
                                  >
                                    Todos
                                  </Badge>
                                  {categoriasExame.map((cat) => (
                                    <Badge
                                      key={cat}
                                      variant={categoriaFiltro === cat ? "default" : "outline"}
                                      className="cursor-pointer"
                                      onClick={() => setCategoriaFiltro(cat)}
                                    >
                                      {cat}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="max-h-[250px] overflow-y-auto">
                                  {examesFiltrados.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum exame encontrado.</p>
                                  ) : (
                                    examesFiltrados.map((exame) => (
                                      <div
                                        key={exame.nome}
                                        className="cursor-pointer px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => atualizarExame(item.id, exame)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{exame.nome}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {exame.categoria}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Região/Dente (opcional)</Label>
                          <Input
                            value={item.regiao}
                            onChange={(e) => atualizarRegiao(item.id, e.target.value)}
                            placeholder="Ex: Dente 26, Arcada superior, ATM bilateral"
                          />
                        </div>
                      </div>

                      <Button variant="ghost" size="icon" onClick={() => removerExame(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Urgência */}
          <div className="space-y-2">
            <Label htmlFor="urgencia">Urgência</Label>
            <Select value={urgencia} onValueChange={(v) => setUrgencia(v as "rotina" | "urgente")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rotina">Rotina</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa">Hipótese Diagnóstica / Justificativa Clínica*</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: Avaliação de terceiros molares inclusos"
              className="min-h-[80px]"
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais para o laboratório de imagem"
              className="min-h-[60px]"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Solicitação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
