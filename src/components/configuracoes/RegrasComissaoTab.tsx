import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { SeloAtivo } from "@/components/sistema/Selo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NovaRegraComissaoModal } from "./NovaRegraComissaoModal";
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
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";

interface CommissionRule {
  id: string;
  nome: string;
  profissional_id: string | null;
  procedure_id: string | null;
  tipo_calculo: string;
  percentual: number | null;
  valor_fixo: number | null;
  base_calculo: string;
  gatilho: string;
  minimo_garantido: number | null;
  teto: number | null;
  ativo: boolean;
  profissional?: { nome: string } | null;
  procedimento?: { descricao: string } | null;
}

interface RegrasComissaoTabProps {
  clinicId: string;
}

export const RegrasComissaoTab = ({ clinicId }: RegrasComissaoTabProps) => {
  const [regras, setRegras] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadRegras();
  }, [clinicId]);

  const loadRegras = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("commission_rules")
        .select(`
          *,
          profissional:profissionais(nome),
          procedimento:procedimentos(descricao)
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRegras(data || []);
    } catch (error) {
      console.error("Erro ao carregar regras:", error);
      toast.error("Erro ao carregar regras de comissão");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("commission_rules")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("Regra excluída com sucesso");
      loadRegras();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir regra");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleAtivo = async (rule: CommissionRule) => {
    try {
      const { error } = await supabase
        .from("commission_rules")
        .update({ ativo: !rule.ativo })
        .eq("id", rule.id);

      if (error) throw error;
      toast.success(rule.ativo ? "Regra desativada" : "Regra ativada");
      loadRegras();
    } catch (error) {
      toast.error("Erro ao atualizar regra");
    }
  };

  const formatCurrencyValue = (value: number | null) => {
    if (!value) return "—";
    return formatCurrency(value);
  };

  const getGatilhoLabel = (gatilho: string) => {
    const labels: Record<string, string> = {
      aprovacao: "Aprovação do Orçamento",
      conclusao: "Conclusão do Procedimento",
      recebimento: "Recebimento do Pagamento",
    };
    return labels[gatilho] || gatilho;
  };

  const getBaseLabel = (base: string) => {
    const labels: Record<string, string> = {
      bruto: "Valor Bruto",
      liquido: "Valor Líquido",
      recebido: "Valor Recebido",
    };
    return labels[base] || base;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-section text-foreground">Regras de comissão</h3>
          <p className="text-sm text-muted-foreground">
            Configure regras de comissionamento por profissional e/ou procedimento
          </p>
        </div>
        <Button onClick={() => { setEditingRule(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova regra
        </Button>
      </div>

      <FaixaIndicadores
        compacto
        itens={[
          { rotulo: "Regras ativas", valor: regras.filter((r) => r.ativo).length },
          { rotulo: "Por percentual", valor: regras.filter((r) => r.tipo_calculo === "percentual").length },
          { rotulo: "Valor fixo", valor: regras.filter((r) => r.tipo_calculo === "fixo").length },
        ]}
      />

      {/* Tabela de regras */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : regras.length === 0 ? (
            <EstadoVazio
              icone={FileText}
              titulo="Nenhuma regra cadastrada"
              descricao="Crie regras para automatizar o cálculo de comissões por profissional ou procedimento."
              acao={
                <Button size="sm" onClick={() => { setEditingRule(null); setShowModal(true); }}>
                  Nova regra
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Cálculo</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Gatilho</TableHead>
                  <TableHead>Limites</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((regra) => (
                  <TableRow key={regra.id} className={!regra.ativo ? "text-muted-foreground" : ""}>
                    <TableCell className="font-medium">{regra.nome}</TableCell>
                    <TableCell>
                      {regra.profissional?.nome || (
                        <span className="text-muted-foreground">Todos</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {regra.procedimento?.descricao || (
                        <span className="text-muted-foreground">Todos</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {regra.tipo_calculo === "percentual" ? (
                        <span className="text-sm font-medium tabular-nums">{regra.percentual}%</span>
                      ) : (
                        <span className="text-sm font-medium tabular-nums">{formatCurrency(regra.valor_fixo)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{getBaseLabel(regra.base_calculo)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{getGatilhoLabel(regra.gatilho)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {regra.minimo_garantido && (
                          <div>Mín: {formatCurrency(regra.minimo_garantido)}</div>
                        )}
                        {regra.teto && (
                          <div>Máx: {formatCurrency(regra.teto)}</div>
                        )}
                        {!regra.minimo_garantido && !regra.teto && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleAtivo(regra)}
                        title={regra.ativo ? "Desativar regra" : "Ativar regra"}
                        className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <SeloAtivo ativo={regra.ativo} />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingRule(regra); setShowModal(true); }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(regra.id)}
                        >
                          <Trash2 className="h-4 w-4 text-sinal-alerta" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de criação/edição */}
      <NovaRegraComissaoModal
        open={showModal}
        onOpenChange={setShowModal}
        clinicId={clinicId}
        rule={editingRule}
        onSuccess={() => {
          loadRegras();
          setShowModal(false);
          setEditingRule(null);
        }}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A regra será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
