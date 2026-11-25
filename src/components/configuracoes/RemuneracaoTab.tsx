import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

interface RemuneracaoTabProps {
  profissionalId: string;
}

export const RemuneracaoTab = ({ profissionalId }: RemuneracaoTabProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [remuneracao, setRemuneracao] = useState<any>(null);
  const [regras, setRegras] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    tipo_remuneracao: "repasse_producao",
    valor_fixo_mensal: "",
    dia_pagamento_fixo: "",
    modelo_repasse: "percentual_unico",
    percentual_unico: "",
    base_calculo_padrao: "valor_liquido",
    minimo_garantido_mensal: "",
    teto_repasse_mensal: "",
    adiantamento_permitido: false,
    limite_adiantamento: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente",
    chave_pix: "",
    responsavel_tributario: "clinica",
    reter_inss: false,
    percentual_inss: "",
    reter_iss: false,
    percentual_iss: "",
    reter_irrf: false,
    percentual_irrf: "",
    gerar_rpa: true,
  });

  useEffect(() => {
    loadRemuneracao();
  }, [profissionalId]);

  const loadRemuneracao = async () => {
    try {
      setLoading(true);
      
      const { data: remData, error: remError } = await supabase
        .from("profissional_remuneracao")
        .select("*")
        .eq("profissional_id", profissionalId)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (remError) throw remError;

      if (remData) {
        setRemuneracao(remData);
        setFormData({
          tipo_remuneracao: remData.tipo_remuneracao,
          valor_fixo_mensal: remData.valor_fixo_mensal?.toString() || "",
          dia_pagamento_fixo: remData.dia_pagamento_fixo?.toString() || "",
          modelo_repasse: remData.modelo_repasse || "percentual_unico",
          percentual_unico: remData.percentual_unico?.toString() || "",
          base_calculo_padrao: remData.base_calculo_padrao || "valor_liquido",
          minimo_garantido_mensal: remData.minimo_garantido_mensal?.toString() || "",
          teto_repasse_mensal: remData.teto_repasse_mensal?.toString() || "",
          adiantamento_permitido: remData.adiantamento_permitido || false,
          limite_adiantamento: remData.limite_adiantamento?.toString() || "",
          banco: remData.banco || "",
          agencia: remData.agencia || "",
          conta: remData.conta || "",
          tipo_conta: remData.tipo_conta || "corrente",
          chave_pix: remData.chave_pix || "",
          responsavel_tributario: remData.responsavel_tributario || "clinica",
          reter_inss: remData.reter_inss || false,
          percentual_inss: remData.percentual_inss?.toString() || "",
          reter_iss: remData.reter_iss || false,
          percentual_iss: remData.percentual_iss?.toString() || "",
          reter_irrf: remData.reter_irrf || false,
          percentual_irrf: remData.percentual_irrf?.toString() || "",
          gerar_rpa: remData.gerar_rpa ?? true,
        });

        // Carregar regras
        const { data: regrasData, error: regrasError } = await supabase
          .from("repasse_regras")
          .select("*")
          .eq("remuneracao_id", remData.id)
          .eq("ativo", true)
          .order("prioridade", { ascending: false });

        if (regrasError) throw regrasError;
        setRegras(regrasData || []);
      }
    } catch (error: any) {
      console.error("Erro ao carregar remuneração:", error);
      toast.error("Erro ao carregar dados de remuneração");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const dataToSave = {
        profissional_id: profissionalId,
        tipo_remuneracao: formData.tipo_remuneracao as any,
        valor_fixo_mensal: formData.valor_fixo_mensal ? parseFloat(formData.valor_fixo_mensal) : null,
        dia_pagamento_fixo: formData.dia_pagamento_fixo ? parseInt(formData.dia_pagamento_fixo) : null,
        modelo_repasse: formData.modelo_repasse as any,
        percentual_unico: formData.percentual_unico ? parseFloat(formData.percentual_unico) : null,
        base_calculo_padrao: formData.base_calculo_padrao as any,
        minimo_garantido_mensal: formData.minimo_garantido_mensal ? parseFloat(formData.minimo_garantido_mensal) : null,
        teto_repasse_mensal: formData.teto_repasse_mensal ? parseFloat(formData.teto_repasse_mensal) : null,
        adiantamento_permitido: formData.adiantamento_permitido,
        limite_adiantamento: formData.limite_adiantamento ? parseFloat(formData.limite_adiantamento) : null,
        banco: formData.banco,
        agencia: formData.agencia,
        conta: formData.conta,
        tipo_conta: formData.tipo_conta,
        chave_pix: formData.chave_pix,
        responsavel_tributario: formData.responsavel_tributario as any,
        reter_inss: formData.reter_inss,
        percentual_inss: formData.percentual_inss ? parseFloat(formData.percentual_inss) : null,
        reter_iss: formData.reter_iss,
        percentual_iss: formData.percentual_iss ? parseFloat(formData.percentual_iss) : null,
        reter_irrf: formData.reter_irrf,
        percentual_irrf: formData.percentual_irrf ? parseFloat(formData.percentual_irrf) : null,
        gerar_rpa: formData.gerar_rpa,
        ativo: true,
      };

      if (remuneracao) {
        const { error } = await supabase
          .from("profissional_remuneracao")
          .update(dataToSave)
          .eq("id", remuneracao.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profissional_remuneracao")
          .insert(dataToSave);

        if (error) throw error;
      }

      toast.success("Remuneração salva com sucesso");
      loadRemuneracao();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar remuneração: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <EsqueletoSecao />;
  }

  const showFixo = formData.tipo_remuneracao === "fixo_mensal" || formData.tipo_remuneracao === "hibrido";
  const showRepasse = formData.tipo_remuneracao === "repasse_producao" || formData.tipo_remuneracao === "hibrido";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de remuneração *</Label>
          <Select
            value={formData.tipo_remuneracao}
            onValueChange={(value) => setFormData({ ...formData, tipo_remuneracao: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixo_mensal">Valor fixo mensal</SelectItem>
              <SelectItem value="repasse_producao">Repasse por produção</SelectItem>
              <SelectItem value="hibrido">Híbrido (fixo + repasse)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showFixo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Remuneração fixa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor fixo mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_fixo_mensal}
                    onChange={(e) => setFormData({ ...formData, valor_fixo_mensal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia de pagamento (1-31)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_pagamento_fixo}
                    onChange={(e) => setFormData({ ...formData, dia_pagamento_fixo: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showRepasse && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Repasse por produção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo de repasse</Label>
                  <Select
                    value={formData.modelo_repasse}
                    onValueChange={(value) => setFormData({ ...formData, modelo_repasse: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual_unico">Percentual único</SelectItem>
                      <SelectItem value="por_procedimento">Por procedimento</SelectItem>
                      <SelectItem value="por_convenio">Por convênio</SelectItem>
                      <SelectItem value="por_origem">Por origem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Base de cálculo padrão</Label>
                  <Select
                    value={formData.base_calculo_padrao}
                    onValueChange={(value) => setFormData({ ...formData, base_calculo_padrao: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valor_bruto">Valor bruto</SelectItem>
                      <SelectItem value="valor_liquido">Valor líquido (após taxas)</SelectItem>
                      <SelectItem value="valor_recebido">Valor recebido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.modelo_repasse === "percentual_unico" && (
                <div className="space-y-2">
                  <Label>Percentual único (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.percentual_unico}
                    onChange={(e) => setFormData({ ...formData, percentual_unico: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mínimo garantido mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.minimo_garantido_mensal}
                    onChange={(e) => setFormData({ ...formData, minimo_garantido_mensal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teto de repasse mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.teto_repasse_mensal}
                    onChange={(e) => setFormData({ ...formData, teto_repasse_mensal: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="adiantamento"
                    checked={formData.adiantamento_permitido}
                    onCheckedChange={(checked) => setFormData({ ...formData, adiantamento_permitido: checked as boolean })}
                  />
                  <Label htmlFor="adiantamento" className="cursor-pointer">
                    Permitir adiantamento
                  </Label>
                </div>

                {formData.adiantamento_permitido && (
                  <div className="space-y-2 pl-6">
                    <Label>Limite de adiantamento (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.limite_adiantamento}
                      onChange={(e) => setFormData({ ...formData, limite_adiantamento: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados bancários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input
                  value={formData.agencia}
                  onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <Input
                  value={formData.conta}
                  onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de conta</Label>
                <Select
                  value={formData.tipo_conta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_conta: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input
                  value={formData.chave_pix}
                  onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados fiscais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Responsável tributário</Label>
              <Select
                value={formData.responsavel_tributario}
                onValueChange={(value) => setFormData({ ...formData, responsavel_tributario: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="clinica">Clínica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reter_inss"
                    checked={formData.reter_inss}
                    onCheckedChange={(checked) => setFormData({ ...formData, reter_inss: checked as boolean })}
                  />
                  <Label htmlFor="reter_inss" className="cursor-pointer">Reter INSS</Label>
                </div>
                {formData.reter_inss && (
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="%"
                      value={formData.percentual_inss}
                      onChange={(e) => setFormData({ ...formData, percentual_inss: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reter_iss"
                    checked={formData.reter_iss}
                    onCheckedChange={(checked) => setFormData({ ...formData, reter_iss: checked as boolean })}
                  />
                  <Label htmlFor="reter_iss" className="cursor-pointer">Reter ISS</Label>
                </div>
                {formData.reter_iss && (
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="%"
                      value={formData.percentual_iss}
                      onChange={(e) => setFormData({ ...formData, percentual_iss: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reter_irrf"
                    checked={formData.reter_irrf}
                    onCheckedChange={(checked) => setFormData({ ...formData, reter_irrf: checked as boolean })}
                  />
                  <Label htmlFor="reter_irrf" className="cursor-pointer">Reter IRRF</Label>
                </div>
                {formData.reter_irrf && (
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="%"
                      value={formData.percentual_irrf}
                      onChange={(e) => setFormData({ ...formData, percentual_irrf: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gerar_rpa"
                  checked={formData.gerar_rpa}
                  onCheckedChange={(checked) => setFormData({ ...formData, gerar_rpa: checked as boolean })}
                />
                <Label htmlFor="gerar_rpa" className="cursor-pointer">Gerar RPA/recibo automaticamente</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Remuneração"}
        </Button>
      </div>
    </div>
  );
};