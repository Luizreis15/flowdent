import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ProfissionaisTable } from "./ProfissionaisTable";
import { ProfissionalModal } from "./ProfissionalModal";
import { AgendaProfissionalModal } from "./AgendaProfissionalModal";

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
  clinica_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProfissionaisTabProps {
  clinicaId: string;
}

export const ProfissionaisTab = ({ clinicaId }: ProfissionaisTabProps) => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [filteredProfissionais, setFilteredProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null);
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [configuringProfissional, setConfiguringProfissional] = useState<Profissional | null>(null);

  useEffect(() => {
    loadProfissionais();
  }, [clinicaId]);

  useEffect(() => {
    filterProfissionais();
  }, [searchTerm, profissionais]);

  const loadProfissionais = async () => {
    try {
      setLoading(true);
      setErroCarregar(false);
      const { data, error } = await supabase
        .from("profissionais")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("nome");

      if (error) throw error;
      setProfissionais(data || []);
    } catch (error: any) {
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  const filterProfissionais = () => {
    if (!searchTerm.trim()) {
      setFilteredProfissionais(profissionais);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = profissionais.filter(
      p =>
        p.nome.toLowerCase().includes(term) ||
        p.cro?.toLowerCase().includes(term) ||
        p.especialidade?.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term)
    );
    setFilteredProfissionais(filtered);
  };

  const handleEdit = (profissional: Profissional) => {
    setEditingProfissional(profissional);
    setModalOpen(true);
  };

  const handleToggleStatus = async (profissional: Profissional) => {
    try {
      const { error } = await supabase
        .from("profissionais")
        .update({ ativo: !profissional.ativo })
        .eq("id", profissional.id);

      if (error) throw error;

      // Registrar auditoria
      await supabase
        .from("audit_log" as any)
        .insert({
          entidade: "profissionais",
          entidade_id: profissional.id,
          acao: profissional.ativo ? "deactivate" : "reactivate",
          dif: { ativo: !profissional.ativo }
        });

      toast.success(
        profissional.ativo ? "Profissional desativado" : "Profissional reativado"
      );
      loadProfissionais();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingProfissional(null);
    loadProfissionais();
  };

  const handleConfigAgenda = (profissional: Profissional) => {
    setConfiguringProfissional(profissional);
    setAgendaModalOpen(true);
  };

  const handleAgendaModalClose = () => {
    setAgendaModalOpen(false);
    setConfiguringProfissional(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CRO, especialidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo profissional
        </Button>
      </div>

      <ProfissionaisTable
        erro={erroCarregar}
        onTentarDeNovo={loadProfissionais}
        profissionais={filteredProfissionais}
        loading={loading}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onConfigAgenda={handleConfigAgenda}
      />

      <ProfissionalModal
        open={modalOpen}
        onClose={handleModalClose}
        profissional={editingProfissional}
        clinicaId={clinicaId}
      />

      <AgendaProfissionalModal
        open={agendaModalOpen}
        onClose={handleAgendaModalClose}
        profissional={configuringProfissional}
      />
    </div>
  );
};
