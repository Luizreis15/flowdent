import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users, Kanban, Zap, Settings } from "lucide-react";
import { ConfigurarWhatsAppModal } from "@/components/crm/ConfigurarWhatsAppModal";
import { CRMContatos } from "@/components/crm/CRMContatos";
import { CRMChat } from "@/components/crm/CRMChat";
import { CRMKanban } from "@/components/crm/CRMKanban";
import { RespostasRapidas } from "@/components/crm/RespostasRapidas";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoErro } from "@/components/sistema/EstadoErro";

export default function CRMAtendimento() {
  // Clínica ativa (respeita a impersonação); antes vinha do perfil de quem está logado
  const { clinicId } = useAuth();
  const [erroCarregar, setErroCarregar] = useState(false);
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    if (clinicId) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const init = async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      setErroCarregar(false);
      const { data, error } = await supabase
        .from("whatsapp_configs" as any)
        .select("is_active")
        .eq("clinica_id", clinicId)
        .maybeSingle();
      if (error) throw error;
      setWhatsappConfigured((data as any)?.is_active || false);
    } catch (error) {
      console.error("Erro ao inicializar CRM:", error);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  if (erroCarregar) {
    return (
      <div className="rounded-lg border bg-card">
        <EstadoErro titulo="Não foi possível abrir o atendimento" onTentarDeNovo={init} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[420px] rounded-lg" />
      </div>
    );
  }

  if (!whatsappConfigured) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12 text-center max-w-lg mx-auto">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Configure o WhatsApp</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Para usar o CRM de atendimento, conecte seu WhatsApp via QR Code ou API Oficial.
          </p>
          <div className="flex flex-col gap-3 max-w-sm mx-auto mb-6">
            <div className="p-3 border rounded-lg text-left">
              <p className="font-semibold text-sm">WhatsApp Web (gratuito)</p>
              <p className="text-xs text-muted-foreground">Conecte escaneando QR Code</p>
            </div>
            <div className="p-3 border rounded-lg text-left">
              <p className="font-semibold text-sm">API oficial da Meta</p>
              <p className="text-xs text-muted-foreground">Credenciais Meta/Facebook (pago)</p>
            </div>
          </div>
          <Button onClick={() => setConfigModalOpen(true)} size="lg">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Agora
          </Button>
        </Card>

        <ConfigurarWhatsAppModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          onSuccess={() => init()}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM - Atendimento</h1>
        <Button variant="outline" size="sm" onClick={() => setConfigModalOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="contatos" className="gap-2">
            <Users className="w-4 h-4" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2">
            <Kanban className="w-4 h-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="respostas" className="gap-2">
            <Zap className="w-4 h-4" />
            Respostas Rápidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          {clinicId && <CRMChat clinicId={clinicId} />}
        </TabsContent>

        <TabsContent value="contatos">
          {clinicId && <CRMContatos clinicId={clinicId} />}
        </TabsContent>

        <TabsContent value="kanban">
          {clinicId && <CRMKanban clinicId={clinicId} />}
        </TabsContent>

        <TabsContent value="respostas">
          {clinicId && <RespostasRapidas clinicId={clinicId} />}
        </TabsContent>
      </Tabs>

      <ConfigurarWhatsAppModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        onSuccess={() => init()}
      />
    </div>
  );
}
