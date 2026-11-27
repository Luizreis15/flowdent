import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ImportPacientesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PatientData {
  full_name: string;
  phone: string;
  email?: string;
  cpf?: string;
  birth_date?: string;
  gender?: "masculino" | "feminino";
  address?: string;
  how_found?: string;
  notes?: string;
  rg?: string;
  is_foreign?: boolean;
}

interface ParsedPatient extends PatientData {
  _validationStatus: "valid" | "warning" | "error";
  _validationMessages: string[];
  _originalRow: number;
}

export const ImportPacientesModal = ({
  open,
  onOpenChange,
  onSuccess,
}: ImportPacientesModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [parsedData, setParsedData] = useState<ParsedPatient[]>([]);
  const [ignoreNoPhone, setIgnoreNoPhone] = useState(true);
  const [ignoreDeleted, setIgnoreDeleted] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importLog, setImportLog] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        setFile(selectedFile);
      } else {
        toast.error("Formato inválido. Use CSV ou XLSX");
      }
    }
  };

  const safeString = (value: any): string => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const normalizeCPF = (cpf: string): string => {
    return cpf.replace(/\D/g, "").slice(0, 11);
  };

  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    return digits;
  };

  const parseDate = (dateValue: any): string | undefined => {
    if (!dateValue) return undefined;
    
    try {
      // Handle Excel serial dates
      if (typeof dateValue === "number") {
        const excelEpoch = new Date(1900, 0, 1);
        const days = dateValue - 2; // Excel's date system starts at 1900-01-01 but has a bug (1900 was not a leap year)
        const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
        return date.toISOString().split("T")[0];
      }
      
      // Handle string dates
      if (typeof dateValue === "string") {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }
    
    return undefined;
  };

  const mapGender = (sex: string): "masculino" | "feminino" | undefined => {
    const normalized = sex?.toUpperCase();
    if (normalized === "M") return "masculino";
    if (normalized === "F") return "feminino";
    return undefined;
  };

  const validatePatient = (patient: PatientData): { status: "valid" | "warning" | "error"; messages: string[] } => {
    const messages: string[] = [];
    let status: "valid" | "warning" | "error" = "valid";

    // Required fields
    if (!patient.full_name || patient.full_name.length < 3) {
      messages.push("Nome inválido");
      status = "error";
    }

    if (!patient.phone || patient.phone.length < 10) {
      messages.push("Telefone obrigatório");
      status = "error";
    }

    // Optional but validated fields
    if (patient.cpf && patient.cpf.length !== 11) {
      messages.push("CPF inválido (deve ter 11 dígitos)");
      status = status === "error" ? "error" : "warning";
    }

    if (patient.email && !patient.email.includes("@")) {
      messages.push("Email inválido");
      status = status === "error" ? "error" : "warning";
    }

    if (messages.length === 0) {
      messages.push("OK");
    }

    return { status, messages };
  };

  const parseFile = async () => {
    // xlsx (~400 KB) carregado só ao ler a planilha
    const XLSX = await import("xlsx");
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      const patients: ParsedPatient[] = jsonData
        .map((row: any, index: number) => {
          try {
            // Skip deleted records
            if (ignoreDeleted && safeString(row.Deleted) === "X") {
              return null;
            }

            // Build address from components
            const addressParts = [
              safeString(row.Street),
              safeString(row.Number),
              safeString(row.Complement),
              safeString(row.Neighborhood),
              safeString(row.City),
              safeString(row.State)
            ].filter(Boolean);
            const address = addressParts.length > 0 ? addressParts.join(", ") : undefined;

            // Combine how_found fields
            const howFoundParts = [safeString(row.HowDidMeet), safeString(row.insurancePlanName)].filter(Boolean);
            const howFound = howFoundParts.length > 0 ? howFoundParts.join(" - ") : undefined;

            // Combine notes
            const notesParts = [safeString(row.Notes), safeString(row.OtherDocumentId)].filter(Boolean);
            const notes = notesParts.length > 0 ? notesParts.join(" | ") : undefined;

            const phone = normalizePhone(safeString(row.MobilePhone));
            
            // Skip if no phone and option is selected
            if (ignoreNoPhone && !phone) {
              return null;
            }

            const patient: PatientData = {
              full_name: safeString(row.Name),
              phone: phone,
              email: safeString(row.Email).toLowerCase() || undefined,
              cpf: row.DocumentId ? normalizeCPF(safeString(row.DocumentId)) : undefined,
              birth_date: parseDate(row.BirthDate),
              gender: mapGender(safeString(row.Sex)),
              address,
              how_found: howFound,
              notes,
              rg: safeString(row.OtherDocumentId) || undefined,
              is_foreign: false,
            };

            const validation = validatePatient(patient);

            return {
              ...patient,
              _validationStatus: validation.status,
              _validationMessages: validation.messages,
              _originalRow: index + 2, // +2 because Excel starts at 1 and has header
            } as ParsedPatient;
          } catch (rowError: any) {
            console.error(`Erro na linha ${index + 2}:`, rowError);
            return {
              full_name: `ERRO - Linha ${index + 2}`,
              phone: "",
              _validationStatus: "error" as const,
              _validationMessages: [`Erro ao processar: ${rowError.message}`],
              _originalRow: index + 2,
            } as ParsedPatient;
          }
        })
        .filter((p): p is ParsedPatient => p !== null);

      setParsedData(patients);
      setStep("preview");
      toast.success(`${patients.length} pacientes analisados`);
    } catch (error: any) {
      console.error("Erro ao analisar arquivo:", error);
      toast.error(`Erro ao analisar arquivo: ${error.message || "Formato inválido"}`);
    }
  };

  const handleImport = async () => {
    setStep("importing");
    setImporting(true);
    setProgress(0);
    setImportLog([]);

    try {
      // Get user's clinic_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", user.id)
        .single();

      if (!profile?.clinic_id) throw new Error("Clínica não encontrada");

      const validPatients = parsedData.filter(p => p._validationStatus !== "error");
      let inserted = 0;
      let updated = 0;
      let errors = 0;

      for (let i = 0; i < validPatients.length; i++) {
        const patient = validPatients[i];
        setProgress(((i + 1) / validPatients.length) * 100);

        try {
          // Check for existing patient by CPF or phone
          let existingQuery = supabase
            .from("patients")
            .select("id")
            .eq("clinic_id", profile.clinic_id);

          if (patient.cpf) {
            existingQuery = existingQuery.eq("cpf", patient.cpf);
          } else {
            existingQuery = existingQuery.eq("phone", patient.phone);
          }

          const { data: existing } = await existingQuery.maybeSingle();

          const patientData = {
            clinic_id: profile.clinic_id,
            full_name: patient.full_name,
            phone: patient.phone,
            email: patient.email || null,
            cpf: patient.cpf || null,
            birth_date: patient.birth_date || null,
            gender: patient.gender || null,
            address: patient.address || null,
            how_found: patient.how_found || null,
            notes: patient.notes || null,
            rg: patient.rg || null,
            is_foreign: patient.is_foreign || false,
          };

          if (existing) {
            // Update existing patient
            await supabase
              .from("patients")
              .update(patientData)
              .eq("id", existing.id);
            updated++;
            setImportLog(prev => [...prev, `✓ Atualizado: ${patient.full_name}`]);
          } else {
            // Insert new patient
            await supabase
              .from("patients")
              .insert(patientData);
            inserted++;
            setImportLog(prev => [...prev, `✓ Inserido: ${patient.full_name}`]);
          }
        } catch (error: any) {
          errors++;
          setImportLog(prev => [...prev, `✗ Erro: ${patient.full_name} - ${error.message}`]);
        }
      }

      toast.success(`Importação concluída: ${inserted} novos, ${updated} atualizados, ${errors} erros`);
      
      if (errors === 0) {
        onSuccess();
        onOpenChange(false);
        resetState();
      }
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar pacientes: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setStep("upload");
    setParsedData([]);
    setProgress(0);
    setImportLog([]);
  };

  const stats = {
    total: parsedData.length,
    valid: parsedData.filter(p => p._validationStatus === "valid").length,
    warning: parsedData.filter(p => p._validationStatus === "warning").length,
    error: parsedData.filter(p => p._validationStatus === "error").length,
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Pacientes</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV ou XLSX com os dados dos pacientes
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Formato esperado:</strong>
                <br />
                O arquivo deve conter colunas com os dados dos pacientes (Nome, Telefone, Email, CPF, Data de Nascimento, etc.)
                <br />
                Registros marcados como deletados serão ignorados automaticamente
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={parseFile}
                disabled={!file}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Analisar Arquivo
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </Card>
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Válidos</div>
                <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
              </Card>
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Avisos</div>
                <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
              </Card>
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Erros</div>
                <div className="text-2xl font-bold text-red-600">{stats.error}</div>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ignoreNoPhone"
                  checked={ignoreNoPhone}
                  onCheckedChange={(checked) => setIgnoreNoPhone(checked as boolean)}
                />
                <Label htmlFor="ignoreNoPhone" className="text-sm font-normal cursor-pointer">
                  Ignorar pacientes sem telefone
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ignoreDeleted"
                  checked={ignoreDeleted}
                  onCheckedChange={(checked) => setIgnoreDeleted(checked as boolean)}
                />
                <Label htmlFor="ignoreDeleted" className="text-sm font-normal cursor-pointer">
                  Ignorar pacientes marcados como deletados
                </Label>
              </div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 50).map((patient, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{patient._originalRow}</TableCell>
                      <TableCell className="font-medium">{patient.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{patient.phone || "-"}</TableCell>
                      <TableCell className="text-xs">{patient.email || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{patient.cpf || "-"}</TableCell>
                      <TableCell>
                        {patient._validationStatus === "valid" && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </Badge>
                        )}
                        {patient._validationStatus === "warning" && (
                          <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
                            <AlertTriangle className="h-3 w-3" />
                            Aviso
                          </Badge>
                        )}
                        {patient._validationStatus === "error" && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Erro
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedData.length > 50 && (
                <div className="p-2 text-center text-sm text-muted-foreground border-t">
                  Mostrando 50 de {parsedData.length} registros
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
              >
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={stats.valid + stats.warning === 0}
                className="gap-2"
              >
                Importar {stats.valid + stats.warning} Pacientes
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="border rounded-lg p-4 max-h-96 overflow-auto bg-muted/20">
              <div className="space-y-1 font-mono text-xs">
                {importLog.map((log, idx) => (
                  <div key={idx} className={log.startsWith("✓") ? "text-green-600" : "text-red-600"}>
                    {log}
                  </div>
                ))}
              </div>
            </div>

            {!importing && (
              <div className="flex gap-2 justify-end">
                <Button onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);
