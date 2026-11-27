import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Users, TrendingUp, Plus, Sparkles, Settings2, Play, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { NovaCampanhaModal } from "@/components/crm/NovaCampanhaModal";
import { ConfigurarAutomacoesModal } from "@/components/crm/ConfigurarAutomacoesModal";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";

const CRM = () => {
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalSent: 0, totalDelivered: 0, totalFailed: 0, activeAutomations: 0 });
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [showNovaCampanha, setShowNovaCampanha] = useState(false);
  const [showAutomacoes, setShowAutomacoes] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      setErroCarregar(false);

      const [campaignsRes, automationsRes, logsRes] = await Promise.all([
        supabase.from("whatsapp_campaigns").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
        supabase.from("whatsapp_automations").select("*").eq("clinic_id", clinicId),
        supabase.from("whatsapp_message_log").select("status").eq("clinic_id", clinicId),
      ]);

      const falha = campaignsRes.error || automationsRes.error || logsRes.error;
      if (falha) throw falha;

      setCampaigns(campaignsRes.data || []);
      setAutomations(automationsRes.data || []);

      const logs = logsRes.data || [];
      setMetrics({
        totalSent: logs.filter((l: any) => l.status === "sent").length,
        totalDelivered: logs.filter((l: any) => l.status === "delivered").length,
        totalFailed: logs.filter((l: any) => l.status === "failed").length,
        activeAutomations: (automationsRes.data || []).filter((a: any) => a.is_active).length,
      });
    } catch (err) {
      console.error(err);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendCampaign = async (campaignId: string) => {
    try {
      setSendingCampaignId(campaignId);
      const { data, error } = await supabase.functions.invoke("send-campaign-messages", {
        body: { campaignId },
      });
      if (error) throw error;
      toast({ title: "Campanha enviada", description: `${data.sentCount} mensagens enviadas` });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao enviar campanha", variant: "destructive" });
    } finally {
      setSendingCampaignId(null);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-primary/10 text-primary",
    sending: "bg-sinal-espera-tenue text-sinal-espera",
    completed: "bg-sinal-ok-tenue text-sinal-ok",
    cancelled: "bg-destructive/10 text-destructive",
  };

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    scheduled: "Agendada",
    sending: "Enviando...",
    completed: "Concluída",
    cancelled: "Cancelada",
  };

  const responseRate = metrics.totalSent > 0
    ? Math.round((metrics.totalDelivered / metrics.totalSent) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h1 text-foreground">CRM Odontológico</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Relacionamento automático e campanhas personalizadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard/crm/atendimento")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Atendimento WhatsApp
          </Button>
          <Button size="sm" onClick={() => setShowNovaCampanha(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

      <FaixaIndicadores
        itens={[
          { rotulo: "Mensagens enviadas", valor: metrics.totalSent, nota: "Total histórico" },
          { rotulo: "Entregues", valor: metrics.totalDelivered, nota: `${responseRate}% de entrega` },
          { rotulo: "Falhas", valor: metrics.totalFailed, nota: "Mensagens com erro", tom: metrics.totalFailed > 0 ? "alerta" : "padrao" },
          { rotulo: "Automações ativas", valor: metrics.activeAutomations, nota: "Fluxos ativos" },
        ]}
      />

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="automations">Automações</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campanhas</CardTitle>
              <CardDescription>
                Campanhas de marketing e recall via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              {erroCarregar ? (
                <EstadoErro onTentarDeNovo={loadData} />
              ) : loading ? (
                <div className="space-y-2" aria-busy="true" aria-label="Carregando">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <EstadoVazio
                  icone={MessageSquare}
                  titulo="Nenhuma campanha criada"
                  descricao="Crie uma campanha para enviar mensagens a um grupo de pacientes."
                  acao={
                    <Button variant="outline" size="sm" onClick={() => setShowNovaCampanha(true)}>
                      Nova campanha
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center gap-4 p-4 rounded-md border bg-card transition-colors duration-150 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                        <MessageSquare className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{campaign.name}</p>
                          <Badge className={statusColors[campaign.status] || "bg-muted"}>
                            {statusLabels[campaign.status] || campaign.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Enviadas: </span>
                            <span className="font-medium">{campaign.sent_count}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Respostas: </span>
                            <span className="font-medium">{campaign.response_count}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tipo: </span>
                            <span className="font-medium capitalize">{campaign.type}</span>
                          </div>
                        </div>
                      </div>
                      {(campaign.status === "draft" || campaign.status === "scheduled") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendCampaign(campaign.id)}
                          disabled={sendingCampaignId === campaign.id}
                        >
                          {sendingCampaignId === campaign.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Enviar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fluxos Automáticos</CardTitle>
                <CardDescription>
                  Mensagens disparadas automaticamente por gatilhos
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAutomacoes(true)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Configurar
              </Button>
            </CardHeader>
            <CardContent>
              {erroCarregar ? (
                <EstadoErro onTentarDeNovo={loadData} />
              ) : loading ? (
                <div className="space-y-2" aria-busy="true" aria-label="Carregando">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : automations.length === 0 ? (
                <EstadoVazio
                  icone={Sparkles}
                  titulo="Nenhuma automação configurada"
                  descricao="Configure lembretes e mensagens automáticas."
                  acao={
                    <Button variant="outline" size="sm" onClick={() => setShowAutomacoes(true)}>
                      Configurar automações
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {automations.map((automation) => (
                    <div
                      key={automation.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/10">
                        <Sparkles className="h-6 w-6 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{automation.name}</p>
                          <Badge variant={automation.is_active ? "default" : "secondary"}>
                            {automation.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Gatilho: {automation.trigger_type} • Canal: {automation.channel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovaCampanhaModal
        open={showNovaCampanha}
        onOpenChange={setShowNovaCampanha}
        onSuccess={loadData}
      />
      <ConfigurarAutomacoesModal
        open={showAutomacoes}
        onOpenChange={setShowAutomacoes}
      />
    </div>
  );
};

export default CRM;
