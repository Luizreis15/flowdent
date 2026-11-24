import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommissionRule {
  id: string;
  nome: string;
  profissional_id: string | null;
  procedure_id: string | null;
  tipo_calculo: string;
  percentual: number | null;
  valor_fixo: number | null;
  base_calculo: string;
  gatilho: string;
  minimo_garantido: number | null;
  teto: number | null;
  ativo: boolean;
}

interface Profissional {
  id: string;
  nome: string;
}

interface Procedimento {
  id: string;
  descricao: string;
}

interface NovaRegraComissaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  rule?: CommissionRule | null;
  onSuccess: () => void;
}

export const NovaRegraComissaoModal = ({
  open,
  onOpenChange,
  clinicId,
  rule,
  onSuccess,
}: NovaRegraComissaoModalProps) => {
  const [nome, setNome] = useState("");
  const [profissionalId, setProfissionalId] = useState<string>("all");
  const [procedureId, setProcedureId] = useState<string>("all");
  const [tipoCalculo, setTipoCalculo] = useState("percentual");
  const [percentual, setPercentual] = useState("30");
  const [valorFixo, setValorFixo] = useState("");
  const [baseCalculo, setBaseCalculo] = useState("bruto");
  const [gatilho, setGatilho] = useState("recebimento");
  const [minimoGarantido, setMinimoGarantido] = useState("");
  const [teto, setTeto] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);

  useEffect(() => {
    if (open) {
      loadOptions();
      if (rule) {
        setNome(rule.nome);
        setProfissionalId(rule.profissional_id || "all");
        setProcedureId(rule.procedure_id || "all");
        setTipoCalculo(rule.tipo_calculo);
        setPercentual(rule.percentual?.toString() || "30");
        setValorFixo(rule.valor_fixo?.toString() || "");
        setBaseCalculo(rule.base_calculo);
        setGatilho(rule.gatilho);
        setMinimoGarantido(rule.minimo_garantido?.toString() || "");
        setTeto(rule.teto?.toString() || "");
        setAtivo(rule.ativo);
      } else {
        resetForm();
      }
    }
  }, [open, rule]);

  const resetForm = () => {
    setNome("");
    setProfissionalId("all");
    setProcedureId("all");
    setTipoCalculo("percentual");
    setPercentual("30");
    setValorFixo("");
    setBaseCalculo("bruto");
    setGatilho("recebimento");
    setMinimoGarantido("");
    setTeto("");
    setAtivo(true);
  };

  const loadOptions = async () => {
    // Carregar profissionais
    const { data: profData, error: profError } = await supabase
      .from("profissionais")
      .select("id, nome")
      .eq("clinica_id", clinicId)
      .eq("ativo", true);

    if (!profError && profData) {
      setProfissionais(profData.map(p => ({ id: p.id, nome: p.nome })));
    }

    // Carregar procedimentos
    try {
      const { data: procData } = await (supabase
        .from("procedimentos") as any)
        .select("id, descricao")
        .eq("clinic_id", clinicId);
      
      if (procData) {
        setProcedimentos(procData.map((p: any) => ({ id: p.id, descricao: p.descricao })));
      }
    } catch (e) {
      console.error("Erro ao carregar procedimentos:", e);
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error("Nome da regra é obrigatório");
      return;
    }

    if (tipoCalculo === "percentual" && (!percentual || parseFloat(percentual) <= 0)) {
      toast.error("Informe um percentual válido");
      return;
    }

    if (tipoCalculo === "fixo" && (!valorFixo || parseFloat(valorFixo) <= 0)) {
      toast.error("Informe um valor fixo válido");
      return;
    }

    setLoading(true);

    try {
      const data = {
        clinic_id: clinicId,
        nome: nome.trim(),
        profissional_id: profissionalId === "all" ? null : profissionalId,
        procedure_id: procedureId === "all" ? null : procedureId,
        tipo_calculo: tipoCalculo,
        percentual: tipoCalculo === "percentual" ? parseFloat(percentual) : null,
        valor_fixo: tipoCalculo === "fixo" ? parseFloat(valorFixo) : null,
        base_calculo: baseCalculo,
        gatilho: gatilho,
        minimo_garantido: minimoGarantido ? parseFloat(minimoGarantido) : null,
        teto: teto ? parseFloat(teto) : null,
        ativo: ativo,
      };

      if (rule) {
        const { error } = await supabase
          .from("commission_rules")
          .update(data)
          .eq("id", rule.id);

        if (error) throw error;
        toast.success("Regra atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("commission_rules")
          .insert(data);

        if (error) throw error;
        toast.success("Regra criada com sucesso");
      }

      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
      toast.error("Erro ao salvar regra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Regra" : "Nova Regra de Comissão"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da regra *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Comissão padrão dentistas"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={profissionalId} onValueChange={setProfissionalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Procedimento</Label>
              <Select value={procedureId} onValueChange={setProcedureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os procedimentos</SelectItem>
                  {procedimentos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de cálculo</Label>
              <Select value={tipoCalculo} onValueChange={setTipoCalculo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual</SelectItem>
                  <SelectItem value="fixo">Valor fixo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoCalculo === "percentual" ? (
              <div className="space-y-2">
                <Label>Percentual (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={percentual}
                  onChange={(e) => setPercentual(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Valor fixo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorFixo}
                  onChange={(e) => setValorFixo(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base de cálculo</Label>
              <Select value={baseCalculo} onValueChange={setBaseCalculo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bruto">Valor bruto</SelectItem>
                  <SelectItem value="liquido">Valor líquido (após taxas)</SelectItem>
                  <SelectItem value="recebido">Valor recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gatilho</Label>
              <Select value={gatilho} onValueChange={setGatilho}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovacao">Aprovação do orçamento</SelectItem>
                  <SelectItem value="conclusao">Conclusão do procedimento</SelectItem>
                  <SelectItem value="recebimento">Recebimento do pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mínimo garantido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={minimoGarantido}
                onChange={(e) => setMinimoGarantido(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <Label>Teto máximo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={teto}
                onChange={(e) => setTeto(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="ativo">Regra ativa</Label>
            <Switch
              id="ativo"
              checked={ativo}
              onCheckedChange={setAtivo}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : rule ? "Salvar Alterações" : "Criar Regra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
