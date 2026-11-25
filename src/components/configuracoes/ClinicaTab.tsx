import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { HorarioFuncionamentoCard, HorarioFuncionamento, DEFAULT_HORARIO } from "./HorarioFuncionamentoCard";
import { IdentidadeVisualCard, type BrandingConfig } from "./IdentidadeVisualCard";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

interface ClinicaTabProps {
  clinicaId: string;
}

export function ClinicaTab({ clinicaId }: ClinicaTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [nomeResponsavel, setNomeResponsavel] = useState<string | null>(null);

  // O campo mostrava o ID cru do usuário responsável; agora mostra o nome
  useEffect(() => {
    const ownerId = config?.owner_user_id;
    if (!ownerId) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", ownerId)
      .maybeSingle()
      .then(({ data }) => setNomeResponsavel(data?.full_name || "—"));
  }, [config?.owner_user_id]);

  useEffect(() => {
    loadConfig();
  }, [clinicaId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      // Carregar dados da clínica
      const { data: clinicaData, error: clinicaError } = await supabase
        .from("clinicas")
        .select("*")
        .eq("id", clinicaId)
        .single();

      if (clinicaError) throw clinicaError;

      // Carregar configurações adicionais
      const { data: configData, error: configError } = await supabase
        .from("configuracoes_clinica")
        .select("*")
        .eq("clinica_id", clinicaId)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') throw configError;

      const address = clinicaData?.address as any;
      
      setConfig({
        ...clinicaData,
        ...configData,
        clinica_id: clinicaId,
        email_contato: configData?.email_contato || "",
        whatsapp: configData?.whatsapp || "",
        telefone: clinicaData?.telefone || "",
        imprimir_papel_timbrado: configData?.imprimir_papel_timbrado || false,
        horario_funcionamento: configData?.horario_funcionamento || DEFAULT_HORARIO,
        google_review_link: (clinicaData as any)?.google_review_link || "",
        // Branding
        logotipo_url: configData?.logotipo_url || null,
        cor_primaria: (configData as any)?.cor_primaria || "#22577A",
        layout_cabecalho: (configData as any)?.layout_cabecalho || "logo_esquerda",
        marca_dagua_ativa: (configData as any)?.marca_dagua_ativa || false,
        instagram: (configData as any)?.instagram || "",
        website: (configData as any)?.website || "",
        // Extrair endereço do JSONB
        cep: address?.cep || "",
        rua: address?.rua || "",
        numero: address?.numero || "",
        complemento: address?.complemento || "",
        bairro: address?.bairro || "",
        cidade: address?.cidade || "",
        uf: address?.uf || "",
      });
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const buscarCEP = async () => {
    if (!config?.cep || config.cep.length < 8) {
      toast({
        title: "Atenção",
        description: "Digite um CEP válido",
        variant: "destructive"
      });
      return;
    }

    try {
      const cep = config.cep.replace(/\D/g, "");
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "Erro",
          description: "CEP não encontrado",
          variant: "destructive"
        });
        return;
      }

      setConfig({
        ...config,
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
      });

      toast({
        title: "Sucesso",
        description: "Endereço preenchido automaticamente"
      });
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar CEP",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Atualizar dados da clínica
      const { error: clinicaError } = await supabase
        .from("clinicas")
        .update({
          nome: config.nome,
          cnpj: config.cnpj,
          telefone: config.telefone,
          google_review_link: config.google_review_link || null,
          address: {
            cep: config.cep,
            rua: config.rua,
            numero: config.numero,
            complemento: config.complemento,
            bairro: config.bairro,
            cidade: config.cidade,
            uf: config.uf
          }
        } as any)
        .eq("id", clinicaId);

      if (clinicaError) throw clinicaError;

      // Atualizar configurações adicionais
      const { error: configError } = await supabase
        .from("configuracoes_clinica")
        .upsert({
          clinica_id: clinicaId,
          email_contato: config.email_contato,
          whatsapp: config.whatsapp,
          imprimir_papel_timbrado: config.imprimir_papel_timbrado,
          horario_funcionamento: config.horario_funcionamento,
          logotipo_url: config.logotipo_url,
          cor_primaria: config.cor_primaria,
          layout_cabecalho: config.layout_cabecalho,
          marca_dagua_ativa: config.marca_dagua_ativa,
          instagram: config.instagram || null,
          website: config.website || null,
        } as any, {
          onConflict: 'clinica_id' 
        });

      if (configError) throw configError;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso"
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <EsqueletoSecao />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da clínica *</Label>
              <Input
                id="nome"
                value={config?.nome || ""}
                onChange={(e) => setConfig({ ...config, nome: e.target.value })}
                placeholder="Nome da clínica"
                maxLength={150}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ da clínica</Label>
              <Input
                id="cnpj"
                value={config?.cnpj || ""}
                onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_comunicacao">Nome utilizado nas comunicações *</Label>
              <Input
                id="nome_comunicacao"
                value={config?.nome || ""}
                onChange={(e) => setConfig({ ...config, nome: e.target.value })}
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável pela clínica *</Label>
              <Input
                id="responsavel"
                value={config?.owner_user_id ? (nomeResponsavel ?? "Carregando…") : "Não definido"}
                disabled
                maxLength={150}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <IdentidadeVisualCard
        clinicaId={clinicaId}
        value={{
          logotipo_url: config?.logotipo_url || null,
          cor_primaria: config?.cor_primaria || "#22577A",
          layout_cabecalho: config?.layout_cabecalho || "logo_esquerda",
          marca_dagua_ativa: config?.marca_dagua_ativa || false,
          instagram: config?.instagram || "",
          website: config?.website || "",
        }}
        onChange={(branding) => setConfig({ ...config, ...branding })}
      />

      <HorarioFuncionamentoCard
        value={config?.horario_funcionamento}
        onChange={(horario) => setConfig({ ...config, horario_funcionamento: horario })}
      />

      <Card>
        <CardHeader>
          <CardTitle>Fiscal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Emitir recibo em nome de</Label>
            <Select defaultValue="clinica">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clinica">Clínica</SelectItem>
                <SelectItem value="profissional">Profissional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações da clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={config?.email_contato || ""}
                onChange={(e) => setConfig({ ...config, email_contato: e.target.value })}
                placeholder="email@clinica.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={config?.telefone || ""}
                onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular">Celular *</Label>
              <Input
                id="celular"
                value={config?.whatsapp || ""}
                onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="papel-timbrado"
              checked={config?.imprimir_papel_timbrado || false}
              onCheckedChange={(checked) =>
                setConfig({ ...config, imprimir_papel_timbrado: checked })
              }
            />
            <Label htmlFor="papel-timbrado">
              Imprimir com papel timbrado
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Review</CardTitle>
          <CardDescription>Link para avaliação no Google Meu Negócio (enviado automaticamente após consultas)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google_review_link">Link do Google Meu Negócio</Label>
            <Input
              id="google_review_link"
              value={config?.google_review_link || ""}
              onChange={(e) => setConfig({ ...config, google_review_link: e.target.value })}
              placeholder="https://g.page/r/..."
            />
            <p className="text-xs text-muted-foreground">
              Cole aqui o link de avaliação do Google da sua clínica. Ele será enviado automaticamente via WhatsApp após cada consulta concluída.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={config?.cep || ""}
                  onChange={(e) => setConfig({ ...config, cep: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={buscarCEP}>
                  Buscar
                </Button>
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="rua">Rua</Label>
              <Input
                id="rua"
                value={config?.rua || ""}
                onChange={(e) => setConfig({ ...config, rua: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={config?.numero || ""}
                onChange={(e) => setConfig({ ...config, numero: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={config?.complemento || ""}
                onChange={(e) => setConfig({ ...config, complemento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={config?.bairro || ""}
                onChange={(e) => setConfig({ ...config, bairro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={config?.cidade || ""}
                onChange={(e) => setConfig({ ...config, cidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                placeholder="SP"
                maxLength={2}
                value={config?.uf || ""}
                onChange={(e) => setConfig({ ...config, uf: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}