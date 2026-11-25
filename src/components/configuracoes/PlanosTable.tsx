import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Star, Trash2, Pencil, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import EditarPlanoModal from "./EditarPlanoModal";
import GerenciarProcedimentosPlanoModal from "./GerenciarProcedimentosPlanoModal";
import { DataTable, DataTableColumn } from "@/components/desktop/DataTable";
import { Selo, SeloAtivo } from "@/components/sistema/Selo";

interface Plano {
  id: string;
  nome: string;
  percentual_ajuste: number | null;
  ativo: boolean | null;
  is_padrao: boolean | null;
  clinica_id: string;
  updated_at: string;
}

interface PlanosTableProps {
  planos: Plano[];
  onSetPadrao: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

export const PlanosTable = ({ planos, onSetPadrao, onDelete, onEdit }: PlanosTableProps) => {
  const [editPlano, setEditPlano] = useState<Plano | null>(null);
  const [gerenciarPlano, setGerenciarPlano] = useState<Plano | null>(null);

  const columns: DataTableColumn<Plano>[] = [
    { key: "nome", label: "Nome do Plano", sortable: true, className: "font-medium" },
    {
      key: "percentual_ajuste",
      label: "Ajuste Acumulado",
      sortable: true,
      render: (plano) =>
        plano.percentual_ajuste && plano.percentual_ajuste > 0 ? (
          <span className="tabular-nums text-sinal-ok">+{plano.percentual_ajuste}%</span>
        ) : plano.percentual_ajuste && plano.percentual_ajuste < 0 ? (
          <span className="tabular-nums text-sinal-alerta">{plano.percentual_ajuste}%</span>
        ) : (
          <span className="text-muted-foreground">Base</span>
        ),
    },
    {
      key: "ativo",
      label: "Status",
      sortable: true,
      render: (plano) => (
        <div className="flex gap-2">
          {plano.is_padrao && (
            <Selo tom="tinta" className="gap-1">
              <Star className="h-3 w-3" /> Padrão
            </Selo>
          )}
          <SeloAtivo ativo={plano.ativo} />
        </div>
      ),
    },
    {
      key: "updated_at",
      label: "Atualizado em",
      sortable: true,
      render: (plano) => (
        <span className="text-muted-foreground">
          {format(new Date(plano.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </span>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      headerClassName: "text-right",
      className: "text-right",
      render: (plano) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setGerenciarPlano(plano)} className="gap-1" title="Gerenciar procedimentos">
            <Settings2 className="h-4 w-4" /> Procedimentos
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditPlano(plano)} title="Editar plano">
            <Pencil className="h-4 w-4" />
          </Button>
          {!plano.is_padrao && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSetPadrao(plano.id)} title="Definir como padrão">
              <Star className="h-4 w-4" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir plano">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o plano "{plano.nome}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.stopPropagation(); onDelete(plano.id); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={planos}
        searchPlaceholder="Buscar plano..."
        emptyMessage="Nenhum plano cadastrado"
      />

      <EditarPlanoModal
        open={!!editPlano}
        onOpenChange={() => setEditPlano(null)}
        plano={editPlano}
        onSuccess={onEdit}
      />

      <GerenciarProcedimentosPlanoModal
        open={!!gerenciarPlano}
        onOpenChange={() => setGerenciarPlano(null)}
        plano={gerenciarPlano}
        onSuccess={onEdit}
      />
    </>
  );
};
