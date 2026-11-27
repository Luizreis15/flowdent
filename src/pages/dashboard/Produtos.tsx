import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NovoProdutoModal } from "@/components/estoque/NovoProdutoModal";
import { EditProdutoModal } from "@/components/estoque/EditProdutoModal";
import { ProdutosTable } from "@/components/estoque/ProdutosTable";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";

/** Tira do termo os caracteres que têm significado no filtro .or() do PostgREST */
const termoSeguro = (texto: string) => texto.replace(/[,()*%\\]/g, " ").trim();

export default function Produtos() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- linha do select com joins
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const termo = termoSeguro(search);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- linha do select com joins
  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setEditModalOpen(true);
  };

  // Clínica ativa (respeita a impersonação do super admin); antes vinha do perfil de quem está logado.
  const { clinicId } = useAuth();

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", clinicId, termo],
    queryFn: async () => {
      if (!clinicId) return [];
      let query = supabase
        .from("products")
        .select("*, stock_locations(nome), stocks(quantidade, custo_medio)")
        .eq("clinica_id", clinicId)
        .order("ativo", { ascending: false })
        .order("nome");
      if (termo) {
        query = query.or(`nome.ilike.%${termo}%,sku.ilike.%${termo}%,ean.ilike.%${termo}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Produtos"
        subtitulo="Materiais cadastrados, saldo e estoque mínimo"
        acoes={
          <>
            <Button variant="outline" asChild>
              <Link to="/dashboard/movimentacoes">Movimentações</Link>
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo produto
            </Button>
          </>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, SKU ou código de barras"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar produtos"
        />
      </div>

      <ProdutosTable
        products={products || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onNovo={() => setModalOpen(true)}
        buscando={!!termo}
        erro={isError}
        onTentarDeNovo={() => refetch()}
      />

      <NovoProdutoModal open={modalOpen} onOpenChange={setModalOpen} />
      <EditProdutoModal open={editModalOpen} onOpenChange={setEditModalOpen} product={selectedProduct} />
    </div>
  );
}
