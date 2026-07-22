import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Palette, Upload, Image, Instagram, Globe, Loader2 } from "lucide-react";
import { uploadPatientFile } from "@/lib/storage";
import { SignedClinicLogo } from "@/components/storage/SignedFileImage";

export interface BrandingConfig {
  logotipo_url: string | null;
  cor_primaria: string;
  layout_cabecalho: string;
  marca_dagua_ativa: boolean;
  instagram: string;
  website: string;
}

interface IdentidadeVisualCardProps {
  clinicaId: string;
  value: BrandingConfig;
  onChange: (config: BrandingConfig) => void;
}

const LAYOUT_OPTIONS = [
  { value: "logo_esquerda", label: "Logo à esquerda, dados à direita" },
  { value: "logo_centralizado", label: "Logo centralizado acima" },
  { value: "logo_direita", label: "Logo à direita, dados à esquerda" },
];

const COLOR_PRESETS = [
  { value: "#22577A", label: "Azul Petróleo" },
  { value: "#1B4332", label: "Verde Floresta" },
  { value: "#2D3A8C", label: "Azul Royal" },
  { value: "#6D2077", label: "Roxo Elegante" },
  { value: "#8B1A1A", label: "Bordô" },
  { value: "#1A1A1A", label: "Preto Clássico" },
];

export function IdentidadeVisualCard({ clinicaId, value, onChange }: IdentidadeVisualCardProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "O arquivo deve ter no máximo 2MB", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Selecione um arquivo de imagem", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const filePath = `clinicas/${clinicaId}/logo.${ext}`;

      await uploadPatientFile(filePath, file, { upsert: true });

      // Guarda path relativo — signed URL é resolvida na hora de exibir/imprimir
      onChange({ ...value, logotipo_url: filePath });
      toast({ title: "Sucesso", description: "Logo enviado com sucesso" });
    } catch (error) {
      console.error("Erro ao enviar logo:", error);
      toast({ title: "Erro", description: "Não foi possível enviar o logo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    onChange({ ...value, logotipo_url: null });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Identidade Visual
        </CardTitle>
        <CardDescription>
          Personalize a aparência dos documentos impressos (receituários, atestados, contratos) com a identidade da sua clínica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Logotipo da Clínica</Label>
          <div className="flex items-center gap-4">
            {value.logotipo_url ? (
              <div className="relative w-20 h-20 border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                <SignedClinicLogo
                  src={value.logotipo_url}
                  alt="Logo da clínica"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/20">
                <Image className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploading ? "Enviando..." : "Enviar Logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </Button>
                {value.logotipo_url && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG ou JPG, máx. 2MB. Fundo transparente recomendado.</p>
            </div>
          </div>
        </div>

        {/* Cor Primária */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Cor Primária dos Documentos</Label>
          <p className="text-sm text-muted-foreground">
            Aplicada nos títulos, linhas decorativas e destaques dos PDFs.
          </p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange({ ...value, cor_primaria: preset.value })}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  value.cor_primaria === preset.value ? "border-foreground scale-110 ring-2 ring-offset-2 ring-primary" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: preset.value }}
                title={preset.label}
              />
            ))}
            <div className="flex items-center gap-2 ml-2">
              <Label className="text-sm text-muted-foreground">Personalizada:</Label>
              <input
                type="color"
                value={value.cor_primaria}
                onChange={(e) => onChange({ ...value, cor_primaria: e.target.value })}
                className="w-10 h-10 rounded-lg border cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Layout do Cabeçalho */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Layout do Cabeçalho</Label>
          <Select
            value={value.layout_cabecalho}
            onValueChange={(v) => onChange({ ...value, layout_cabecalho: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYOUT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Marca d'água */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-base font-medium">Logo em Marca d'Água</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Exibe o logotipo com baixa opacidade ao fundo de cada página do documento.
            </p>
          </div>
          <Switch
            checked={value.marca_dagua_ativa}
            onCheckedChange={(checked) => onChange({ ...value, marca_dagua_ativa: checked })}
          />
        </div>

        {/* Redes Sociais */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Redes Sociais</Label>
          <p className="text-sm text-muted-foreground">
            Exibidas no rodapé dos documentos impressos para maior conexão com os pacientes.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2 text-sm">
                <Instagram className="h-4 w-4" /> Instagram
              </Label>
              <Input
                id="instagram"
                value={value.instagram}
                onChange={(e) => onChange({ ...value, instagram: e.target.value })}
                placeholder="@suaclinica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4" /> Website
              </Label>
              <Input
                id="website"
                value={value.website}
                onChange={(e) => onChange({ ...value, website: e.target.value })}
                placeholder="www.suaclinica.com.br"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
