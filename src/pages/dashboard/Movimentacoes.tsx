import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeftRight, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { TIPO_MOVIMENTACAO, classeSeloMovimentacao, quantidadeComSinal, tipoMovimentacao } from "@/lib/movimentacaoEstoque";
import { cn } from "@/lib/utils";

export default function Movimentacoes() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from("profiles").select("clinic_id").eq("id", user.id).single();
      return data;
    },
  });

  const { data: moves, isLoading } = useQuery({
    queryKey: ["stock-moves", profile?.clinic_id, tipoFilter],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      let query = supabase
        .from("stock_moves")
        .select(`
          *,
          products(nome, unidade),
          stock_locations!stock_moves_location_from_id_fkey(nome),
          location_to:stock_locations!stock_moves_location_to_id_fkey(nome),
          batches(codigo, data_validade)
        `)
        .eq("clinica_id", profile.clinic_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (tipoFilter !== "todos") {
        query = query.eq("tipo", tipoFilter as "entrada");
      }
      const { data, error } = await query;
      if (error) throw error;
      // usuario_id aponta para auth.users, que o PostgREST não alcança por join: o nome vem de profiles.
      // (O join antigo com "usuarios" não existia e fazia a consulta inteira falhar.)
      const ids = [...new Set((data || []).map((m) => m.usuario_id).filter(Boolean))] as string[];
      const nomes = new Map<string, string>();
      if (ids.length) {
        const { data: perfis } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        (perfis || []).forEach((p) => nomes.set(p.id, p.full_name));
      }
      return (data || []).map((m) => ({ ...m, usuario_nome: m.usuario_id ? nomes.get(m.usuario_id) : undefined }));
    },
    enabled: !!profile?.clinic_id,
  });

  const q = search.trim().toLowerCase();
  const filteredMoves = (moves || []).filter(
    (move) => !q || move.products?.nome?.toLowerCase().includes(q) || move.batches?.codigo?.toLowerCase().includes(q),
  );
  const filtrando = !!q || tipoFilter !== "todos";

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Movimentações" subtitulo="As 100 últimas entradas, saídas, transferências e ajustes" />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto ou lote"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar movimentações"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="h-controle-md w-[180px]" aria-label="Tipo de movimentação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_MOVIMENTACAO).map(([valor, { rotulo }]) => (
              <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : filteredMoves.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Origem → destino</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMoves.map((move) => (
                <TableRow key={move.id}>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {format(new Date(move.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", classeSeloMovimentacao(move.tipo))}>
                      {tipoMovimentacao(move.tipo).rotulo}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{move.products?.nome ?? "Produto removido"}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {quantidadeComSinal(move.tipo, move.quantidade)} <span className="text-muted-foreground">{move.products?.unidade}</span>
                  </TableCell>
                  <TableCell className="font-mono text-[13px] text-muted-foreground">{move.batches?.codigo || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {move.stock_locations?.nome || move.location_to?.nome
                      ? `${move.stock_locations?.nome || "—"} → ${move.location_to?.nome || "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{move.usuario_nome || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : filtrando ? (
          <EstadoVazio icone={ArrowLeftRight} titulo="Nenhuma movimentação encontrada" descricao="Tente outro produto, lote ou tipo." />
        ) : (
          <EstadoVazio
            icone={ArrowLeftRight}
            titulo="Nenhuma movimentação registrada"
            descricao="Entradas e saídas lançadas no painel de Estoque aparecem aqui, com lote, local e responsável."
          />
        )}
      </Card>
    </div>
  );
}
