import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, Clock, AlertTriangle, RefreshCw, TrendingUp, CreditCard } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ReajusteIndividualModal } from "./ReajusteIndividualModal";
import { PaymentDrawer } from "@/components/financeiro/PaymentDrawer";
import { useAuth } from "@/contexts/AuthContext";

interface OrthoFinanceiroTabProps {
  casoId: string;
  budgetId: string | null;
  valorTotal: number;
  valorEntrada: number | null;
  valorMensalidade: number | null;
  diaVencimento: number | null;
  totalMeses: number | null;
}

export function OrthoFinanceiroTab({
  casoId,
  budgetId,
  valorTotal,
  valorEntrada,
  valorMensalidade,
  diaVencimento,
  totalMeses,
}: OrthoFinanceiroTabProps) {
  const [generating, setGenerating] = useState(false);
  const [reajusteOpen, setReajusteOpen] = useState(false);
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<any>(null);
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();

  const { data: titulos, refetch } = useQuery({
    queryKey: ["ortho-receivables", casoId, budgetId],
    queryFn: async () => {
      let { data, error } = await supabase
        .from("receivable_titles")
        .select("*, patient:patients(full_name, phone)")
        .eq("ortho_case_id", casoId)
        .order("due_date", { ascending: true });

      if (error) throw error;

      if ((!data || data.length === 0) && budgetId) {
        const res = await supabase
          .from("receivable_titles")
          .select("*, patient:patients(full_name, phone)")
          .eq("budget_id", budgetId)
          .order("due_date", { ascending: true });
        if (res.error) throw res.error;
        data = res.data;
      }

      return data || [];
    },
  });

  const totalPago = titulos?.filter((t: any) => t.status === "paid").reduce((acc: number, t: any) => acc + Number(t.amount), 0) || 0;
  const totalPendente = titulos?.filter((t: any) => t.status === "open" || t.status === "partial").reduce((acc: number, t: any) => acc + Number(t.balance ?? t.amount), 0) || 0;
  const totalVencido = titulos?.filter((t: any) => {
    if (t.status === "paid") return false;
    return new Date(t.due_date) < new Date();
  }).length || 0;

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === "paid") {
      return <Badge className="border-transparent bg-sinal-ok-tenue text-sinal-ok text-[10px]">Pago</Badge>;
    }
    if (new Date(dueDate) < new Date()) {
      return <Badge variant="destructive" className="text-[10px]">Vencido</Badge>;
    }
    return <Badge variant="outline" className="text-[10px]">Pendente</Badge>;
  };

  const handleGenerateInstallments = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ortho-installments", {
        body: { ortho_case_id: casoId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.count} parcela(s) gerada(s) com sucesso!`);
      refetch();
    } catch (err: any) {
      toast.error("Erro ao gerar parcelas: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleReajusteSuccess = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["ortho-case-detail", casoId] });
  };

  const handlePayClick = (titulo: any) => {
    setSelectedTitulo(titulo);
    setPaymentDrawerOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentDrawerOpen(false);
    setSelectedTitulo(null);
    refetch();
    // Invalidate patient financial queries so both modules stay in sync
    queryClient.invalidateQueries({ queryKey: ["patient-receivables"] });
    queryClient.invalidateQueries({ queryKey: ["patient-financial"] });
    queryClient.invalidateQueries({ queryKey: ["ortho-receivables"] });
  };

  const hasTitulos = titulos && titulos.length > 0;

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 justify-end">
        {!hasTitulos && valorMensalidade && totalMeses && (
          <Button size="sm" onClick={handleGenerateInstallments} disabled={generating}>
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Gerando..." : "Gerar Parcelas"}
          </Button>
        )}
        {hasTitulos && valorMensalidade && (
          <Button size="sm" variant="outline" onClick={() => setReajusteOpen(true)}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Aplicar Reajuste
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-lg font-bold">R$ {Number(valorTotal).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-sinal-ok mb-1" />
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">R$ {totalPago.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 mx-auto text-sinal-espera mb-1" />
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">R$ {totalPendente.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto text-destructive mb-1" />
            <p className="text-xs text-muted-foreground">Vencidos</p>
            <p className="text-lg font-bold text-destructive">{totalVencido}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      {(valorMensalidade || valorEntrada) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {valorEntrada != null && (
                <div>
                  <span className="text-muted-foreground">Entrada:</span>{" "}
                  <span className="font-medium">R$ {Number(valorEntrada).toFixed(2)}</span>
                </div>
              )}
              {valorMensalidade != null && (
                <div>
                  <span className="text-muted-foreground">Mensalidade:</span>{" "}
                  <span className="font-medium">R$ {Number(valorMensalidade).toFixed(2)}</span>
                </div>
              )}
              {diaVencimento != null && (
                <div>
                  <span className="text-muted-foreground">Vencimento:</span>{" "}
                  <span className="font-medium">Dia {diaVencimento}</span>
                </div>
              )}
              {totalMeses != null && (
                <div>
                  <span className="text-muted-foreground">Duração:</span>{" "}
                  <span className="font-medium">{totalMeses} meses</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Titles list */}
      {!hasTitulos ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <DollarSign className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma parcela gerada</p>
            <p className="text-muted-foreground text-xs mt-1">
              {valorMensalidade && totalMeses
                ? 'Clique em "Gerar Parcelas" para criar os títulos financeiros.'
                : "Preencha os dados financeiros do caso para gerar parcelas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Parcelas / Títulos</h4>
          <div className="rounded-md border">
            <div className="divide-y">
              {titulos.map((titulo: any) => (
                <div key={titulo.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    {getStatusBadge(titulo.status, titulo.due_date)}
                    <span className="truncate">{titulo.notes || "Parcela"}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground text-xs">
                      {format(parseISO(titulo.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className="font-medium">R$ {Number(titulo.amount).toFixed(2)}</span>
                    {titulo.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handlePayClick(titulo)}
                      >
                        <CreditCard className="h-3 w-3" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {valorMensalidade && (
        <ReajusteIndividualModal
          open={reajusteOpen}
          onOpenChange={setReajusteOpen}
          casoId={casoId}
          valorAtual={Number(valorMensalidade)}
          onSuccess={handleReajusteSuccess}
        />
      )}

      {/* Payment Drawer */}
      {selectedTitulo && clinicId && (
        <PaymentDrawer
          open={paymentDrawerOpen}
          onOpenChange={setPaymentDrawerOpen}
          title={selectedTitulo}
          clinicId={clinicId}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
