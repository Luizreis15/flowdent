import { Button } from "@/components/ui/button";
import { Selo } from "@/components/sistema/Selo";
import { Edit, Mail, ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable, DataTableColumn } from "@/components/desktop/DataTable";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  cargo?: string;
  perfil: string;
}

interface UsuariosTableProps {
  usuarios: Usuario[];
  loading: boolean;
  erro?: boolean;
  onTentarDeNovo?: () => void;
  onEdit: (usuario: Usuario) => void;
  onToggleStatus: (usuario: Usuario) => void;
  onResendInvite: (usuario: Usuario) => void;
  onManagePermissions?: (perfil: string) => void;
}

const perfilLabels: Record<string, string> = {
  admin: "Administrador",
  recepcionista: "Recepcionista",
  asb: "ASB",
  cirurgiao_dentista: "Cirurgião-Dentista",
  dentista: "Dentista",
  recepcao: "Recepção",
  assistente: "Assistente"
};


export const UsuariosTable = ({ usuarios, loading, erro, onTentarDeNovo, onEdit, onToggleStatus, onResendInvite, onManagePermissions }: UsuariosTableProps) => {
  const columns: DataTableColumn<Usuario>[] = [
    { key: "nome", label: "Nome", sortable: true, className: "font-medium" },
    { key: "email", label: "E-mail", sortable: true },
    { key: "cargo", label: "Cargo", sortable: true },
    {
      key: "perfil",
      label: "Perfil",
      sortable: true,
      render: (user) => (
        <Selo tom={user.perfil === "admin" ? "tinta" : "neutro"}>{perfilLabels[user.perfil] || user.perfil}</Selo>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      headerClassName: "text-right",
      className: "text-right",
      render: (user) => (
        <TooltipProvider>
          <div className="flex justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => onResendInvite(user)}>
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Reenviar convite</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Editar usuário</p></TooltipContent>
            </Tooltip>
            {onManagePermissions && user.perfil !== "admin" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => onManagePermissions(user.perfil)}>
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Gerenciar permissões do perfil</p></TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={usuarios}
      isLoading={loading}
      erro={erro}
      tituloErro="Não foi possível carregar os usuários"
      onTentarDeNovo={onTentarDeNovo}
      vazio={{ titulo: "Nenhum usuário cadastrado", descricao: "Convide a equipe para acessar o sistema." }}
      searchable={false}
      emptyMessage="Nenhum usuário encontrado"
    />
  );
};
