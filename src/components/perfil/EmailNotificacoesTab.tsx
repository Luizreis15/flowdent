import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

interface EmailNotificacoesTabProps {
  userId: string;
}

const EmailNotificacoesTab = ({ userId }: EmailNotificacoesTabProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    financeiro_faturas: true,
    financeiro_falha_pagamento: true,
    financeiro_repasses: true,
    agenda_novas_marcacoes: true,
    agenda_alteracoes: true,
    agenda_lembretes: true,
    pacientes_novos_documentos: true,
    pacientes_consentimentos: true,
    operacao_estoque_baixo: true,
    operacao_protese_pronta: true,
    operacao_integracoes_erro: true,
    canal_email: true,
    canal_whatsapp: false,
    canal_in_app: true,
  });

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_notifications_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          financeiro_faturas: data.financeiro_faturas,
          financeiro_falha_pagamento: data.financeiro_falha_pagamento,
          financeiro_repasses: data.financeiro_repasses,
          agenda_novas_marcacoes: data.agenda_novas_marcacoes,
          agenda_alteracoes: data.agenda_alteracoes,
          agenda_lembretes: data.agenda_lembretes,
          pacientes_novos_documentos: data.pacientes_novos_documentos,
          pacientes_consentimentos: data.pacientes_consentimentos,
          operacao_estoque_baixo: data.operacao_estoque_baixo,
          operacao_protese_pronta: data.operacao_protese_pronta,
          operacao_integracoes_erro: data.operacao_integracoes_erro,
          canal_email: data.canal_email,
          canal_whatsapp: data.canal_whatsapp,
          canal_in_app: data.canal_in_app,
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações de notificação");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("user_notifications_settings")
        .upsert({
          user_id: userId,
          ...settings,
        });

      if (error) throw error;

      toast.success("Preferências de notificação atualizadas");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao atualizar preferências");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <EsqueletoSecao linhas={5} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notificações financeiras</CardTitle>
          <CardDescription>Configurações relacionadas a pagamentos e repasses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="financeiro_faturas" className="cursor-pointer">
              Faturas e cobranças
            </Label>
            <Switch
              id="financeiro_faturas"
              checked={settings.financeiro_faturas}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, financeiro_faturas: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="financeiro_falha_pagamento" className="cursor-pointer">
              Falhas de pagamento
            </Label>
            <Switch
              id="financeiro_falha_pagamento"
              checked={settings.financeiro_falha_pagamento}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, financeiro_falha_pagamento: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="financeiro_repasses" className="cursor-pointer">
              Repasses aprovados
            </Label>
            <Switch
              id="financeiro_repasses"
              checked={settings.financeiro_repasses}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, financeiro_repasses: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações da agenda</CardTitle>
          <CardDescription>Atualizações sobre agendamentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="agenda_novas_marcacoes" className="cursor-pointer">
              Novas marcações
            </Label>
            <Switch
              id="agenda_novas_marcacoes"
              checked={settings.agenda_novas_marcacoes}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, agenda_novas_marcacoes: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="agenda_alteracoes" className="cursor-pointer">
              Alterações e cancelamentos
            </Label>
            <Switch
              id="agenda_alteracoes"
              checked={settings.agenda_alteracoes}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, agenda_alteracoes: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="agenda_lembretes" className="cursor-pointer">
              Lembretes de consultas
            </Label>
            <Switch
              id="agenda_lembretes"
              checked={settings.agenda_lembretes}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, agenda_lembretes: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações de pacientes</CardTitle>
          <CardDescription>Atualizações sobre documentos e consentimentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="pacientes_novos_documentos" className="cursor-pointer">
              Novos documentos
            </Label>
            <Switch
              id="pacientes_novos_documentos"
              checked={settings.pacientes_novos_documentos}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, pacientes_novos_documentos: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pacientes_consentimentos" className="cursor-pointer">
              Consentimentos pendentes
            </Label>
            <Switch
              id="pacientes_consentimentos"
              checked={settings.pacientes_consentimentos}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, pacientes_consentimentos: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações operacionais</CardTitle>
          <CardDescription>Alertas sobre estoque, próteses e integrações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="operacao_estoque_baixo" className="cursor-pointer">
              Estoque baixo
            </Label>
            <Switch
              id="operacao_estoque_baixo"
              checked={settings.operacao_estoque_baixo}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, operacao_estoque_baixo: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="operacao_protese_pronta" className="cursor-pointer">
              Prótese pronta
            </Label>
            <Switch
              id="operacao_protese_pronta"
              checked={settings.operacao_protese_pronta}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, operacao_protese_pronta: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="operacao_integracoes_erro" className="cursor-pointer">
              Erros em integrações
            </Label>
            <Switch
              id="operacao_integracoes_erro"
              checked={settings.operacao_integracoes_erro}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, operacao_integracoes_erro: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canais de notificação</CardTitle>
          <CardDescription>Escolha como deseja receber notificações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="canal_email" className="cursor-pointer">
              E-mail
            </Label>
            <Switch
              id="canal_email"
              checked={settings.canal_email}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, canal_email: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="canal_whatsapp" className="cursor-pointer">
              WhatsApp
            </Label>
            <Switch
              id="canal_whatsapp"
              checked={settings.canal_whatsapp}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, canal_whatsapp: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="canal_in_app" className="cursor-pointer">
              Notificação no sistema
            </Label>
            <Switch
              id="canal_in_app"
              checked={settings.canal_in_app}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, canal_in_app: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar preferências"}
        </Button>
        <Button variant="outline" onClick={loadSettings}>
          Reverter alterações
        </Button>
      </div>
    </div>
  );
};

export default EmailNotificacoesTab;
