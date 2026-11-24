import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { UsuariosTable } from "./UsuariosTable";
import { InviteUserModal } from "./InviteUserModal";
import { EditUserModal } from "./EditUserModal";
import { PermissoesPerfilModal } from "./PermissoesPerfilModal";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  cargo?: string;
  perfil: string;
  created_at: string;
  clinica_id?: string;
  updated_at?: string;
}

interface UsuariosTabProps {
  clinicaId: string;
}

const perfilLabels: Record<string, string> = {
  admin: "Administrador",
  dentista: "Dentista",
  recepcao: "Recepção",
  assistente: "Assistente",
  recepcionista: "Recepcionista",
  asb: "ASB",
  cirurgiao_dentista: "Cirurgião-Dentista",
};

export const UsuariosTab = ({ clinicaId }: UsuariosTabProps) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permPerfil, setPermPerfil] = useState("");

  useEffect(() => {
    loadUsuarios();
  }, [clinicaId]);

  useEffect(() => {
    filterUsuarios();
  }, [searchTerm, usuarios]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("nome");

      if (error) throw error;
      
      const mapped = (data || []).map((u: any) => ({
        id: u.id,
        nome: u.nome || "",
        email: u.email || "",
        cpf: u.cpf || "",
        cargo: u.cargo || "",
        perfil: u.perfil || "recepcionista",
        created_at: u.created_at || "",
        clinica_id: u.clinica_id,
        updated_at: u.updated_at
      }));
      
      setUsuarios(mapped);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsuarios = () => {
    if (!searchTerm.trim()) {
      setFilteredUsuarios(usuarios);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = usuarios.filter(
      u =>
        u.nome.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.perfil.toLowerCase().includes(term)
    );
    setFilteredUsuarios(filtered);
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setEditModalOpen(true);
  };

  const handleToggleStatus = async (usuario: Usuario) => {
    toast.info("Funcionalidade de ativar/desativar usuários será implementada em breve");
  };

  const handleResendInvite = async (usuario: Usuario) => {
    try {
      toast.loading("Reenviando convite...", { id: "resend-invite" });

      const { error } = await supabase.functions.invoke("resend-invite", {
        body: {
          userId: usuario.id,
          email: usuario.email,
          clinicaId: clinicaId
        }
      });

      if (error) throw error;
      
      toast.success(`Convite reenviado para ${usuario.email}!`, { id: "resend-invite" });
    } catch (error: any) {
      console.error("Erro ao reenviar convite:", error);
      toast.error("Erro ao reenviar convite: " + error.message, { id: "resend-invite" });
    }
  };

  const handleManagePermissions = (perfil: string) => {
    setPermPerfil(perfil);
    setPermModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, perfil..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo usuário
        </Button>
      </div>

      <UsuariosTable
        usuarios={filteredUsuarios}
        loading={loading}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onResendInvite={handleResendInvite}
        onManagePermissions={handleManagePermissions}
      />

      <InviteUserModal
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          loadUsuarios();
        }}
        clinicaId={clinicaId}
      />

      <EditUserModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingUsuario(null);
          loadUsuarios();
        }}
        usuario={editingUsuario}
        clinicaId={clinicaId}
      />

      <PermissoesPerfilModal
        open={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        clinicId={clinicaId}
        perfil={permPerfil}
        perfilLabel={perfilLabels[permPerfil] || permPerfil}
      />
    </div>
  );
};
