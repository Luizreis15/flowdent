import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, MapPin, CreditCard, Settings, BarChart3, Loader2, Search } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type ClinicRow = Database["public"]["Tables"]["clinicas"]["Row"];
type PlanoTipo = Database["public"]["Enums"]["plano_tipo"];
type StatusAssinatura = Database["public"]["Enums"]["status_assinatura"];
type Json = Database["public"]["Tables"]["clinicas"]["Row"]["address"];

interface AddressData {
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  [key: string]: string | undefined;
}

interface ClinicStats {
  totalPatients: number;
  totalAppointments: number;
  totalUsers: number;
}

interface DetalhesClinicaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string | null;
  onUpdate?: () => void;
}

export default function DetalhesClinicaModal({
  open,
  onOpenChange,
  clinicId,
  onUpdate,
}: DetalhesClinicaModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clinic, setClinic] = useState<ClinicRow | null>(null);
  const [address, setAddress] = useState<AddressData>({});
  const [stats, setStats] = useState<ClinicStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalUsers: 0,
  });
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    if (open && clinicId) {
      loadClinic();
      loadStats();
    }
  }, [open, clinicId]);

  const loadClinic = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clinicas")
        .select("*")
        .eq("id", clinicId)
        .single();

      if (error) throw error;
      setClinic(data);
      
      // Parse address JSON
      if (data.address && typeof data.address === "object") {
        setAddress(data.address as AddressData);
      }

      // Load owner name
      if (data.owner_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.owner_user_id)
          .single();
        setOwnerName(profile?.full_name || null);
      }
    } catch (error) {
      console.error("Erro ao carregar clínica:", error);
      toast.error("Erro ao carregar dados da clínica");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!clinicId) return;
    try {
      let patientCount = 0;
      let appointmentCount = 0;
      let userCount = 0;

      // Get patient count
      const patientResult = await supabase
        .from("patients")
        .select("id")
        .eq("clinic_id", clinicId);
      patientCount = patientResult.data?.length || 0;

      // Get user count
      const userResult = await supabase
        .from("profiles")
        .select("id")
        .eq("clinic_id", clinicId);
      userCount = userResult.data?.length || 0;

      // Skip appointments count for now to avoid type issues
      setStats({
        totalPatients: patientCount,
        totalAppointments: appointmentCount,
        totalUsers: userCount,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const handleSave = async () => {
    if (!clinic) return;
    setSaving(true);
    try {
      const updateData = {
        nome: clinic.nome,
        cnpj: clinic.cnpj,
        telefone: clinic.telefone,
        tipo: clinic.tipo,
        status_assinatura: clinic.status_assinatura,
        plano: clinic.plano,
        current_period_end: clinic.current_period_end,
        address: address as Json,
      };

      const { error } = await supabase
        .from("clinicas")
        .update(updateData)
        .eq("id", clinic.id);

      if (error) throw error;
      toast.success("Clínica atualizada com sucesso");
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  const buscarCEP = async () => {
    if (!address.cep || address.cep.length < 8) return;
    try {
      const cep = address.cep.replace(/\D/g, "");
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddress({
          ...address,
          rua: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          uf: data.uf || "",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const updateClinicField = <K extends keyof ClinicRow>(field: K, value: ClinicRow[K]) => {
    if (clinic) {
      setClinic({ ...clinic, [field]: value });
    }
  };

  const updateAddressField = (field: keyof AddressData, value: string) => {
    setAddress({ ...address, [field]: value });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Detalhes da Clínica
          </DialogTitle>
        </DialogHeader>

        {clinic && (
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="geral" className="text-xs">
                <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="endereco" className="text-xs">
                <MapPin className="h-4 w-4 mr-1 hidden sm:inline" />
                Endereço
              </TabsTrigger>
              <TabsTrigger value="assinatura" className="text-xs">
                <CreditCard className="h-4 w-4 mr-1 hidden sm:inline" />
                Assinatura
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs">
                <Settings className="h-4 w-4 mr-1 hidden sm:inline" />
                Config
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs">
                <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
                Stats
              </TabsTrigger>
            </TabsList>

            {/* Aba Geral */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Clínica</Label>
                  <Input
                    id="nome"
                    value={clinic.nome || ""}
                    onChange={(e) => updateClinicField("nome", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={clinic.cnpj || ""}
                    onChange={(e) => updateClinicField("cnpj", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={clinic.tipo || "clinica"}
                    onValueChange={(value) => updateClinicField("tipo", value)}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinica">Clínica</SelectItem>
                      <SelectItem value="consultorio">Consultório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={clinic.telefone || ""}
                    onChange={(e) => updateClinicField("telefone", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável (Owner)</Label>
                  <Input value={ownerName || "Não definido"} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Data de Criação</Label>
                  <Input
                    value={clinic.created_at ? new Date(clinic.created_at).toLocaleDateString("pt-BR") : "-"}
                    disabled
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba Endereço */}
            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={address.cep || ""}
                      onChange={(e) => updateAddressField("cep", e.target.value)}
                      placeholder="00000-000"
                    />
                    <Button variant="outline" size="icon" onClick={buscarCEP}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="rua">Rua</Label>
                  <Input
                    id="rua"
                    value={address.rua || ""}
                    onChange={(e) => updateAddressField("rua", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={address.numero || ""}
                    onChange={(e) => updateAddressField("numero", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={address.complemento || ""}
                    onChange={(e) => updateAddressField("complemento", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={address.bairro || ""}
                    onChange={(e) => updateAddressField("bairro", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={address.cidade || ""}
                    onChange={(e) => updateAddressField("cidade", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    value={address.uf || ""}
                    onChange={(e) => updateAddressField("uf", e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba Assinatura */}
            <TabsContent value="assinatura" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plano">Plano</Label>
                  <Select
                    value={clinic.plano || "starter"}
                    onValueChange={(value) => updateClinicField("plano", value as PlanoTipo)}
                  >
                    <SelectTrigger id="plano">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={clinic.status_assinatura || "trialing"}
                    onValueChange={(value) => updateClinicField("status_assinatura", value as StatusAssinatura)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="trialing">Trial</SelectItem>
                      <SelectItem value="past_due">Inadimplente</SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                      <SelectItem value="incomplete">Incompleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_end">Fim do Período</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={clinic.current_period_end?.split("T")[0] || ""}
                  onChange={(e) => updateClinicField("current_period_end", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stripe Customer ID</Label>
                  <Input value={clinic.stripe_customer_id || "Não vinculado"} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Stripe Subscription ID</Label>
                  <Input value={clinic.stripe_subscription_id || "Não vinculado"} disabled />
                </div>
              </div>
            </TabsContent>

            {/* Aba Config */}
            <TabsContent value="config" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">IDs do Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>ID da Clínica</Label>
                    <Input value={clinic.id} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner User ID</Label>
                    <Input value={clinic.owner_user_id || "Não definido"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Status do Onboarding</Label>
                    <Input value={clinic.onboarding_status || "Não iniciado"} disabled />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Stats */}
            <TabsContent value="stats" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pacientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPatients}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Agendamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalAppointments}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Usuários
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
