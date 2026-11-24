import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

interface PreferenciasTabProps {
  userId: string;
}

const PreferenciasTab = ({ userId }: PreferenciasTabProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    idioma: "pt-BR",
    formato_data: "DD/MM/YYYY",
    formato_hora: "24h",
    moeda: "BRL",
    tema: "light",
    densidade_tabela: "padrao",
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPreferences({
          idioma: data.idioma,
          formato_data: data.formato_data,
          formato_hora: data.formato_hora,
          moeda: data.moeda,
          tema: data.tema,
          densidade_tabela: data.densidade_tabela,
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar preferências:", error);
      toast.error("Erro ao carregar preferências");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: userId,
          ...preferences,
        });

      if (error) throw error;

      toast.success("Preferências atualizadas");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao atualizar preferências");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <EsqueletoSecao linhas={4} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preferências regionais</CardTitle>
          <CardDescription>Configure formatos de data, hora e moeda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select
                value={preferences.idioma}
                onValueChange={(value) => setPreferences({ ...preferences, idioma: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formato de data</Label>
              <Select
                value={preferences.formato_data}
                onValueChange={(value) => setPreferences({ ...preferences, formato_data: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formato de hora</Label>
              <Select
                value={preferences.formato_hora}
                onValueChange={(value) => setPreferences({ ...preferences, formato_hora: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas</SelectItem>
                  <SelectItem value="12h">12 horas (AM/PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select
                value={preferences.moeda}
                onValueChange={(value) => setPreferences({ ...preferences, moeda: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar (US$)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferências visuais</CardTitle>
          <CardDescription>Personalize a aparência do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tema</Label>
              <Select
                value={preferences.tema}
                onValueChange={(value) => setPreferences({ ...preferences, tema: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Densidade de tabelas</Label>
              <Select
                value={preferences.densidade_tabela}
                onValueChange={(value) => setPreferences({ ...preferences, densidade_tabela: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compacto">Compacto</SelectItem>
                  <SelectItem value="padrao">Padrão</SelectItem>
                  <SelectItem value="confortavel">Confortável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar preferências"}
        </Button>
        <Button variant="outline" onClick={loadPreferences}>
          Reverter alterações
        </Button>
      </div>
    </div>
  );
};

export default PreferenciasTab;
