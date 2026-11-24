import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RemuneracaoTab } from "./RemuneracaoTab";
import { AgendaProfissionalInline } from "./AgendaProfissionalInline";

interface ProfissionalModalProps {
  open: boolean;
  onClose: () => void;
  profissional: any | null;
  clinicaId: string;
}

export const ProfissionalModal = ({ open, onClose, profissional, clinicaId }: ProfissionalModalProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    cro: "",
    especialidade: "",
    email: "",
    telefone: "",
    cpf: "",
    chave_pix: "",
    perfil: "dentista",
    cor: "#3b82f6",
    ativo: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profissional) {
      setFormData({
        nome: profissional.nome || "",
        cro: profissional.cro || "",
        especialidade: profissional.especialidade || "",
        email: profissional.email || "",
        telefone: profissional.telefone || "",
        cpf: profissional.cpf || "",
        chave_pix: profissional.chave_pix || "",
        perfil: profissional.perfil || "dentista",
        cor: profissional.cor || "#3b82f6",
        ativo: profissional.ativo ?? true
      });
    } else {
      setFormData({
        nome: "",
        cro: "",
        especialidade: "",
        email: "",
        telefone: "",
        cpf: "",
        chave_pix: "",
        perfil: "dentista",
        cor: "#3b82f6",
        ativo: true
      });
    }
  }, [profissional, open]);

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.email.trim()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      setSaving(true);

      if (profissional) {
        // Atualizar
        const { error } = await supabase
          .from("profissionais")
          .update(formData)
          .eq("id", profissional.id);

        if (error) throw error;

        // Registrar auditoria
        await supabase
          .from("audit_log" as any)
          .insert({
            entidade: "profissionais",
            entidade_id: profissional.id,
            acao: "update",
            dif: formData
          });

        toast.success("Profissional atualizado com sucesso");
      } else {
        // Criar
        const { data, error } = await supabase
          .from("profissionais")
          .insert({
            ...formData,
            clinica_id: clinicaId
          })
          .select()
          .single();

        if (error) throw error;

        // Registrar auditoria
        await supabase
          .from("audit_log" as any)
          .insert({
            entidade: "profissionais",
            entidade_id: data.id,
            acao: "create",
            dif: formData
          });

        toast.success("Profissional cadastrado com sucesso");
      }

      onClose();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {profissional ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados">Dados cadastrais</TabsTrigger>
            <TabsTrigger value="remuneracao" disabled={!profissional}>Remuneração</TabsTrigger>
            <TabsTrigger value="agenda" disabled={!profissional}>Agenda</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cro">CRO</Label>
                <Input
                  id="cro"
                  value={formData.cro}
                  onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade</Label>
                <Input
                  id="especialidade"
                  value={formData.especialidade}
                  onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                />
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
                    <SelectItem value="responsavel">Responsável</SelectItem>
                    <SelectItem value="dentista">Dentista</SelectItem>
                    <SelectItem value="asb">ASB</SelectItem>
                    <SelectItem value="recepcao">Recepção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chave_pix">Chave PIX</Label>
                <Input
                  id="chave_pix"
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  value={formData.chave_pix}
                  onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cor">Cor na agenda</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="cor"
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, cor: color })}
                        className={`h-6 w-6 rounded-full transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${formData.cor === color ? 'ring-2 ring-foreground ring-offset-2' : ''}`}
                        aria-label={`Cor ${color}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="remuneracao">
            {profissional && <RemuneracaoTab profissionalId={profissional.id} />}
          </TabsContent>

          <TabsContent value="agenda">
            {profissional && (
              <AgendaProfissionalInline profissional={{ id: profissional.id, nome: profissional.nome }} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
