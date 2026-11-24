import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FechamentoComissoesModalProps {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  provisao: any | null;
  mesCompetencia: string;
}

export const FechamentoComissoesModal = ({
  open,
  onClose,
  clinicId,
  provisao,
  mesCompetencia,
}: FechamentoComissoesModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [producoes, setProducoes] = useState<any[]>([]);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (open) {
      if (provisao) {
        loadProducaoProvisao();
      } else {
        // Modal para criar nova provisão
        setObservacoes("");
      }
    }
  }, [open, provisao]);

  const loadProducaoProvisao = async () => {
    try {
      setLoading(true);
      // Carregar eventos de produção relacionados
      const competenciaDate = new Date(provisao.competencia);
      const inicioMes = new Date(competenciaDate.getFullYear(), competenciaDate.getMonth(), 1);
      const fimMes = new Date(competenciaDate.getFullYear(), competenciaDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from("producao_eventos")
        .select("*, paciente:patients(full_name)")
        .eq("profissional_id", provisao.profissional_id)
        .gte("data_execucao", inicioMes.toISOString().split("T")[0])
        .lte("data_execucao", fimMes.toISOString().split("T")[0])
        .order("data_execucao");

      if (error) throw error;
      setProducoes(data || []);
      setObservacoes(provisao.observacoes || "");
    } catch (error: any) {
      console.error("Erro ao carregar produção:", error);
      toast.error("Erro ao carregar dados de produção");
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async () => {
    if (!provisao) return;

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calcular retenções
      const valorDevido = parseFloat(provisao.valor_devido || 0);
      const valorInss = provisao.valor_inss || 0;
      const valorIss = provisao.valor_iss || 0;
      const valorIrrf = provisao.valor_irrf || 0;
      const valorLiquidoPagar = valorDevido - valorInss - valorIss - valorIrrf;

      const { error } = await supabase
        .from("comissoes_provisoes")
        .update({
          status: "aprovado",
          aprovado_por: user.id,
          aprovado_em: new Date().toISOString(),
          observacoes,
          valor_liquido_pagar: valorLiquidoPagar,
        })
        .eq("id", provisao.id);

      if (error) throw error;

      toast.success("Comissão aprovada com sucesso");
      onClose();
    } catch (error: any) {
      console.error("Erro ao aprovar:", error);
      toast.error("Erro ao aprovar comissão: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePagar = async () => {
    if (!provisao) return;

    try {
      setSaving(true);

      // Criar transação financeira
      const { data: transaction, error: transError } = await supabase
        .from("financial_transactions")
        .insert({
          clinic_id: clinicId,
          type: "despesa",
          date: new Date().toISOString().split("T")[0],
          value: parseFloat(provisao.valor_liquido_pagar || provisao.valor_devido),
          category: "Comissões",
          reference: `Comissão - ${provisao.profissional?.nome} - ${new Date(provisao.competencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
        })
        .select()
        .single();

      if (transError) throw transError;

      // Atualizar provisão
      const { error: provError } = await supabase
        .from("comissoes_provisoes")
        .update({
          status: "pago",
          financial_transaction_id: transaction.id,
        })
        .eq("id", provisao.id);

      if (provError) throw provError;

      toast.success("Pagamento registrado com sucesso");
      onClose();
    } catch (error: any) {
      console.error("Erro ao pagar:", error);
      toast.error("Erro ao registrar pagamento: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {provisao ? "Detalhes da Comissão" : "Fechar Comissões do Período"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {provisao && (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Profissional</p>
                    <p className="font-semibold">{provisao.profissional?.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Competência</p>
                    <p className="font-semibold">
                      {new Date(provisao.competencia).toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Provisionado</p>
                    <p className="font-semibold text-lg">
                      R$ {parseFloat(provisao.valor_provisionado || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adiantamentos</p>
                    <p className="font-semibold text-lg text-red-600">
                      - R$ {parseFloat(provisao.valor_adiantamentos || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ajustes</p>
                    <p className="font-semibold text-lg">
                      R$ {parseFloat(provisao.valor_ajustes || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Devido</p>
                    <p className="font-semibold text-lg text-green-600">
                      R$ {parseFloat(provisao.valor_devido || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {(provisao.valor_inss > 0 || provisao.valor_iss > 0 || provisao.valor_irrf > 0) && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-semibold mb-2">Retenções</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {provisao.valor_inss > 0 && (
                        <div>
                          <p className="text-muted-foreground">INSS</p>
                          <p className="font-semibold">R$ {parseFloat(provisao.valor_inss).toFixed(2)}</p>
                        </div>
                      )}
                      {provisao.valor_iss > 0 && (
                        <div>
                          <p className="text-muted-foreground">ISS</p>
                          <p className="font-semibold">R$ {parseFloat(provisao.valor_iss).toFixed(2)}</p>
                        </div>
                      )}
                      {provisao.valor_irrf > 0 && (
                        <div>
                          <p className="text-muted-foreground">IRRF</p>
                          <p className="font-semibold">R$ {parseFloat(provisao.valor_irrf).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-yellow-300">
                      <p className="text-muted-foreground text-sm">Valor Líquido a Pagar</p>
                      <p className="font-bold text-lg text-green-600">
                        R$ {parseFloat(provisao.valor_liquido_pagar || provisao.valor_devido || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {producoes.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Produção do Período</h3>
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Procedimento</TableHead>
                            <TableHead className="text-right">Valor Base</TableHead>
                            <TableHead className="text-right">Repasse</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {producoes.map((prod) => (
                            <TableRow key={prod.id}>
                              <TableCell>
                                {new Date(prod.data_execucao).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell>{prod.paciente?.full_name}</TableCell>
                              <TableCell>{prod.procedimento_nome}</TableCell>
                              <TableCell className="text-right">
                                R$ {parseFloat(prod.valor_liquido || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                R$ {parseFloat(prod.valor_repasse_calculado || 0).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações</label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Adicione observações sobre este fechamento..."
                    rows={3}
                  />
                </div>
              </>
            )}

            {!provisao && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Funcionalidade de criação de fechamento será implementada em breve
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Fechar
          </Button>
          {provisao && provisao.status === "provisionado" && (
            <Button onClick={handleAprovar} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
            </Button>
          )}
          {provisao && provisao.status === "aprovado" && (
            <Button onClick={handlePagar} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar Pagamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};