import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Permission {
  id: string;
  recurso: string;
  acao: string;
  permitido: boolean;
}

interface PermissoesPerfilModalProps {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  perfil: string;
  perfilLabel: string;
}

const MODULE_LABELS: Record<string, string> = {
  agenda: "📅 Agenda",
  prontuario: "📋 Prontuário",
  odontograma: "🦷 Odontograma",
  orcamentos: "💼 Orçamentos",
  pacientes: "👥 Pacientes",
  financeiro: "💰 Financeiro",
  comissoes: "📊 Comissões",
  relatorios: "📈 Relatórios",
  configuracoes: "⚙️ Configurações",
  crm: "💬 CRM",
  usuarios: "👤 Usuários",
  estoque: "📦 Estoque",
  ortodontia: "😁 Ortodontia",
  proteses: "🔧 Próteses",
  portal_paciente: "🌐 Portal Paciente",
  ia_assistente: "✨ IA Assistente",
};

const ACTION_LABELS: Record<string, string> = {
  visualizar: "Visualizar",
  criar: "Criar",
  editar: "Editar",
  finalizar_atendimento: "Finalizar Atendimento",
  cadastrar: "Cadastrar",
  estorno: "Estornos",
  reabrir_pagamento: "Reabrir Pagamentos",
  gerenciar: "Gerenciar",
};

// Group permissions by recurso
function groupByRecurso(permissions: Permission[]) {
  const groups: Record<string, Permission[]> = {};
  for (const p of permissions) {
    if (!groups[p.recurso]) groups[p.recurso] = [];
    groups[p.recurso].push(p);
  }
  return groups;
}

export const PermissoesPerfilModal = ({
  open,
  onClose,
  clinicId,
  perfil,
  perfilLabel,
}: PermissoesPerfilModalProps) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadPermissions();
  }, [open, perfil]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clinic_permissions")
        .select("id, recurso, acao, permitido")
        .eq("clinic_id", clinicId)
        .eq("perfil", perfil as any)
        .order("recurso")
        .order("acao");

      if (error) throw error;
      setPermissions(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar permissões: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (id: string) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, permitido: !p.permitido } : p))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update all permissions in batch
      const updates = permissions.map((p) =>
        supabase
          .from("clinic_permissions")
          .update({ permitido: p.permitido, updated_at: new Date().toISOString() })
          .eq("id", p.id)
      );

      const results = await Promise.all(updates);
      const hasError = results.some((r) => r.error);
      if (hasError) throw new Error("Erro ao salvar algumas permissões");

      toast.success("Permissões atualizadas com sucesso");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const grouped = groupByRecurso(permissions);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Permissões: {perfilLabel}</DialogTitle>
          <DialogDescription>
            Configure quais módulos e ações este perfil pode acessar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {Object.entries(grouped).map(([recurso, perms]) => (
                <div key={recurso}>
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    {MODULE_LABELS[recurso] || recurso}
                  </h4>
                  <div className="space-y-2 pl-2">
                    {perms.map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <Label htmlFor={p.id} className="text-sm text-muted-foreground cursor-pointer">
                          {ACTION_LABELS[p.acao] || p.acao}
                        </Label>
                        <Switch
                          id={p.id}
                          checked={p.permitido}
                          onCheckedChange={() => togglePermission(p.id)}
                        />
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Permissões
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
