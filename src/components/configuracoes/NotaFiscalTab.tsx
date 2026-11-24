import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

interface NotaFiscalTabProps {
  clinicaId: string;
}

export function NotaFiscalTab({ clinicaId }: NotaFiscalTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    loadConfig();
  }, [clinicaId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("configuracoes_nf")
        .select("*")
        .eq("clinica_id", clinicaId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setConfig(data || {
        clinica_id: clinicaId,
        regime_tributario: "",
        serie_nf: "",
        csc: "",
        inscricao_municipal: "",
        inscricao_estadual: ""
      });
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("configuracoes_nf")
        .upsert({
          ...config,
          clinica_id: clinicaId
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações de NF salvas com sucesso"
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <EsqueletoSecao />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados fiscais</CardTitle>
          <CardDescription>
            Configurações para emissão de notas fiscais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regime">Regime tributário</Label>
              <Input
                id="regime"
                value={config?.regime_tributario || ""}
                onChange={(e) => setConfig({ ...config, regime_tributario: e.target.value })}
                placeholder="Ex: Simples Nacional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serie">Série da NF</Label>
              <Input
                id="serie"
                value={config?.serie_nf || ""}
                onChange={(e) => setConfig({ ...config, serie_nf: e.target.value })}
                placeholder="Ex: 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inscricao_municipal">Inscrição municipal</Label>
              <Input
                id="inscricao_municipal"
                value={config?.inscricao_municipal || ""}
                onChange={(e) => setConfig({ ...config, inscricao_municipal: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição estadual</Label>
              <Input
                id="inscricao_estadual"
                value={config?.inscricao_estadual || ""}
                onChange={(e) => setConfig({ ...config, inscricao_estadual: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csc">CSC (Código de Segurança do Contribuinte)</Label>
            <Input
              id="csc"
              type="password"
              value={config?.csc || ""}
              onChange={(e) => setConfig({ ...config, csc: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}