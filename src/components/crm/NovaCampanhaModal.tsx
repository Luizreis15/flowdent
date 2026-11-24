import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NovaCampanhaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaCampanhaModal({ open, onOpenChange, onSuccess }: NovaCampanhaModalProps) {
  const { clinicId, user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "custom",
    message_template: "",
    segment: "all",
    scheduled_at: "",
    send_now: true,
  });

  const handleSave = async () => {
    if (!form.name || !form.message_template || !clinicId) {
      toast({ title: "Preencha nome e mensagem", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      const segmentMap: Record<string, any> = {
        all: {},
        inactive_6m: { inactive_months: 6 },
        birthday: { birthday_month: new Date().getMonth() + 1 },
      };

      // Criar campanha
      const { data: campaign, error } = await supabase
        .from("whatsapp_campaigns")
        .insert({
          clinic_id: clinicId,
          name: form.name,
          type: form.type,
          message_template: form.message_template,
          target_segment: segmentMap[form.segment] || {},
          status: form.send_now ? "scheduled" : "draft",
          scheduled_at: form.send_now ? new Date().toISOString() : form.scheduled_at || null,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Buscar pacientes do segmento e criar recipients
      let patientsQuery = supabase
        .from("patients")
        .select("id, nome, telefone")
        .eq("clinic_id", clinicId)
        .not("telefone", "is", null);

      const { data: patients } = await patientsQuery;

      if (patients && patients.length > 0 && campaign) {
        const recipients = patients
          .filter((p: any) => p.telefone)
          .map((p: any) => ({
            campaign_id: campaign.id,
            patient_id: p.id,
            phone: p.telefone,
            status: "pending",
          }));

        if (recipients.length > 0) {
          await supabase.from("whatsapp_campaign_recipients").insert(recipients as any);
        }
      }

      toast({ title: "Campanha criada", description: `${patients?.length || 0} destinatários adicionados` });
      onSuccess();
      onOpenChange(false);
      setForm({ name: "", type: "custom", message_template: "", segment: "all", scheduled_at: "", send_now: true });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao criar campanha", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Campanha WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da campanha *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Recall de limpeza Janeiro"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recall">Recall</SelectItem>
                <SelectItem value="aniversario">Aniversário</SelectItem>
                <SelectItem value="retorno">Retorno</SelectItem>
                <SelectItem value="promocao">Promoção</SelectItem>
                <SelectItem value="custom">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Segmento de pacientes</Label>
            <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pacientes</SelectItem>
                <SelectItem value="inactive_6m">Inativos há 6+ meses</SelectItem>
                <SelectItem value="birthday">Aniversariantes do mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mensagem *</Label>
            <Textarea
              value={form.message_template}
              onChange={(e) => setForm({ ...form, message_template: e.target.value })}
              placeholder="Use {paciente} para o nome do paciente"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Variáveis: {"{paciente}"}, {"{link_review}"}</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={form.send_now}
                onChange={() => setForm({ ...form, send_now: true })}
              />
              Enviar agora
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!form.send_now}
                onChange={() => setForm({ ...form, send_now: false })}
              />
              Agendar
            </label>
          </div>
          {!form.send_now && (
            <div className="space-y-2">
              <Label>Data/hora do envio</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
