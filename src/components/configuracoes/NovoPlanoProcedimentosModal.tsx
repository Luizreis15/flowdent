import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Percent, Plus, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface NovoPlanoProcedimentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  onSuccess: () => void;
}

export const NovoPlanoProcedimentosModal = ({
  open,
  onOpenChange,
  clinicaId,
  onSuccess,
}: NovoPlanoProcedimentosModalProps) => {
  const [nome, setNome] = useState("");
  const [percentualAjuste, setPercentualAjuste] = useState("0");
  const [isPadrao, setIsPadrao] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [tipoImportacao, setTipoImportacao] = useState<"base" | "arquivo">("base");
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

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error("Digite o nome do plano");
      return;
    }

    if (tipoImportacao === "arquivo" && !file) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    setLoading(true);

    try {
      // Criar o plano
      const { data: novoPlano, error: planoError } = await supabase
        .from("planos_procedimentos")
        .insert({
          clinica_id: clinicaId,
          nome: nome.trim(),
          percentual_ajuste: tipoImportacao === "base" ? parseFloat(percentualAjuste) : 0,
          is_padrao: isPadrao,
          ativo: ativo,
        })
        .select()
        .single();

      if (planoError) throw planoError;

      let totalProcedimentos = 0;

      if (tipoImportacao === "base") {
        // Usar tabela base com ajuste percentual
        const { data: procedimentos, error: procError } = await supabase
          .from("procedimentos")
          .select("*");

        if (procError) throw procError;

        const ajuste = parseFloat(percentualAjuste) / 100;
        const itens = procedimentos.map(proc => ({
          plano_id: novoPlano.id,
          procedimento_id: proc.id,
          valor_customizado: proc.valor * (1 + ajuste),
        }));

        const { error: itensError } = await supabase
          .from("planos_procedimentos_itens")
          .insert(itens);

        if (itensError) throw itensError;
        
        totalProcedimentos = procedimentos.length;
      } else {
        // Importar de arquivo
        const procedimentosArquivo = await parseFile(file!);

        // Inserir ou buscar procedimentos na tabela base
        for (const proc of procedimentosArquivo) {
          let procedimentoId: string;

          const { data: existing } = await supabase
            .from("procedimentos")
            .select("id")
            .eq("codigo_sistema", proc.codigo_sistema)
            .maybeSingle();

          if (existing) {
            procedimentoId = existing.id;
          } else {
            const { data: novo, error: novoError } = await supabase
              .from("procedimentos")
              .insert({
                codigo_sistema: proc.codigo_sistema,
                especialidade: proc.especialidade,
                descricao: proc.descricao,
                valor: proc.valor,
              })
              .select("id")
              .single();

            if (novoError) throw novoError;
            procedimentoId = novo.id;
          }

          // Adicionar ao plano
          await supabase
            .from("planos_procedimentos_itens")
            .insert({
              plano_id: novoPlano.id,
              procedimento_id: procedimentoId,
              valor_customizado: proc.valor,
            });
        }

        totalProcedimentos = procedimentosArquivo.length;
      }

      toast.success(`Plano "${nome}" criado com sucesso com ${totalProcedimentos} procedimentos`);
      onSuccess();
      onOpenChange(false);
      setNome("");
      setPercentualAjuste("0");
      setIsPadrao(false);
      setAtivo(true);
      setFile(null);
      setTipoImportacao("base");
    } catch (error: any) {
      console.error("Erro ao criar plano:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("Já existe um plano com este nome");
      } else {
        toast.error("Erro ao criar plano: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo plano personalizado</DialogTitle>
          <DialogDescription>
            Crie um plano baseado na tabela de procedimentos base
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do plano *</Label>
            <Input
              id="nome"
              placeholder="Ex: Plano Particular, Convênio XYZ"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <Label>Origem dos procedimentos</Label>
            <RadioGroup value={tipoImportacao} onValueChange={(v: any) => setTipoImportacao(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="base" id="base" />
                <Label htmlFor="base" className="font-normal cursor-pointer">
                  Usar tabela base com ajuste percentual
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="arquivo" id="arquivo" />
                <Label htmlFor="arquivo" className="font-normal cursor-pointer">
                  Importar arquivo específico (CSV/XLSX)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {tipoImportacao === "base" ? (
            <div className="space-y-2">
              <Label htmlFor="ajuste">Ajuste percentual (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ajuste"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={percentualAjuste}
                  onChange={(e) => setPercentualAjuste(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use valores positivos para aumentar (+20) ou negativos para diminuir (-10)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo de procedimentos *</Label>
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
              <p className="text-xs text-muted-foreground">
                Formato: Segmento, Procedimento, Valor (código gerado automaticamente)
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="padrao" className="cursor-pointer">Definir como padrão</Label>
              <p className="text-xs text-muted-foreground">
                Este plano será usado automaticamente nos orçamentos
              </p>
            </div>
            <Switch
              id="padrao"
              checked={isPadrao}
              onCheckedChange={setIsPadrao}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="ativo" className="cursor-pointer">Plano ativo</Label>
              <p className="text-xs text-muted-foreground">
                Planos inativos não aparecem nas seleções
              </p>
            </div>
            <Switch
              id="ativo"
              checked={ativo}
              onCheckedChange={setAtivo}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {loading ? "Criando..." : "Criar Plano"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
