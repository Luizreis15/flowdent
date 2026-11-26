import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Power, PowerOff, Calendar } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/desktop/DataTable";

interface Profissional {
  id: string;
  nome: string;
  cro: string | null;
  especialidade: string | null;
  email: string;
  telefone: string | null;
  perfil: string;
  ativo: boolean;
  user_id: string | null;
}

interface ProfissionaisTableProps {
  profissionais: Profissional[];
  loading: boolean;
  erro?: boolean;
  onTentarDeNovo?: () => void;
  onEdit: (profissional: Profissional) => void;
  onToggleStatus: (profissional: Profissional) => void;
  onConfigAgenda: (profissional: Profissional) => void;
}

const perfilLabels: Record<string, string> = {
  responsavel: "Responsável",
  dentista: "Dentista",
  asb: "ASB",
  recepcao: "Recepção"
};

export const ProfissionaisTable = ({
  profissionais,
  loading,
  erro,
  onTentarDeNovo,
  onEdit,
  onToggleStatus,
  onConfigAgenda
}: ProfissionaisTableProps) => {
  const columns: DataTableColumn<Profissional>[] = [
    { key: "nome", label: "Nome", sortable: true, className: "font-medium" },
    { key: "cro", label: "CRO", sortable: true },
    { key: "especialidade", label: "Especialidade", sortable: true },
    {
      key: "contato",
      label: "Contato",
      render: (prof) => (
        <div className="text-sm">
          <div>{prof.email}</div>
          {prof.telefone && <div className="text-muted-foreground">{prof.telefone}</div>}
        </div>
      ),
    },
    {
      key: "perfil",
      label: "Perfil",
      sortable: true,
      render: (prof) => (
        <Badge variant="outline">{perfilLabels[prof.perfil] || prof.perfil}</Badge>
      ),
    },
    {
      key: "ativo",
      label: "Status",
      sortable: true,
      render: (prof) => (
        <Badge variant={prof.ativo ? "default" : "secondary"}>
          {prof.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      headerClassName: "text-right",
      className: "text-right",
      render: (prof) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(prof)} title="Editar profissional">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onConfigAgenda(prof)} title="Configurar agenda">
            <Calendar className="h-4 w-4 text-primary" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onToggleStatus(prof)} title={prof.ativo ? "Desativar" : "Ativar"}>
            {prof.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={profissionais}
      isLoading={loading}
      erro={erro}
      tituloErro="Não foi possível carregar os profissionais"
      onTentarDeNovo={onTentarDeNovo}
      vazio={{ titulo: "Nenhum profissional cadastrado", descricao: "Cadastre os dentistas e profissionais que atendem na clínica." }}
      searchPlaceholder="Buscar profissional..."
      emptyMessage="Nenhum profissional encontrado"
      selectable={false}
    />
  );
};
