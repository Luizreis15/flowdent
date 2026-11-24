import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Send, Mail, Users, Eye, BarChart3, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  status: string;
  target_type: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
}

const targetOptions = [
  { value: "all_clinics", label: "Todas as Clínicas" },
  { value: "trial", label: "Clínicas em Teste Grátis" },
  { value: "active", label: "Clínicas Ativas" },
  { value: "inactive", label: "Clínicas Inativas" },
  { value: "leads", label: "Todos os Leads" },
];

const AdminMarketing = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    html_content: "",
    target_type: "all_clinics",
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.subject || !formData.html_content) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("email_campaigns").insert({
        ...formData,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Campanha criada");
      setShowModal(false);
      setFormData({ name: "", subject: "", html_content: "", target_type: "all_clinics" });
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar campanha");
    } finally {
      setSending(false);
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    toast.info("Funcionalidade de envio em desenvolvimento");
    // TODO: Implement send-marketing-email edge function
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-500/20 text-slate-400",
      scheduled: "bg-amber-500/20 text-amber-400",
      sending: "bg-blue-500/20 text-blue-400",
      sent: "bg-green-500/20 text-green-400",
      cancelled: "bg-red-500/20 text-red-400",
    };
    const labels: Record<string, string> = {
      draft: "Rascunho",
      scheduled: "Agendada",
      sending: "Enviando",
      sent: "Enviada",
      cancelled: "Cancelada",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter((c) => c.status === "sent").length,
    totalRecipients: campaigns.reduce((sum, c) => sum + c.total_recipients, 0),
    totalOpened: campaigns.reduce((sum, c) => sum + c.opened_count, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Marketing</h1>
          <p className="text-slate-400">Gerenciar campanhas de email</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Campanhas</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Enviadas</p>
                <p className="text-2xl font-bold text-white">{stats.sent}</p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Destinatários</p>
                <p className="text-2xl font-bold text-white">{stats.totalRecipients}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Aberturas</p>
                <p className="text-2xl font-bold text-white">{stats.totalOpened}</p>
              </div>
              <Eye className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma campanha criada</p>
              <Button onClick={() => setShowModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira campanha
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="p-4 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-slate-400 text-sm mb-2">{campaign.subject}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                          Público: {targetOptions.find((t) => t.value === campaign.target_type)?.label}
                        </span>
                        <span>
                          Criada: {format(new Date(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {campaign.sent_at && (
                          <span>
                            Enviada: {format(new Date(campaign.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status === "sent" && (
                        <div className="text-right text-sm">
                          <p className="text-slate-400">
                            {campaign.opened_count}/{campaign.total_recipients} abertos
                          </p>
                          <p className="text-slate-500 text-xs">
                            {campaign.total_recipients > 0
                              ? ((campaign.opened_count / campaign.total_recipients) * 100).toFixed(1)
                              : 0}
                            % taxa
                          </p>
                        </div>
                      )}
                      {campaign.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => handleSendCampaign(campaign)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Enviar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Nome da Campanha *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Newsletter Janeiro"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Público Alvo *</Label>
                <Select
                  value={formData.target_type}
                  onValueChange={(value) => setFormData({ ...formData, target_type: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {targetOptions.map((target) => (
                      <SelectItem key={target.value} value={target.value}>
                        {target.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Assunto do Email *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: Novidades do Flowdent para você"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Conteúdo HTML *</Label>
              <Textarea
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                placeholder="<html>...</html>"
                className="bg-slate-700 border-slate-600 text-white font-mono text-sm"
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCampaign} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMarketing;
