import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileImage, FileText, Trash2, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  downloadPatientFile,
  getSignedFileUrl,
  removePatientFiles,
  uploadPatientFile,
} from "@/lib/storage";
import { SignedFileImage } from "@/components/storage/SignedFileImage";

interface PatientFile {
  id: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface ImagensTabProps {
  patientId: string;
}

export default function ImagensTab({ patientId }: ImagensTabProps) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [patientId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("patient_files")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Erro ao carregar arquivos:", error);
      toast.error("Erro ao carregar arquivos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado. Use JPG, PNG, WEBP ou PDF.");
      return;
    }

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 10MB");
      return;
    }

    setSelectedFile(file);
    setFileName(file.name.split(".")[0]); // Nome sem extensão
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileName.trim()) {
      toast.error("Selecione um arquivo e dê um nome");
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Upload do arquivo para o storage
      const fileExtension = selectedFile.name.split(".").pop();
      const filePath = `${patientId}/${Date.now()}-${fileName}.${fileExtension}`;

      await uploadPatientFile(filePath, selectedFile);

      // Salvar metadados no banco
      const { error: dbError } = await supabase.from("patient_files").insert({
        patient_id: patientId,
        file_name: fileName,
        original_name: selectedFile.name,
        file_path: filePath,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        uploaded_by: userData.user.id,
      });

      if (dbError) throw dbError;

      toast.success("Arquivo enviado com sucesso!");
      setShowUploadModal(false);
      setSelectedFile(null);
      setFileName("");
      loadFiles();
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file: PatientFile) => {
    if (!confirm(`Deseja realmente excluir "${file.file_name}"?`)) return;

    try {
      await removePatientFiles([file.file_path]);

      // Deletar do banco
      const { error: dbError } = await supabase
        .from("patient_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      toast.success("Arquivo excluído com sucesso!");
      loadFiles();
    } catch (error) {
      console.error("Erro ao excluir arquivo:", error);
      toast.error("Erro ao excluir arquivo");
    }
  };

  const handleDownload = async (file: PatientFile) => {
    try {
      const data = await downloadPatientFile(file.file_path);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handlePreview = async (file: PatientFile) => {
    try {
      const signed = await getSignedFileUrl(file.file_path);
      setPreviewUrl(signed);
    } catch (error) {
      console.error("Erro ao visualizar arquivo:", error);
      toast.error("Erro ao visualizar arquivo");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Imagens e Documentos</h2>
          <p className="text-muted-foreground">
            Fotos, radiografias e documentos do paciente
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Enviar Arquivo
        </Button>
      </div>

      {/* Lista de Arquivos */}
      {files.length === 0 ? (
        <Card className="p-12 text-center">
          <FileImage className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum arquivo</h3>
          <p className="text-muted-foreground mb-6">
            Envie imagens ou PDFs para começar
          </p>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Enviar Primeiro Arquivo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {file.file_type.startsWith("image/") ? (
                  <SignedFileImage
                    path={file.file_path}
                    alt={file.file_name}
                    className="w-full h-full object-cover"
                    fallback={<FileImage className="h-16 w-16 text-muted-foreground" />}
                  />
                ) : (
                  <FileText className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate mb-1">{file.file_name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {formatFileSize(file.file_size)} •{" "}
                  {format(new Date(file.created_at), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </p>
                <div className="flex gap-2">
                  {file.file_type.startsWith("image/") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(file)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(file)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Arquivo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Arquivo (JPG, PNG, WEBP ou PDF)</Label>
              <Input
                id="file"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFile.name} - {formatFileSize(selectedFile.size)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="fileName">Nome do Arquivo *</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Ex: Radiografia Panorâmica"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !fileName.trim() || uploading}
            >
              {uploading ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Preview */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Visualizar Imagem</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto">
              <img src={previewUrl} alt="Preview" className="w-full" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
