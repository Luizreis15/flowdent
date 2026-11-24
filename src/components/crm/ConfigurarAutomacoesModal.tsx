import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface ConfigurarAutomacoesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Automation {
  id?: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  message_template: string;
  is_active: boolean;
  isNew?: boolean;
}

const DEFAULT_AUTOMATIONS: Omit<Automation, 'id'>[] = [
  {
    name: "Confirmação de Consulta",
    trigger_type: "pre_appointment",
    trigger_config: { hours_before: 24 },
    message_template: "Olá {paciente}! 🦷\n\nLembramos da sua consulta amanhã às {hora}.\n\nResponda SIM para confirmar.",
    is_active: true,
  },
  {
    name: "Avaliação Google pós-consulta",
    trigger_type: "post_appointment",
    trigger_config: {},
    message_template: "Olá {paciente}! 😊\n\nObrigado pela visita! Avalie-nos no Google:\n{link_review}\n\nSua opinião é muito importante! ⭐",
    is_active: true,
  },
  {
    name: "Recall 6 meses",
    trigger_type: "recall",
    trigger_config: { months_after: 6 },
    message_template: "Olá {paciente}! 🦷\n\nJá faz 6 meses desde sua última visita. Que tal agendar uma avaliação?\n\nEntre em contato conosco! 😊",
    is_active: false,
  },
  {
    name: "Aniversário",
    trigger_type: "birthday",
    trigger_config: {},
    message_template: "Parabéns, {paciente}! 🎂🎉\n\nA equipe da clínica deseja um feliz aniversário!\n\nAproveite um desconto especial na sua próxima consulta! 😊",
    is_active: false,
  },
];

export function ConfigurarAutomacoesModal({ open, onOpenChange }: ConfigurarAutomacoesModalProps) {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [automations, setAutomations] = useState<Automation[]>([]);

  useEffect(() => {
    if (open && clinicId) loadAutomations();
  }, [open, clinicId]);

  const loadAutomations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("whatsapp_automations")
        .select("*")
        .eq("clinic_id", clinicId!);

      if (error) throw error;

      if (data && data.length > 0) {
        setAutomations(data.map((a: any) => ({ ...a })));
      } else {
        // Criar defaults
        setAutomations(DEFAULT_AUTOMATIONS.map(a => ({ ...a, isNew: true })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clinicId) return;
    try {
      setSaving(true);

      for (const auto of automations) {
        const payload = {
          clinic_id: clinicId,
          name: auto.name,
          trigger_type: auto.trigger_type,
          trigger_config: auto.trigger_config,
          message_template: auto.message_template,
          channel: "whatsapp",
          is_active: auto.is_active,
        };

        if (auto.id && !auto.isNew) {
          await supabase.from("whatsapp_automations").update(payload as any).eq("id", auto.id);
        } else {
          await supabase.from("whatsapp_automations").insert(payload as any);
        }
      }

      toast({ title: "Automações salvas" });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const triggerLabels: Record<string, string> = {
    pre_appointment: "Antes da consulta",
    post_appointment: "Após consulta",
    recall: "Recall",
    birthday: "Aniversário",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Automações WhatsApp</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {automations.map((auto, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{auto.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Gatilho: {triggerLabels[auto.trigger_type] || auto.trigger_type}
                    </p>
                  </div>
                  <Switch
                    checked={auto.is_active}
                    onCheckedChange={(checked) => {
                      const updated = [...automations];
                      updated[idx] = { ...updated[idx], is_active: checked };
                      setAutomations(updated);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Template da mensagem</Label>
                  <Textarea
                    value={auto.message_template}
                    onChange={(e) => {
                      const updated = [...automations];
                      updated[idx] = { ...updated[idx], message_template: e.target.value };
                      setAutomations(updated);
                    }}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Automações
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
