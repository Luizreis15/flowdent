import { useState, useEffect } from "react";
import InputMask from "react-input-mask";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  cpf?: string;
  rg?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  is_foreign?: boolean;
  how_found?: string;
  tags?: string[];
  responsible_name?: string;
  responsible_birth_date?: string;
  responsible_cpf?: string;
  responsible_phone?: string;
  notes?: string;
  address?: string;
  nickname?: string;
  status?: string;
  civil_status?: string;
  education_level?: string;
}

interface EditPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onSuccess: () => void;
}

export function EditPatientModal({ open, onOpenChange, patient, onSuccess }: EditPatientModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    nickname: "",
    phone: "",
    cpf: "",
    rg: "",
    email: "",
    birth_date: "",
    gender: "",
    is_foreign: false,
    how_found: "",
    address: "",
    notes: "",
    responsible_name: "",
    responsible_birth_date: "",
    responsible_cpf: "",
    responsible_phone: "",
    status: "active",
    civil_status: "",
    education_level: "",
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        full_name: patient.full_name || "",
        nickname: patient.nickname || "",
        phone: patient.phone || "",
        cpf: patient.cpf || "",
        rg: patient.rg || "",
        email: patient.email || "",
        birth_date: patient.birth_date || "",
        gender: patient.gender || "",
        is_foreign: patient.is_foreign || false,
        how_found: patient.how_found || "",
        address: patient.address || "",
        notes: patient.notes || "",
        responsible_name: patient.responsible_name || "",
        responsible_birth_date: patient.responsible_birth_date || "",
        responsible_cpf: patient.responsible_cpf || "",
        responsible_phone: patient.responsible_phone || "",
        status: patient.status || "active",
        civil_status: patient.civil_status || "",
        education_level: patient.education_level || "",
      });
    }
  }, [patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.phone) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("patients")
        .update({
          full_name: formData.full_name,
          nickname: formData.nickname || null,
          phone: formData.phone,
          cpf: formData.cpf || null,
          rg: formData.rg || null,
          email: formData.email || null,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          is_foreign: formData.is_foreign,
          how_found: formData.how_found || null,
          address: formData.address || null,
          notes: formData.notes || null,
          responsible_name: formData.responsible_name || null,
          responsible_birth_date: formData.responsible_birth_date || null,
          responsible_cpf: formData.responsible_cpf || null,
          responsible_phone: formData.responsible_phone || null,
          status: formData.status,
          civil_status: formData.civil_status || null,
          education_level: formData.education_level || null,
        })
        .eq("id", patient.id);

      if (error) throw error;

      toast.success("Paciente atualizado com sucesso");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar paciente:", error);
      toast.error("Erro ao atualizar paciente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="status" className="text-base font-medium">Status do Paciente</Label>
              <p className="text-sm text-muted-foreground">
                {formData.status === "active" ? "Paciente ativo no sistema" : "Paciente inativo"}
              </p>
            </div>
            <Switch
              id="status"
              checked={formData.status === "active"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, status: checked ? "active" : "inactive" })
              }
            />
          </div>

          <Separator />

          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="font-semibold">Dados Pessoais</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="nickname">Apelido</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="Como prefere ser chamado"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <InputMask
                  mask="(99) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                >
                  {(inputProps: any) => (
                    <Input
                      {...inputProps}
                      id="phone"
                      required
                    />
                  )}
                </InputMask>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF</Label>
                <InputMask
                  mask="999.999.999-99"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                >
                  {(inputProps: any) => (
                    <Input
                      {...inputProps}
                      id="cpf"
                    />
                  )}
                </InputMask>
              </div>

              <div>
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="gender">Sexo</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Dados Complementares */}
          <div className="space-y-4">
            <h3 className="font-semibold">Dados Complementares</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="civil_status">Estado Civil</Label>
                <Select 
                  value={formData.civil_status} 
                  onValueChange={(value) => setFormData({ ...formData, civil_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                    <SelectItem value="uniao_estavel">União Estável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="education_level">Escolaridade</Label>
                <Select 
                  value={formData.education_level} 
                  onValueChange={(value) => setFormData({ ...formData, education_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                    <SelectItem value="medio">Ensino Médio</SelectItem>
                    <SelectItem value="superior">Ensino Superior</SelectItem>
                    <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="how_found">Como chegou na clínica</Label>
                <Select value={formData.how_found} onValueChange={(value) => setFormData({ ...formData, how_found: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="is_foreign"
                  checked={formData.is_foreign}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_foreign: checked as boolean })}
                />
                <Label htmlFor="is_foreign" className="cursor-pointer">Estrangeiro</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dados do Responsável */}
          <div className="space-y-4">
            <h3 className="font-semibold">Dados do Responsável</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="responsible_name">Nome do Responsável</Label>
                <Input
                  id="responsible_name"
                  value={formData.responsible_name}
                  onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="responsible_cpf">CPF</Label>
                <InputMask
                  mask="999.999.999-99"
                  value={formData.responsible_cpf}
                  onChange={(e) => setFormData({ ...formData, responsible_cpf: e.target.value })}
                >
                  {(inputProps: any) => (
                    <Input
                      {...inputProps}
                      id="responsible_cpf"
                    />
                  )}
                </InputMask>
              </div>

              <div>
                <Label htmlFor="responsible_phone">Telefone</Label>
                <InputMask
                  mask="(99) 99999-9999"
                  value={formData.responsible_phone}
                  onChange={(e) => setFormData({ ...formData, responsible_phone: e.target.value })}
                >
                  {(inputProps: any) => (
                    <Input
                      {...inputProps}
                      id="responsible_phone"
                    />
                  )}
                </InputMask>
              </div>

              <div>
                <Label htmlFor="responsible_birth_date">Data de Nascimento</Label>
                <Input
                  id="responsible_birth_date"
                  type="date"
                  value={formData.responsible_birth_date}
                  onChange={(e) => setFormData({ ...formData, responsible_birth_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Observações sobre o paciente..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
