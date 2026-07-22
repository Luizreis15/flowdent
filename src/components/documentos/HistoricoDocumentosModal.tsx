import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Trash2, Eye, Loader2, Printer, FileSignature, Pencil, Save, FileDown } from "lucide-react";
import { generateDocumentoPDF, type DocumentoPDFData } from "@/utils/generateDocumentoPDF";
import { resolveClinicLogoUrl } from "@/lib/storage";

interface HistoricoDocumentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  documentType: string | null;
}

interface Document {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  professional_id: string | null;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  finalizado: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  assinado: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  finalizado: "Finalizado",
  assinado: "Assinado",
};

export const HistoricoDocumentosModal = ({
  open,
  onOpenChange,
  patientId,
  documentType,
}: HistoricoDocumentosModalProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && documentType) {
      loadDocuments();
    }
  }, [open, documentType, patientId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("patient_documents")
        .select("id, title, content, status, created_at, signed_at, professional_id")
        .eq("patient_id", patientId)
        .eq("document_type", documentType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar documentos:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Deseja realmente excluir este documento?")) return;
    try {
      const { error } = await supabase.from("patient_documents").delete().eq("id", docId);
      if (error) throw error;
      toast.success("Documento excluído com sucesso");
      loadDocuments();
    } catch (error: any) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento");
    }
  };

  const handleView = (doc: Document) => {
    setSelectedDoc(doc);
    setViewMode(true);
    setEditMode(false);
  };

  const handleEdit = (doc: Document) => {
    setSelectedDoc(doc);
    setViewMode(true);
    setEditMode(true);
    setEditedContent(doc.content);
    setEditedTitle(doc.title);
  };

  const handleEnterEditMode = () => {
    if (!selectedDoc) return;
    setEditMode(true);
    setEditedContent(selectedDoc.content);
    setEditedTitle(selectedDoc.title);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedContent("");
    setEditedTitle("");
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("patient_documents")
        .update({ title: editedTitle, content: editedContent })
        .eq("id", selectedDoc.id);

      if (error) throw error;

      const updatedDoc = { ...selectedDoc, title: editedTitle, content: editedContent };
      setSelectedDoc(updatedDoc);
      setEditMode(false);
      toast.success("Documento salvo com sucesso");
      loadDocuments();
    } catch (error: any) {
      console.error("Erro ao salvar documento:", error);
      toast.error("Erro ao salvar documento");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!selectedDoc) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("patient_documents")
        .update({ title: editedTitle, content: editedContent })
        .eq("id", selectedDoc.id);

      if (error) throw error;

      const updatedDoc = { ...selectedDoc, title: editedTitle, content: editedContent };
      setSelectedDoc(updatedDoc);
      setEditMode(false);
      toast.success("Documento salvo com sucesso");
      loadDocuments();
      handlePrintDoc(updatedDoc);
    } catch (error: any) {
      console.error("Erro ao salvar documento:", error);
      toast.error("Erro ao salvar documento");
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async (docId: string) => {
    try {
      const { error } = await supabase
        .from("patient_documents")
        .update({ status: "assinado", signed_at: new Date().toISOString() })
        .eq("id", docId);
      if (error) throw error;
      toast.success("Documento assinado com sucesso");
      loadDocuments();
    } catch (error: any) {
      console.error("Erro ao assinar documento:", error);
      toast.error("Erro ao assinar documento");
    }
  };

  const handlePrintDoc = (doc: Document) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const d = printWindow.document;
    d.open();
    // Skeleton sem dados do usuário — conteúdo vai via textContent (anti-XSS)
    d.write("<!DOCTYPE html><html><head></head><body></body></html>");
    d.close();

    d.title = doc.title;

    const style = d.createElement("style");
    style.textContent = `
      @media print {
        @page { margin: 2cm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        button { display: none; }
      }
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
        line-height: 1.6;
        color: #000;
        max-width: 800px;
        margin: 0 auto;
      }
      h1 {
        font-size: 24px;
        margin-bottom: 20px;
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
      }
      .content {
        white-space: pre-wrap;
        line-height: 1.8;
        font-size: 12pt;
      }
      .meta {
        color: #666;
        margin-bottom: 20px;
        font-size: 14px;
      }
      .signature-area {
        margin-top: 80px;
        text-align: center;
      }
      .signature-line {
        border-top: 1px solid #000;
        width: 300px;
        margin: 60px auto 10px;
      }
    `;
    d.head.appendChild(style);

    const h1 = d.createElement("h1");
    h1.textContent = doc.title;
    d.body.appendChild(h1);

    const meta = d.createElement("div");
    meta.className = "meta";
    meta.textContent = format(new Date(doc.created_at), "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });
    d.body.appendChild(meta);

    const content = d.createElement("div");
    content.className = "content";
    // textContent + white-space:pre-wrap: título/conteúdo (incl. Solicitação de Exame) nunca viram HTML
    content.textContent = doc.content;
    d.body.appendChild(content);

    const signature = d.createElement("div");
    signature.className = "signature-area";
    const line = d.createElement("div");
    line.className = "signature-line";
    const sigLabel = d.createElement("p");
    sigLabel.textContent = "Assinatura do Profissional";
    signature.appendChild(line);
    signature.appendChild(sigLabel);
    d.body.appendChild(signature);

    const script = d.createElement("script");
    script.textContent =
      "window.onload = function() { setTimeout(function() { window.print(); }, 250); };";
    d.body.appendChild(script);
  };

  const handleGeneratePDF = async (doc: Document) => {
    try {
      // Load clinic and professional data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Usuário não autenticado"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.clinic_id) { toast.error("Clínica não encontrada"); return; }

      const profQuery = doc.professional_id
        ? supabase.from("profissionais").select("nome, cro, especialidade").eq("id", doc.professional_id).maybeSingle()
        : user.email
          ? supabase.from("profissionais").select("nome, cro, especialidade").ilike("email", user.email).maybeSingle()
          : Promise.resolve({ data: null });

      const [clinicResult, configResult, profResult] = await Promise.all([
        supabase.from("clinicas").select("*").eq("id", profile.clinic_id).maybeSingle(),
        supabase.from("configuracoes_clinica").select("logotipo_url, whatsapp, email_contato, cor_primaria, layout_cabecalho, marca_dagua_ativa, instagram, website").eq("clinica_id", profile.clinic_id).maybeSingle(),
        profQuery,
      ]);

      const clinic = clinicResult.data;
      const config = configResult.data;
      const prof = profResult.data;

      const isAtestado = doc.title.toLowerCase().includes("atestado");
      const isContrato = documentType === "contrato" || doc.title.toLowerCase().includes("contrato");
      const isSolicitacaoExame = documentType === "solicitacao_exame" || doc.title.toLowerCase().includes("solicitação de exame");
      const address = clinic?.address as any;
      const addressStr = address?.rua
        ? `${address.rua}, ${address.numero || "S/N"} - ${address.cidade || ""} / ${address.estado || ""}`
        : "";
      const clinicCity = address?.cidade || "";

      const pdfData: DocumentoPDFData = {
        tipo: isContrato ? "contrato" : isAtestado ? "atestado" : isSolicitacaoExame ? "solicitacao_exame" : "receituario",
        title: doc.title,
        content: doc.content,
        clinicName: clinic?.nome || "Clínica",
        clinicCnpj: clinic?.cnpj || undefined,
        clinicPhone: clinic?.telefone || undefined,
        clinicAddress: addressStr || undefined,
        clinicEmail: (config as any)?.email_contato || undefined,
        clinicWhatsapp: (config as any)?.whatsapp || undefined,
        clinicLogoUrl: await resolveClinicLogoUrl((config as any)?.logotipo_url),
        clinicCity: clinicCity || undefined,
        corPrimaria: (config as any)?.cor_primaria || undefined,
        layoutCabecalho: (config as any)?.layout_cabecalho || undefined,
        marcaDaguaAtiva: (config as any)?.marca_dagua_ativa ?? undefined,
        instagram: (config as any)?.instagram || undefined,
        website: (config as any)?.website || undefined,
        professionalName: prof?.nome || undefined,
        professionalCro: prof?.cro || undefined,
        professionalEspecialidade: prof?.especialidade || undefined,
        documentId: doc.id,
        createdAt: doc.created_at,
      };

      await generateDocumentoPDF(pdfData);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  if (viewMode && selectedDoc) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setViewMode(false);
          setSelectedDoc(null);
          setEditMode(false);
        }
        onOpenChange(isOpen);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              {editMode ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-semibold"
                />
              ) : (
                <DialogTitle>{selectedDoc.title}</DialogTitle>
              )}
              <Badge className={statusColors[selectedDoc.status]}>
                {statusLabels[selectedDoc.status]}
              </Badge>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[70vh] space-y-4 px-1">
            <div className="text-sm text-muted-foreground">
              Criado em {format(new Date(selectedDoc.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </div>

            {editMode ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                style={{ lineHeight: '1.8' }}
              />
            ) : (
              <div className="whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                {selectedDoc.content}
              </div>
            )}

            {selectedDoc.signed_at && (
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                Assinado em {format(new Date(selectedDoc.signed_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {editMode ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
                <Button variant="secondary" onClick={handleSaveAndPrint} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                  Salvar e Imprimir
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setViewMode(false); setSelectedDoc(null); }}>
                  Voltar
                </Button>
                <Button variant="outline" onClick={handleEnterEditMode}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" onClick={() => handlePrintDoc(selectedDoc)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button onClick={() => handleGeneratePDF(selectedDoc)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF Premium
                </Button>
                {selectedDoc.status !== "assinado" && (
                  <Button onClick={() => handleSign(selectedDoc.id)}>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Assinar Documento
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Documentos</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] space-y-3 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum documento encontrado</p>
            </div>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold truncate">{doc.title}</h4>
                        <Badge className={statusColors[doc.status]}>
                          {statusLabels[doc.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Criado em {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      {doc.signed_at && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Assinado em {format(new Date(doc.signed_at), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleView(doc)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(doc)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePrintDoc(doc)} title="Imprimir">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="default" onClick={() => handleGeneratePDF(doc)} title="PDF Premium">
                        <FileDown className="h-4 w-4" />
                      </Button>
                      {doc.status !== "assinado" && (
                        <Button size="sm" variant="outline" onClick={() => handleSign(doc.id)} title="Assinar">
                          <FileSignature className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDelete(doc.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
