import { useState } from "react";
import { Link } from "react-router-dom";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { EntradaEstoqueModal } from "@/components/estoque/EntradaEstoqueModal";
import { SaidaEstoqueModal } from "@/components/estoque/SaidaEstoqueModal";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { separarMoeda } from "@/lib/moeda";
import { classeSeloMovimentacao, quantidadeComSinal, tipoMovimentacao } from "@/lib/movimentacaoEstoque";
import { cn } from "@/lib/utils";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Estoque() {
  const [entradaOpen, setEntradaOpen] = useState(false);
  const [saidaOpen, setSaidaOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from("profiles").select("clinic_id").eq("id", user.id).single();
      return data;
    },
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stock-dashboard", profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return null;

      const { data: productsData } = await supabase
        .from("products")
        .select("id, estoque_minimo, stocks(quantidade)")
        .eq("clinica_id", profile.clinic_id)
        .eq("ativo", true);

      const belowMinimum = (productsData || []).filter((p) => {
        const total = p.stocks?.reduce((sum: number, s: { quantidade: number | null }) => sum + Number(s.quantidade || 0), 0) || 0;
        return total < Number(p.estoque_minimo || 0);
      }).length;

      // Lotes vencendo em 30 dias (a RLS de batches já restringe aos produtos da clínica)
      const hoje = format(new Date(), "yyyy-MM-dd");
      const em30 = new Date();
      em30.setDate(em30.getDate() + 30);
      const { count: expiringCount } = await supabase
        .from("batches")
        .select("*", { count: "exact", head: true })
        .gte("data_validade", hoje)
        .lte("data_validade", format(em30, "yyyy-MM-dd"));

      const { data: stocksData } = await supabase
        .from("stocks")
        .select("quantidade, custo_medio, products!inner(clinica_id)")
        .eq("products.clinica_id", profile.clinic_id);
      const totalValue = (stocksData || []).reduce((sum, s) => sum + Number(s.quantidade || 0) * Number(s.custo_medio || 0), 0);

      // Contagem real do dia; antes contava só entre as 10 últimas movimentações
      const { count: movesToday } = await supabase
        .from("stock_moves")
        .select("*", { count: "exact", head: true })
        .eq("clinica_id", profile.clinic_id)
        .gte("created_at", startOfDay(new Date()).toISOString());

      const { data: recentMoves } = await supabase
        .from("stock_moves")
        .select("id, tipo, quantidade, created_at, products(nome, unidade)")
        .eq("clinica_id", profile.clinic_id)
        .order("created_at", { ascending: false })
        .limit(10);

      return {
        products: productsData?.length || 0,
        belowMinimum,
        expiring: expiringCount || 0,
        totalValue,
        movesToday: movesToday || 0,
        recentMoves: recentMoves || [],
      };
    },
    enabled: !!profile?.clinic_id,
  });

  const valor = separarMoeda(brl(stats?.totalValue || 0));

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Estoque"
        subtitulo="Saldo, validade e movimentações dos materiais"
        acoes={
          <>
            <Button variant="outline" onClick={() => setSaidaOpen(true)}>
              <ArrowDown className="mr-1.5 h-4 w-4" />
              Saída
            </Button>
            <Button onClick={() => setEntradaOpen(true)}>
              <ArrowUp className="mr-1.5 h-4 w-4" />
              Entrada
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Skeleton className="h-[104px] rounded-lg" />
      ) : (
        <FaixaIndicadores
          itens={[
            {
              rotulo: "Abaixo do mínimo",
              valor: stats?.belowMinimum || 0,
              nota: `de ${stats?.products || 0} produtos ativos`,
              tom: stats?.belowMinimum ? "alerta" : "padrao",
            },
            {
              rotulo: "Vencendo em 30 dias",
              valor: stats?.expiring || 0,
              nota: "Lotes",
              tom: stats?.expiring ? "espera" : "padrao",
            },
            { rotulo: "Valor em estoque", prefixo: valor.prefixo, valor: valor.valor, nota: "Pelo custo médio" },
            { rotulo: "Movimentações hoje", valor: stats?.movesToday || 0, nota: "Entradas, saídas e ajustes" },
          ]}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-[15px]">Últimas movimentações</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/movimentacoes">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 px-5 pb-5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : stats?.recentMoves.length ? (
            <ul className="divide-y border-t">
              {stats.recentMoves.map((move) => (
                <li key={move.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={cn("inline-flex w-[104px] shrink-0 justify-center rounded-md px-2 py-0.5 text-xs font-medium", classeSeloMovimentacao(move.tipo))}>
                    {tipoMovimentacao(move.tipo).rotulo}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{move.products?.nome ?? "Produto removido"}</span>
                  <span className="shrink-0 text-sm tabular-nums text-foreground">
                    {quantidadeComSinal(move.tipo, move.quantidade)} {move.products?.unidade}
                  </span>
                  <time className="w-[88px] shrink-0 text-right text-[13px] text-muted-foreground">
                    {format(new Date(move.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVazio
              icone={Package}
              titulo="Nenhuma movimentação ainda"
              descricao="Registre a primeira entrada de material para acompanhar saldo, custo e validade."
              acao={
                <Button size="sm" onClick={() => setEntradaOpen(true)}>
                  Registrar entrada
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <EntradaEstoqueModal open={entradaOpen} onOpenChange={setEntradaOpen} />
      <SaidaEstoqueModal open={saidaOpen} onOpenChange={setSaidaOpen} />
    </div>
  );
}
