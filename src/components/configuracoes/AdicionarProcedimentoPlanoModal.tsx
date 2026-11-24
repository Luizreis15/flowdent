import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Plus, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Procedimento {
  id: string;
  codigo_sistema: string;
  descricao: string;
  especialidade: string;
  valor: number;
}

interface AdicionarProcedimentoPlanoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoId: string;
  existingProcedimentoIds: string[];
  onSuccess: () => void;
}

const ESPECIALIDADES = [
  "Cirurgia",
  "Dentística",
  "Endodontia",
  "Estética",
  "Implantodontia",
  "Odontopediatria",
  "Ortodontia",
  "Periodontia",
  "Prótese",
  "Radiologia",
  "Outros"
];

export default function AdicionarProcedimentoPlanoModal({
  open,
  onOpenChange,
  planoId,
  existingProcedimentoIds,
  onSuccess
}: AdicionarProcedimentoPlanoModalProps) {
  const [tab, setTab] = useState("existente");
  const [searchTerm, setSearchTerm] = useState("");
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [selectedProcedimento, setSelectedProcedimento] = useState<Procedimento | null>(null);
  const [valorCustomizado, setValorCustomizado] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Campos para novo procedimento
  const [novoCodigo, setNovoCodigo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [novoValor, setNovoValor] = useState("");

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setProcedimentos([]);
      setSelectedProcedimento(null);
      setValorCustomizado("");
      setNovoCodigo("");
      setNovaDescricao("");
      setNovaEspecialidade("");
      setNovoValor("");
      setTab("existente");
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchProcedimentos();
      } else {
        setProcedimentos([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchProcedimentos = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("procedimentos")
        .select("*")
        .or(`descricao.ilike.%${searchTerm}%,codigo_sistema.ilike.%${searchTerm}%`)
        .limit(50);

      if (error) throw error;

      // Filtrar procedimentos já adicionados
      const filtered = (data || []).filter(p => !existingProcedimentoIds.includes(p.id));
      setProcedimentos(filtered);
    } catch (error) {
      console.error("Erro ao buscar procedimentos:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProcedimento = (proc: Procedimento) => {
    setSelectedProcedimento(proc);
    setValorCustomizado(proc.valor.toString());
  };

  const handleAddExistente = async () => {
    if (!selectedProcedimento) {
      toast.error("Selecione um procedimento");
      return;
    }

    const valor = parseFloat(valorCustomizado);
    if (isNaN(valor) || valor < 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("planos_procedimentos_itens")
        .insert({
          plano_id: planoId,
          procedimento_id: selectedProcedimento.id,
          valor_customizado: valor
        });

      if (error) throw error;

      toast.success("Procedimento adicionado ao plano");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao adicionar procedimento:", error);
      toast.error("Erro ao adicionar procedimento");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNovo = async () => {
    if (!novoCodigo.trim() || !novaDescricao.trim() || !novaEspecialidade || !novoValor) {
      toast.error("Preencha todos os campos");
      return;
    }

    const valor = parseFloat(novoValor);
    if (isNaN(valor) || valor < 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setLoading(true);
    try {
      // Verificar se código já existe
      const { data: existing } = await supabase
        .from("procedimentos")
        .select("id")
        .eq("codigo_sistema", novoCodigo.trim())
        .maybeSingle();

      if (existing) {
        toast.error("Código de procedimento já existe");
        setLoading(false);
        return;
      }

      // Criar procedimento na tabela base
      const { data: novoProcedimento, error: createError } = await supabase
        .from("procedimentos")
        .insert({
          codigo_sistema: novoCodigo.trim(),
          descricao: novaDescricao.trim(),
          especialidade: novaEspecialidade,
          valor: valor
        })
        .select()
        .single();

      if (createError) throw createError;

      // Adicionar ao plano
      const { error: linkError } = await supabase
        .from("planos_procedimentos_itens")
        .insert({
          plano_id: planoId,
          procedimento_id: novoProcedimento.id,
          valor_customizado: valor
        });

      if (linkError) throw linkError;

      toast.success("Procedimento criado e adicionado ao plano");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar procedimento:", error);
      toast.error("Erro ao criar procedimento");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Procedimento ao Plano</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existente">Da Tabela Base</TabsTrigger>
            <TabsTrigger value="novo">Criar Novo</TabsTrigger>
          </TabsList>

          <TabsContent value="existente" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-48 rounded-md border">
              {searching ? (
                <div className="p-4 text-center text-muted-foreground">Buscando...</div>
              ) : procedimentos.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchTerm.length < 2 
                    ? "Digite pelo menos 2 caracteres para buscar" 
                    : "Nenhum procedimento encontrado"}
                </div>
              ) : (
                <div className="p-1">
                  {procedimentos.map(proc => (
                    <button
                      key={proc.id}
                      onClick={() => handleSelectProcedimento(proc)}
                      className={`w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2 ${
                        selectedProcedimento?.id === proc.id ? 'bg-muted' : ''
                      }`}
                    >
                      {selectedProcedimento?.id === proc.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{proc.codigo_sistema}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{proc.especialidade}</span>
                        </div>
                        <p className="text-sm truncate">{proc.descricao}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(proc.valor)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedProcedimento && (
              <div className="space-y-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">{selectedProcedimento.descricao}</p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Valor Base</Label>
                    <p className="text-sm">{formatCurrency(selectedProcedimento.valor)}</p>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="valorPlano" className="text-xs">Valor no Plano (R$)</Label>
                    <Input
                      id="valorPlano"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorCustomizado}
                      onChange={(e) => setValorCustomizado(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleAddExistente} disabled={loading || !selectedProcedimento}>
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="novo" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value)}
                  placeholder="Ex: PROC001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade</Label>
                <Select value={novaEspecialidade} onValueChange={setNovaEspecialidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES.map(esp => (
                      <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Ex: Restauração em Resina Composta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorNovo">Valor (R$)</Label>
              <Input
                id="valorNovo"
                type="number"
                step="0.01"
                min="0"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleAddNovo} disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                {loading ? "Criando..." : "Criar e Adicionar"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
