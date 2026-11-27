import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, FileSpreadsheet, Check, AlertTriangle, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface UploadPlanilhaLabModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  supplierId: string;
  supplierName: string;
  onSuccess?: () => void;
}

interface PriceRow {
  nome_servico: string;
  codigo_servico?: string;
  material?: string;
  cor?: string;
  valor: number;
  prazo_dias?: number;
}

export function UploadPlanilhaLabModal({
  open,
  onOpenChange,
  clinicId,
  supplierId,
  supplierName,
  onSuccess,
}: UploadPlanilhaLabModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedData, setParsedData] = useState<PriceRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // xlsx (~400 KB) carregado só ao ler a planilha
    const XLSX = await import("xlsx");
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar extensão
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext || "")) {
      toast.error("Selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    setFile(selectedFile);
    setParsedData([]);
    setParseError(null);

    // Parse do arquivo
    try {
      setParsing(true);
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      
      // Pegar primeira planilha
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        setParseError("A planilha precisa ter pelo menos um cabeçalho e uma linha de dados");
        return;
      }

      // Identificar colunas pelo cabeçalho
      const header = jsonData[0].map((h: any) => String(h || "").toLowerCase().trim());
      
      // Mapeamento flexível de colunas
      const colMap = {
        nome_servico: findColumnIndex(header, ["nome", "servico", "serviço", "descricao", "descrição", "item", "produto"]),
        codigo_servico: findColumnIndex(header, ["codigo", "código", "cod", "ref", "referencia"]),
        material: findColumnIndex(header, ["material", "tipo"]),
        cor: findColumnIndex(header, ["cor", "tonalidade"]),
        valor: findColumnIndex(header, ["valor", "preco", "preço", "unitario", "unitário", "vl"]),
        prazo_dias: findColumnIndex(header, ["prazo", "dias", "entrega"]),
      };

      if (colMap.nome_servico === -1) {
        setParseError("Não foi possível identificar a coluna de nome/descrição do serviço");
        return;
      }

      if (colMap.valor === -1) {
        setParseError("Não foi possível identificar a coluna de valor/preço");
        return;
      }

      // Processar linhas de dados
      const rows: PriceRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const nome = String(row[colMap.nome_servico] || "").trim();
        const valorRaw = row[colMap.valor];
        
        if (!nome) continue;

        // Converter valor
        let valor = 0;
        if (typeof valorRaw === "number") {
          valor = valorRaw;
        } else if (typeof valorRaw === "string") {
          // Limpar formatação brasileira
          valor = parseFloat(valorRaw.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
        }

        if (valor <= 0) continue;

        rows.push({
          nome_servico: nome,
          codigo_servico: colMap.codigo_servico !== -1 ? String(row[colMap.codigo_servico] || "").trim() || undefined : undefined,
          material: colMap.material !== -1 ? String(row[colMap.material] || "").trim() || undefined : undefined,
          cor: colMap.cor !== -1 ? String(row[colMap.cor] || "").trim() || undefined : undefined,
          valor,
          prazo_dias: colMap.prazo_dias !== -1 ? parseInt(String(row[colMap.prazo_dias])) || undefined : undefined,
        });
      }

      if (rows.length === 0) {
        setParseError("Nenhum item válido encontrado na planilha");
        return;
      }

      setParsedData(rows);
      toast.success(`${rows.length} itens encontrados na planilha`);
    } catch (error) {
      console.error("Erro ao processar planilha:", error);
      setParseError("Erro ao processar o arquivo. Verifique se é um Excel válido.");
    } finally {
      setParsing(false);
    }
  };

  const findColumnIndex = (header: string[], patterns: string[]): number => {
    for (let i = 0; i < header.length; i++) {
      const col = header[i];
      for (const pattern of patterns) {
        if (col.includes(pattern)) {
          return i;
        }
      }
    }
    return -1;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    try {
      setSaving(true);

      // Primeiro, desativar todos os preços antigos deste fornecedor
      await supabase
        .from("lab_price_table")
        .update({ ativo: false })
        .eq("supplier_id", supplierId)
        .eq("clinic_id", clinicId);

      // Inserir novos preços
      const toInsert = parsedData.map((row) => ({
        clinic_id: clinicId,
        supplier_id: supplierId,
        nome_servico: row.nome_servico,
        codigo_servico: row.codigo_servico || null,
        material: row.material || null,
        cor: row.cor || null,
        valor: row.valor,
        prazo_dias: row.prazo_dias || 7,
        ativo: true,
      }));

      const { error } = await supabase.from("lab_price_table").insert(toInsert);

      if (error) throw error;

      toast.success(`${parsedData.length} serviços importados com sucesso!`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar planilha");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setParseError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar tabela de preços
          </DialogTitle>
          <DialogDescription>
            Fornecedor: <strong>{supplierName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instruções */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Formato esperado da planilha:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Primeira linha deve conter o cabeçalho</li>
                <li>Colunas obrigatórias: Nome/Descrição e Valor/Preço</li>
                <li>Colunas opcionais: Código, Material, Cor, Prazo (dias)</li>
                <li>O sistema tentará identificar as colunas automaticamente</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParsedData([]);
                    setParseError(null);
                  }}
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <Label htmlFor="excel-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  {parsing ? (
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">
                      Arquivos .xlsx ou .xls
                    </p>
                  </div>
                </div>
              </Label>
            )}
            <Input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
              disabled={parsing}
            />
          </div>

          {/* Erro */}
          {parseError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Preview dos dados */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 text-sinal-ok" />
                  {parsedData.length} itens prontos para importar
                </h3>
              </div>

              <div className="border rounded-lg max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {row.nome_servico}
                        </TableCell>
                        <TableCell>{row.codigo_servico || "—"}</TableCell>
                        <TableCell>{row.material || "—"}</TableCell>
                        <TableCell>{row.cor || "—"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(row.valor)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.prazo_dias ? `${row.prazo_dias}d` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {parsedData.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  Exibindo 50 de {parsedData.length} itens
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={saving || parsedData.length === 0}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar {parsedData.length} Itens
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
