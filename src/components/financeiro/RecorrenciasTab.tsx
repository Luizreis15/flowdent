import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { separarMoeda } from "@/lib/moeda";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Repeat, Calendar, Trash2} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";

interface Recurrence {
  id: string;
  descricao: string;
  tipo: string;
  frequencia: string;
  valor: number;
  dia_vencimento: number | null;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  proxima_geracao: string | null;
  ultima_geracao: string | null;
  supplier?: {
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  expense_item?: {
    nome: string;
  } | null;
}

interface RecorrenciasTabProps {
  clinicId: string;
}

export const RecorrenciasTab = ({ clinicId }: RecorrenciasTabProps) => {
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadRecurrences();
  }, [clinicId]);

  const loadRecurrences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("financial_recurrences")
        .select(`
          *,
          supplier:suppliers(razao_social, nome_fantasia),
          expense_item:expense_items(nome)
        `)
        .eq("clinic_id", clinicId)
        .order("descricao");

      if (error) throw error;
      setRecurrences((data || []) as Recurrence[]);
    } catch (error) {
      console.error("Erro ao carregar recorrências:", error);
      toast.error("Erro ao carregar recorrências");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("financial_recurrences")
        .update({ ativo: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentStatus ? "Recorrência pausada" : "Recorrência ativada");
      loadRecurrences();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from("financial_recurrences")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("Recorrência excluída");
      setDeleteId(null);
      loadRecurrences();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir recorrência");
    }
  };


  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: "Semanal",
      biweekly: "Quinzenal",
      monthly: "Mensal",
      yearly: "Anual",
    };
    return labels[freq] || freq;
  };

  const getSupplierName = (rec: Recurrence) => {
    if (!rec.supplier) return "-";
    return rec.supplier.nome_fantasia || rec.supplier.razao_social;
  };

  // Summary calculations
  const totalPagar = recurrences
    .filter(r => r.tipo === "pagar" && r.ativo)
    .reduce((sum, r) => sum + r.valor, 0);
  
  const totalReceber = recurrences
    .filter(r => r.tipo === "receber" && r.ativo)
    .reduce((sum, r) => sum + r.valor, 0);

  const activeCount = recurrences.filter(r => r.ativo).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <FaixaIndicadores
        itens={[
          { rotulo: "Recorrências ativas", valor: activeCount },
          { rotulo: "A pagar (mensal)", ...separarMoeda(formatCurrency(totalPagar)) },
          { rotulo: "A receber (mensal)", ...separarMoeda(formatCurrency(totalReceber)) },
        ]}
      />

      {/* Table */}
      <div className="border rounded-lg">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : recurrences.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block p-4 bg-muted rounded-lg mb-4">
              <Repeat className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Nenhuma recorrência</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie uma despesa recorrente para vê-la aqui
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="lg:hidden divide-y">
              {recurrences.map((rec) => (
                <div key={rec.id} className={`p-4 space-y-3 ${!rec.ativo ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{rec.descricao}</p>
                      <p className="text-sm text-muted-foreground">{getSupplierName(rec)}</p>
                    </div>
                    <Badge variant={rec.tipo === "pagar" ? "destructive" : "default"}>
                      {rec.tipo === "pagar" ? "Pagar" : "Receber"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{getFrequencyLabel(rec.frequencia)}</span>
                      {rec.dia_vencimento && (
                        <span className="text-muted-foreground">• Dia {rec.dia_vencimento}</span>
                      )}
                    </div>
                    <span className={`font-bold ${rec.tipo === "pagar" ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(rec.valor)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rec.ativo}
                        onCheckedChange={() => toggleStatus(rec.id, rec.ativo)}
                      />
                      <span className="text-sm">{rec.ativo ? "Ativa" : "Pausada"}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteId(rec.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <Table className="hidden lg:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurrences.map((rec) => (
                  <TableRow key={rec.id} className={!rec.ativo ? "opacity-60" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rec.descricao}</p>
                        {rec.expense_item && (
                          <p className="text-xs text-muted-foreground">{rec.expense_item.nome}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rec.tipo === "pagar" ? "destructive" : "default"}>
                        {rec.tipo === "pagar" ? "Pagar" : "Receber"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getFrequencyLabel(rec.frequencia)}</TableCell>
                    <TableCell>{rec.dia_vencimento || "-"}</TableCell>
                    <TableCell>{getSupplierName(rec)}</TableCell>
                    <TableCell className={`text-right font-medium ${rec.tipo === "pagar" ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(rec.valor)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rec.ativo}
                          onCheckedChange={() => toggleStatus(rec.id, rec.ativo)}
                        />
                        <span className="text-sm">{rec.ativo ? "Ativa" : "Pausada"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteId(rec.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os lançamentos já gerados não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
