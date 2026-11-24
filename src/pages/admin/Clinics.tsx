import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAppUrl } from "@/config/domains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Eye, Loader2, Plus, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Clinic {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  status_assinatura: string | null;
  plano: string | null;
  created_at: string;
  current_period_end: string | null;
  patient_count?: number;
  user_count?: number;
}

const AdminClinics = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClinic, setNewClinic] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
  });

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const { data: clinicsData, error } = await supabase
        .from("clinicas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get patient and user counts for each clinic
      const clinicsWithCounts = await Promise.all(
        (clinicsData || []).map(async (clinic) => {
          const [patientRes, userRes] = await Promise.all([
            supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.id),
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.id),
          ]);

          return {
            ...clinic,
            patient_count: patientRes.count || 0,
            user_count: userRes.count || 0,
          };
        })
      );

      setClinics(clinicsWithCounts);
    } catch (error) {
      console.error("Error loading clinics:", error);
      toast.error("Erro ao carregar clínicas");
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (clinic: Clinic) => {
    setImpersonating(clinic.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log impersonation
      await supabase.from("admin_impersonation_logs").insert({
        admin_user_id: user.id,
        impersonated_clinic_id: clinic.id,
        reason: "Admin access for testing/support",
      });

      // Pass impersonation data via URL to cross domain
      const impersonationData = encodeURIComponent(JSON.stringify({
        clinicId: clinic.id,
        clinicName: clinic.nome,
        startedAt: new Date().toISOString(),
      }));

      toast.success(`Acessando como: ${clinic.nome}`);
      
      // Redirect to app domain with impersonation data in URL
      window.location.href = getAppUrl(`/dashboard?impersonate=${impersonationData}`);
    } catch (error: any) {
      toast.error("Erro ao iniciar impersonação");
      console.error(error);
      setImpersonating(null);
    }
  };

  const handleCreateTestClinic = async () => {
    if (!newClinic.nome.trim()) {
      toast.error("Nome da clínica é obrigatório");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("clinicas")
        .insert({
          nome: newClinic.nome,
          cnpj: newClinic.cnpj || null,
          telefone: newClinic.telefone || null,
          status_assinatura: "trialing",
          onboarding_status: "completed",
          owner_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Clínica de teste criada com sucesso");
      setShowCreateModal(false);
      setNewClinic({ nome: "", cnpj: "", telefone: "" });
      loadClinics();
    } catch (error: any) {
      console.error("Error creating test clinic:", error);
      toast.error("Erro ao criar clínica de teste");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/20 text-green-400",
      trialing: "bg-amber-500/20 text-amber-400",
      past_due: "bg-red-500/20 text-red-400",
      cancelled: "bg-slate-500/20 text-slate-400",
      incomplete: "bg-orange-500/20 text-orange-400",
    };
    const labels: Record<string, string> = {
      active: "Ativo",
      trialing: "Teste Grátis",
      past_due: "Pendente",
      cancelled: "Cancelado",
      incomplete: "Incompleto",
    };
    const key = status || "trialing";
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[key] || styles.trialing}`}>
        {labels[key] || key}
      </span>
    );
  };

  const filteredClinics = clinics.filter(
    (clinic) =>
      clinic.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.cnpj?.includes(searchTerm) ||
      clinic.telefone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clínicas</h1>
          <p className="text-slate-400">Gerenciar todas as clínicas cadastradas</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Criar Clínica de Teste
        </Button>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, CNPJ ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Clínica</TableHead>
                  <TableHead className="text-slate-400">CNPJ</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Plano</TableHead>
                  <TableHead className="text-slate-400">Pacientes</TableHead>
                  <TableHead className="text-slate-400">Usuários</TableHead>
                  <TableHead className="text-slate-400">Criado em</TableHead>
                  <TableHead className="text-slate-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClinics.map((clinic) => (
                  <TableRow key={clinic.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {clinic.nome}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {clinic.cnpj || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(clinic.status_assinatura)}</TableCell>
                    <TableCell className="text-slate-300">
                      {clinic.plano || "Free"}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {clinic.patient_count}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {clinic.user_count}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {format(new Date(clinic.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImpersonate(clinic)}
                        disabled={impersonating === clinic.id}
                        className="border-primary/50 text-primary hover:bg-primary/20"
                      >
                        {impersonating === clinic.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Acessar
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClinics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      Nenhuma clínica encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal para criar clínica de teste */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Criar Clínica de Teste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-slate-300">Nome da Clínica *</Label>
              <Input
                id="nome"
                value={newClinic.nome}
                onChange={(e) => setNewClinic({ ...newClinic, nome: e.target.value })}
                placeholder="Ex: Clínica Teste 01"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj" className="text-slate-300">CNPJ (opcional)</Label>
              <Input
                id="cnpj"
                value={newClinic.cnpj}
                onChange={(e) => setNewClinic({ ...newClinic, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-slate-300">Telefone (opcional)</Label>
              <Input
                id="telefone"
                value={newClinic.telefone}
                onChange={(e) => setNewClinic({ ...newClinic, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTestClinic}
              disabled={creating}
              className="bg-primary hover:bg-primary/90"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Clínica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClinics;
