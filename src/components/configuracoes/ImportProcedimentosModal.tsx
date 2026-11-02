import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportProcedimentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ImportProcedimentosModal = ({
  open,
  onOpenChange,
  onSuccess,
}: ImportProcedimentosModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "xlsx") {
        setFile(selectedFile);
      } else {
        toast.error("Formato inválido. Use CSV ou XLSX");
      }
    }
  };

  const generateSlug = (descricao: string, index: number) => {
    const slug = descricao
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 30);
    return `PROC-${slug}-${index + 1}`;
  };

  const parseFile = async (file: File): Promise<any[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      // Parse XLSX
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      return jsonData.map((row: any, idx: number) => {
        const normalizedRow: any = {};
        
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase().trim();
          if (lowerKey.includes("codigo") || lowerKey.includes("código")) {
            normalizedRow.codigo_sistema = String(row[key]).trim();
          } else if (lowerKey.includes("segmento") || lowerKey.includes("especialidade")) {
            normalizedRow.especialidade = String(row[key]).trim();
          } else if (lowerKey.includes("procedimento") || lowerKey.includes("descri") || lowerKey.includes("descrição")) {
            normalizedRow.descricao = String(row[key]).trim();
          } else if (lowerKey.includes("valor") || lowerKey.includes("preço") || lowerKey.includes("preco")) {
            const valorStr = String(row[key]).replace(/[^\d.,]/g, "").replace(",", ".");
            normalizedRow.valor = parseFloat(valorStr);
          }
        });

        // Gerar codigo_sistema se não existir
        if (!normalizedRow.codigo_sistema && normalizedRow.descricao) {
          normalizedRow.codigo_sistema = generateSlug(normalizedRow.descricao, idx);
        }

        return normalizedRow;
      }).filter(d => d.especialidade && d.descricao && !isNaN(d.valor));
    } else {
      // Parse CSV - detectar separador automaticamente
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      
      // Detectar separador
      const firstLine = lines[0];
      const separator = firstLine.includes(";") ? ";" : ",";
      
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
      
      const data = lines.slice(1).map((line, idx) => {
        const values = line.split(separator).map(v => v.trim());
        const obj: any = {};
        
        headers.forEach((header, i) => {
          const val = values[i];
          if (header.includes("codigo") || header.includes("código")) {
            obj.codigo_sistema = val;
          } else if (header.includes("segmento") || header.includes("especialidade")) {
            obj.especialidade = val;
          } else if (header.includes("procedimento") || header.includes("descri") || header.includes("descrição")) {
            obj.descricao = val;
          } else if (header.includes("valor") || header.includes("preço") || header.includes("preco")) {
            obj.valor = parseFloat(val?.replace(/[^\d.,]/g, "").replace(",", ".") || "0");
          }
        });
        
        // Gerar codigo_sistema se não existir
        if (!obj.codigo_sistema && obj.descricao) {
          obj.codigo_sistema = generateSlug(obj.descricao, idx);
        }
        
        return obj;
      });

      return data.filter(d => d.especialidade && d.descricao && !isNaN(d.valor));
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }

    setLoading(true);

    try {
      const procedimentos = await parseFile(file);

      if (procedimentos.length === 0) {
        toast.error("Nenhum procedimento válido encontrado no arquivo");
        setLoading(false);
        return;
      }

      // Validar formato
      const hasRequiredFields = procedimentos.every(
        p => p.codigo_sistema && p.especialidade && p.descricao && p.valor
      );

      if (!hasRequiredFields) {
        toast.error("Arquivo com formato inválido. Certifique-se de ter: codigo_sistema, especialidade, descricao, valor");
        setLoading(false);
        return;
      }

      // Inserir ou atualizar procedimentos (novos ficam vinculados à clínica do usuário;
      // procedimentos do catálogo do sistema só podem ser alterados por super admin)
      let inserted = 0;
      let updated = 0;
      let ignored = 0;

      for (const proc of procedimentos) {
        const { data: existing } = await supabase
          .from("procedimentos")
          .select("id")
          .eq("codigo_sistema", proc.codigo_sistema)
          .maybeSingle();

        if (existing) {
          const { data: updatedRows, error: updateError } = await supabase
            .from("procedimentos")
            .update({
              especialidade: proc.especialidade,
              descricao: proc.descricao,
              valor: proc.valor,
            })
            .eq("id", existing.id)
            .select("id");
          if (!updateError && updatedRows && updatedRows.length > 0) updated++;
          else ignored++;
        } else {
          const { error: insertError } = await supabase
            .from("procedimentos")
            .insert(proc);
          if (!insertError) inserted++;
          else ignored++;
        }
      }

      toast.success(
        `Importação concluída: ${inserted} novos, ${updated} atualizados` +
          (ignored > 0 ? `, ${ignored} ignorados (catálogo do sistema ou erro)` : "")
      );
      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar arquivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Tabela de Procedimentos</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV ou XLSX com os procedimentos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Formatos aceitos:</strong>
              <br />
              • Segmento, Procedimento, Valor (separador: vírgula ou ponto e vírgula)
              <br />
              • Código, Especialidade, Descrição, Valor
              <br />
              <span className="text-muted-foreground">O código será gerado automaticamente se não informado</span>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="file">Arquivo</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                disabled={loading}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {loading ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
