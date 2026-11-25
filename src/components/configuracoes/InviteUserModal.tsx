import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  clinicaId: string;
}

export const InviteUserModal = ({ open, onClose, clinicaId }: InviteUserModalProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    perfil: "recepcao"
  });
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        nome: "",
        email: "",
        perfil: "recepcao"
      });
    }
  }, [open]);

  const loadProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, especialidade")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setProfissionais(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar profissionais:", error);
    }
  };

  const handleInvite = async () => {
    if (!formData.nome.trim() || !formData.email.trim()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      setSending(true);

      // Buscar nome da clínica
      const { data: clinica } = await supabase
        .from("clinicas")
        .select("nome")
        .eq("id", clinicaId)
        .single();

      // Chamar edge function para criar usuário
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          name: formData.nome,
          email: formData.email.toLowerCase(),
          role: formData.perfil,
          clinicaId: clinicaId,
          clinicName: clinica?.nome || "Flowdent"
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Usuário criado com sucesso! Um email com instruções foi enviado.");
      onClose();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast.error("Erro ao criar usuário: " + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar novo usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perfil">Perfil *</Label>
            <Select
              value={formData.perfil}
              onValueChange={(value) => setFormData({ ...formData, perfil: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="recepcao">Recepcionista</SelectItem>
                <SelectItem value="dentista">Cirurgião-Dentista</SelectItem>
                <SelectItem value="assistente">Assistente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleInvite} disabled={sending}>
            {sending ? "Criando..." : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
