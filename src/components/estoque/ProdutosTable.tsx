import { useMemo, useState } from "react";
import { Package, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { DataTable, DataTableColumn } from "@/components/desktop/DataTable";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any -- linhas vêm do select com joins de products */
interface ProdutosTableProps {
  products: any[];
  isLoading: boolean;
  onEdit: (product: any) => void;
  /** Ação do estado vazio quando não há nenhum produto */
  onNovo?: () => void;
  /** true quando a lista está vazia por causa da busca, não por falta de cadastro */
  buscando?: boolean;
}

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function ProdutosTable({ products, isLoading, onEdit, onNovo, buscando }: ProdutosTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Saldo e custo calculados uma vez, como campos da linha, para a tabela conseguir ordenar por eles
  const linhas = useMemo(
    () =>
      products.map((p) => {
        const stocks: { quantidade: number | null; custo_medio: number | null }[] = p.stocks || [];
        const saldo = stocks.reduce((s, x) => s + Number(x.quantidade || 0), 0);
        const custo = stocks.length ? stocks.reduce((s, x) => s + Number(x.custo_medio || 0), 0) / stocks.length : 0;
        return { ...p, saldo, custo, abaixo: p.ativo && saldo < Number(p.estoque_minimo || 0) };
      }),
    [products],
  );

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("products").update({ ativo: false }).eq("id", id);
      if (error) throw error;
      toast({ title: "Produto inativado" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteId(null);
    } catch (error) {
      toast({ title: "Erro ao inativar produto", description: (error as Error).message, variant: "destructive" });
    }
  };

  const columns: DataTableColumn<any>[] = [
    { key: "codigo_interno", label: "Código", sortable: true, className: "font-mono text-[13px] text-muted-foreground" },
    {
      key: "nome",
      label: "Produto",
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{p.nome}</p>
          {p.categoria && <p className="truncate text-[13px] text-muted-foreground">{p.categoria}</p>}
        </div>
      ),
    },
    {
      key: "saldo",
      label: "Saldo",
      sortable: true,
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      render: (p) => (
        <span className={cn(p.abaixo && "font-medium text-sinal-alerta")}>
          {p.saldo} <span className="text-muted-foreground">{p.unidade}</span>
        </span>
      ),
    },
    {
      key: "estoque_minimo",
      label: "Mínimo",
      sortable: true,
      headerClassName: "text-right",
      className: "text-right tabular-nums text-muted-foreground",
      render: (p) => <>{p.estoque_minimo || 0} {p.unidade}</>,
    },
    {
      key: "custo",
      label: "Custo médio",
      sortable: true,
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      render: (p) => brl(p.custo),
    },
    {
      key: "ativo",
      label: "Situação",
      sortable: true,
      render: (p) =>
        !p.ativo ? (
          <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Inativo</span>
        ) : p.abaixo ? (
          <span className="inline-flex rounded-md bg-sinal-alerta-tenue px-2 py-0.5 text-xs font-medium text-sinal-alerta">Repor</span>
        ) : (
          <span className="inline-flex rounded-md bg-sinal-ok-tenue px-2 py-0.5 text-xs font-medium text-sinal-ok">Em estoque</span>
        ),
    },
    {
      key: "acoes",
      label: "",
      headerClassName: "w-[88px]",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(p)} aria-label={`Editar ${p.nome}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          {p.ativo && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(p.id)} aria-label={`Inativar ${p.nome}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!isLoading && linhas.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        {buscando ? (
          <EstadoVazio icone={Package} titulo="Nenhum produto encontrado" descricao="Tente outro nome, SKU ou código de barras." />
        ) : (
          <EstadoVazio
            icone={Package}
            titulo="Nenhum produto cadastrado"
            descricao="Cadastre os materiais da clínica para controlar saldo, estoque mínimo e custo."
            acao={onNovo && <Button size="sm" onClick={onNovo}>Novo produto</Button>}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <DataTable columns={columns} data={linhas} isLoading={isLoading} searchable={false} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar produto</AlertDialogTitle>
            <AlertDialogDescription>
              O produto sai das listas de entrada e saída, mas continua nesta lista como inativo e o histórico de movimentações é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
