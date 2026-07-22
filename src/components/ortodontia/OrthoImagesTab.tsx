import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ImageIcon, Trash2, ZoomIn, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getSignedFileUrl, removePatientFiles, uploadPatientFile } from "@/lib/storage";
import { SignedFileImage } from "@/components/storage/SignedFileImage";

interface OrthoImagesTabProps {
  casoId: string;
  patientId: string;
}

const TIPO_IMAGEM_MAP: Record<string, string> = {
  frontal: "Frontal",
  perfil: "Perfil",
  sorriso: "Sorriso",
  intraoral_frontal: "Intraoral Frontal",
  intraoral_lateral_dir: "Intraoral Lateral Dir.",
  intraoral_lateral_esq: "Intraoral Lateral Esq.",
  intraoral_oclusal_sup: "Intraoral Oclusal Sup.",
  intraoral_oclusal_inf: "Intraoral Oclusal Inf.",
  panoramica: "Panorâmica",
  cefalometrica: "Cefalométrica",
  periapical: "Periapical",
  outro: "Outro",
};

const FASE_MAP: Record<string, { label: string; color: string }> = {
  inicial: { label: "Inicial", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  progresso: { label: "Progresso", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  final: { label: "Final", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  contencao: { label: "Contenção", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

export function OrthoImagesTab({ casoId, patientId }: OrthoImagesTabProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [filtroFase, setFiltroFase] = useState<string>("todas");
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [tipoImagem, setTipoImagem] = useState("frontal");
  const [fase, setFase] = useState("inicial");
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split("T")[0]);
  const [descricao, setDescricao] = useState("");

  const { data: images, refetch } = useQuery({
    queryKey: ["ortho-images", casoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ortho_images")
        .select("*")
        .eq("case_id", casoId)
        .order("data_registro", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${tipoImagem}.${ext}`;
      const storagePath = `${patientId}/ortodontia/${casoId}/${fileName}`;

      await uploadPatientFile(storagePath, file);

      const { data: userData } = await supabase.auth.getUser();

      const { error: dbError } = await supabase.from("ortho_images").insert({
        case_id: casoId,
        file_path: storagePath,
        tipo_imagem: tipoImagem,
        fase,
        data_registro: dataRegistro,
        descricao: descricao || null,
        uploaded_by: userData.user?.id,
      });

      if (dbError) throw dbError;

      toast.success("Imagem enviada com sucesso!");
      setUploadOpen(false);
      setFile(null);
      setDescricao("");
      refetch();
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const openLightbox = async (filePath: string) => {
    try {
      const url = await getSignedFileUrl(filePath);
      setViewImage(url);
    } catch {
      toast.error("Erro ao abrir imagem");
    }
  };

  const handleDelete = async (imageId: string, filePath: string) => {
    try {
      await removePatientFiles([filePath]);
    } catch {
      toast.error("Erro ao remover arquivo");
      return;
    }
    const { error: dbError } = await supabase.from("ortho_images").delete().eq("id", imageId);
    if (dbError) {
      toast.error("Erro ao remover registro");
    } else {
      toast.success("Imagem removida");
      refetch();
    }
  };

  const filtered = images?.filter((img) => filtroFase === "todas" || img.fase === filtroFase) || [];

  // Group by fase
  const grouped = filtered.reduce((acc: Record<string, any[]>, img) => {
    const key = img.fase;
    if (!acc[key]) acc[key] = [];
    acc[key].push(img);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between gap-3">
        <Select value={filtroFase} onValueChange={setFiltroFase}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as fases</SelectItem>
            <SelectItem value="inicial">Inicial</SelectItem>
            <SelectItem value="progresso">Progresso</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="contencao">Contenção</SelectItem>
          </SelectContent>
        </Select>

        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Enviar Imagem
        </Button>
      </div>

      {/* Images gallery */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <ImageIcon className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma imagem registrada</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([faseKey, imgs]) => {
          const faseInfo = FASE_MAP[faseKey] || { label: faseKey, color: "" };
          return (
            <div key={faseKey} className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${faseInfo.color}`}>{faseInfo.label}</span>
                <span className="text-muted-foreground text-xs">({imgs.length} imagens)</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {imgs.map((img: any) => (
                  <div key={img.id} className="group relative rounded-lg overflow-hidden border bg-muted aspect-square">
                    <SignedFileImage
                      path={img.file_path}
                      alt={TIPO_IMAGEM_MAP[img.tipo_imagem] || img.tipo_imagem}
                      className="w-full h-full object-cover"
                      fallback={<ImageIcon className="h-8 w-8 text-muted-foreground m-auto" />}
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => openLightbox(img.file_path)}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(img.id, img.file_path)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-2 py-1">
                      <p className="text-xs font-medium truncate">{TIPO_IMAGEM_MAP[img.tipo_imagem] || img.tipo_imagem}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(parseISO(img.data_registro), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Lightbox */}
      {viewImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setViewImage(null)}>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setViewImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img src={viewImage} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>
      )}

      {/* Upload modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Imagem Clínica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Imagem</Label>
                <Select value={tipoImagem} onValueChange={setTipoImagem}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_IMAGEM_MAP).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fase</Label>
                <Select value={fase} onValueChange={setFase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inicial">Inicial</SelectItem>
                    <SelectItem value="progresso">Progresso</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="contencao">Contenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data do Registro</Label>
              <Input type="date" value={dataRegistro} onChange={(e) => setDataRegistro(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Foto pré-colagem" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
