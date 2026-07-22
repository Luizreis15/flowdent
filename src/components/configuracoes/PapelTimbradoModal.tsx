import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Eye } from "lucide-react";
import { uploadPatientFile } from "@/lib/storage";
import { SignedClinicLogo } from "@/components/storage/SignedFileImage";

interface PapelTimbradoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
}

interface CabecalhoConfig {
  exibir_logo: boolean;
  altura_logo: number;
  posicao_logo: "esquerda" | "centro" | "direita";
}

interface RodapeConfig {
  exibir_endereco: boolean;
  exibir_telefone: boolean;
  exibir_email: boolean;
  texto_adicional: string | null;
}

export function PapelTimbradoModal({ open, onOpenChange, clinicaId }: PapelTimbradoModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [clinicaData, setClinicaData] = useState<any>(null);
  const [cabecalho, setCabecalho] = useState<CabecalhoConfig>({
    exibir_logo: true,
    altura_logo: 60,
    posicao_logo: "esquerda",
  });
  const [rodape, setRodape] = useState<RodapeConfig>({
    exibir_endereco: true,
    exibir_telefone: true,
    exibir_email: true,
    texto_adicional: null,
  });

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open, clinicaId]);

  const loadConfig = async () => {
    try {
      setLoading(true);

      // Carregar dados da clínica
      const { data: clinica, error: clinicaError } = await supabase
        .from("clinicas")
        .select("*")
        .eq("id", clinicaId)
        .single();

      if (clinicaError) throw clinicaError;
      setClinicaData(clinica);

      // Carregar configurações
      const { data: config, error: configError } = await supabase
        .from("configuracoes_clinica")
        .select("*")
        .eq("clinica_id", clinicaId)
        .maybeSingle();

      if (configError && configError.code !== "PGRST116") throw configError;

      if (config) {
        setLogoUrl(config.logotipo_url);
        if (config.cabecalho_personalizado) {
          setCabecalho(config.cabecalho_personalizado as unknown as CabecalhoConfig);
        }
        if (config.rodape_personalizado) {
          setRodape(config.rodape_personalizado as unknown as RodapeConfig);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido");
      return;
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const filePath = `clinicas/${clinicaId}/logo.${fileExt}`;

      await uploadPatientFile(filePath, file, { upsert: true });
      setLogoUrl(filePath);
      toast.success("Logo enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("configuracoes_clinica")
        .upsert({
          clinica_id: clinicaId,
          logotipo_url: logoUrl,
          cabecalho_personalizado: cabecalho as unknown as Record<string, unknown>,
          rodape_personalizado: rodape as unknown as Record<string, unknown>,
        } as any, { onConflict: "clinica_id" });

      if (error) throw error;

      toast.success("Papel timbrado salvo com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const getEnderecoCompleto = () => {
    if (!clinicaData?.address) return "";
    const addr = clinicaData.address;
    const partes = [];
    if (addr.rua) partes.push(`${addr.rua}${addr.numero ? `, ${addr.numero}` : ""}`);
    if (addr.bairro) partes.push(addr.bairro);
    if (addr.cidade && addr.uf) partes.push(`${addr.cidade}/${addr.uf}`);
    if (addr.cep) partes.push(`CEP: ${addr.cep}`);
    return partes.join(" • ");
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Personalizar Papel Timbrado
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configurações */}
          <div className="space-y-6">
            {/* Logo */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">Logotipo</h3>
                
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="border rounded-lg p-2 bg-muted">
                      <SignedClinicLogo
                        src={logoUrl}
                        alt="Logo"
                        className="h-16 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-24 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                      <span className="text-xs">Sem logo</span>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{logoUrl ? "Alterar Logo" : "Enviar Logo"}</span>
                      </div>
                    </Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG ou JPG, máx. 2MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Exibir logo no cabeçalho</Label>
                  <Switch
                    checked={cabecalho.exibir_logo}
                    onCheckedChange={(checked) => 
                      setCabecalho({ ...cabecalho, exibir_logo: checked })
                    }
                  />
                </div>

                {cabecalho.exibir_logo && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Altura do logo (px)</Label>
                        <Input
                          type="number"
                          min={30}
                          max={120}
                          value={cabecalho.altura_logo}
                          onChange={(e) =>
                            setCabecalho({ ...cabecalho, altura_logo: parseInt(e.target.value) || 60 })
                          }
                        />
                      </div>
                      <div>
                        <Label>Posição</Label>
                        <Select 
                          value={cabecalho.posicao_logo}
                          onValueChange={(value: "esquerda" | "centro" | "direita") =>
                            setCabecalho({ ...cabecalho, posicao_logo: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="esquerda">Esquerda</SelectItem>
                            <SelectItem value="centro">Centro</SelectItem>
                            <SelectItem value="direita">Direita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Rodapé */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">Rodapé</h3>
                
                <div className="flex items-center justify-between">
                  <Label>Exibir endereço</Label>
                  <Switch
                    checked={rodape.exibir_endereco}
                    onCheckedChange={(checked) => 
                      setRodape({ ...rodape, exibir_endereco: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Exibir telefone</Label>
                  <Switch
                    checked={rodape.exibir_telefone}
                    onCheckedChange={(checked) => 
                      setRodape({ ...rodape, exibir_telefone: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Exibir e-mail</Label>
                  <Switch
                    checked={rodape.exibir_email}
                    onCheckedChange={(checked) => 
                      setRodape({ ...rodape, exibir_email: checked })
                    }
                  />
                </div>

                <div>
                  <Label>Texto adicional do rodapé</Label>
                  <Textarea
                    placeholder="Ex: CRO-SP 12345 • Horário de funcionamento..."
                    value={rodape.texto_adicional || ""}
                    onChange={(e) =>
                      setRodape({ ...rodape, texto_adicional: e.target.value || null })
                    }
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pré-visualização
            </h3>
            
            <Card className="p-6 min-h-[500px] flex flex-col">
              {/* Cabeçalho Preview */}
              <div 
                className={`border-b pb-4 mb-4 flex ${
                  cabecalho.posicao_logo === "centro" ? "justify-center" :
                  cabecalho.posicao_logo === "direita" ? "justify-end" : "justify-start"
                }`}
              >
                {cabecalho.exibir_logo && logoUrl ? (
                  <SignedClinicLogo
                    src={logoUrl}
                    alt="Logo"
                    style={{ height: `${cabecalho.altura_logo}px` }}
                    className="object-contain"
                  />
                ) : cabecalho.exibir_logo ? (
                  <div 
                    style={{ height: `${cabecalho.altura_logo}px` }}
                    className="w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-xs"
                  >
                    Logo
                  </div>
                ) : null}
              </div>

              {/* Conteúdo simulado */}
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-4/5" />
              </div>

              {/* Rodapé Preview */}
              <div className="border-t pt-4 mt-4 text-xs text-muted-foreground text-center space-y-1">
                {rodape.exibir_endereco && clinicaData?.address && (
                  <p>{getEnderecoCompleto()}</p>
                )}
                <p>
                  {rodape.exibir_telefone && clinicaData?.telefone && (
                    <span>Tel: {clinicaData.telefone}</span>
                  )}
                  {rodape.exibir_telefone && rodape.exibir_email && " • "}
                  {rodape.exibir_email && clinicaData?.email_contato && (
                    <span>{clinicaData.email_contato}</span>
                  )}
                </p>
                {rodape.texto_adicional && (
                  <p className="italic">{rodape.texto_adicional}</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
