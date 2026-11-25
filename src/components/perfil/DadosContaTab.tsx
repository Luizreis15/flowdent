import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";
import { z } from "zod";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

const dadosContaSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().optional(),
  data_nascimento: z.string().optional(),
  telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  telefone_fixo: z.string().optional(),
  cep: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  fuso_horario: z.string(),
});

interface DadosContaTabProps {
  userId: string;
}

const DadosContaTab = ({ userId }: DadosContaTabProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    cpf: "",
    data_nascimento: "",
    telefone: "",
    telefone_fixo: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    fuso_horario: "America/Sao_Paulo",
    foto_perfil_url: "",
  });

  const [email, setEmail] = useState("");

  useEffect(() => {
    loadProfileData();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          full_name: data.full_name || "",
          cpf: data.cpf || "",
          data_nascimento: data.data_nascimento || "",
          telefone: data.telefone || "",
          telefone_fixo: data.telefone_fixo || "",
          cep: data.cep || "",
          rua: data.rua || "",
          numero: data.numero || "",
          complemento: data.complemento || "",
          bairro: data.bairro || "",
          cidade: data.cidade || "",
          uf: data.uf || "",
          fuso_horario: data.fuso_horario || "America/Sao_Paulo",
          foto_perfil_url: data.foto_perfil_url || "",
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar perfil:", error);
      toast.error("Erro ao carregar dados do perfil");
    } finally {
      setLoading(false);
    }
  };

  const buscarCEP = async () => {
    if (!formData.cep || formData.cep.length < 8) return;

    try {
      const cep = formData.cep.replace(/\D/g, "");
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setFormData({
        ...formData,
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
      });

      toast.success("Endereço preenchido automaticamente");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    }
  };

  const handleSave = async () => {
    try {
      dadosContaSchema.parse(formData);

      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          cpf: formData.cpf || null,
          data_nascimento: formData.data_nascimento || null,
          telefone: formData.telefone,
          telefone_fixo: formData.telefone_fixo || null,
          cep: formData.cep || null,
          rua: formData.rua || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          uf: formData.uf || null,
          fuso_horario: formData.fuso_horario,
          atualizado_por: userId,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Dados da conta atualizados com sucesso");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao atualizar dados: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <EsqueletoSecao linhas={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={formData.foto_perfil_url} />
          <AvatarFallback>
            <User className="h-7 w-7 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-section text-foreground">{formData.full_name || "Sem nome"}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome completo *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>

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
          <Label htmlFor="data_nascimento">Data de nascimento</Label>
          <Input
            id="data_nascimento"
            type="date"
            value={formData.data_nascimento}
            onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone celular *</Label>
          <Input
            id="telefone"
            placeholder="(00) 00000-0000"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefone_fixo">Telefone fixo</Label>
          <Input
            id="telefone_fixo"
            placeholder="(00) 0000-0000"
            value={formData.telefone_fixo}
            onChange={(e) => setFormData({ ...formData, telefone_fixo: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuso_horario">Fuso horário *</Label>
          <Input
            id="fuso_horario"
            value={formData.fuso_horario}
            onChange={(e) => setFormData({ ...formData, fuso_horario: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h3 className="text-section text-foreground">Endereço</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <div className="flex gap-2">
              <Input
                id="cep"
                placeholder="00000-000"
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
              />
              <Button type="button" variant="outline" onClick={buscarCEP}>
                Buscar
              </Button>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="rua">Rua</Label>
            <Input
              id="rua"
              value={formData.rua}
              onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={formData.complemento}
              onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              value={formData.bairro}
              onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf">UF</Label>
            <Input
              id="uf"
              placeholder="SP"
              maxLength={2}
              value={formData.uf}
              onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
        <Button variant="outline" onClick={loadProfileData}>
          Reverter alterações
        </Button>
      </div>
    </div>
  );
};

export default DadosContaTab;
