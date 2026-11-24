import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { NovoLocalEstoqueModal } from "./NovoLocalEstoqueModal";
import { LocaisEstoqueTable } from "./LocaisEstoqueTable";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

interface LocaisEstoqueTabProps {
  clinicaId: string;
}

export function LocaisEstoqueTab({ clinicaId }: LocaisEstoqueTabProps) {
  const [showModal, setShowModal] = useState(false);

  const { data: locations, isLoading } = useQuery({
    queryKey: ["stock-locations", clinicaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_locations")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("nome");
      
      if (error) throw error;
      return (data as unknown) as Array<{
        id: string;
        nome: string;
        descricao: string | null;
        tipo: string | null;
        ativo: boolean;
      }>;
    },
  });

  if (isLoading) {
    return <EsqueletoSecao />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Locais de estoque</CardTitle>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo local
          </Button>
        </CardHeader>
        <CardContent>
          <LocaisEstoqueTable locations={locations || []} />
        </CardContent>
      </Card>

      <NovoLocalEstoqueModal
        open={showModal}
        onOpenChange={setShowModal}
        clinicaId={clinicaId}
      />
    </>
  );
}
