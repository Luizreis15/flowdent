import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { nomePlano, statusAssinatura } from "@/lib/assinatura";
import { useAuth } from "@/contexts/AuthContext";
import { ProfissionaisTab } from "@/components/configuracoes/ProfissionaisTab";
import { UsuariosTab } from "@/components/configuracoes/UsuariosTab";
import { ProcedimentosTab } from "@/components/configuracoes/ProcedimentosTab";
import { ClinicaTab } from "@/components/configuracoes/ClinicaTab";
import { NotaFiscalTab } from "@/components/configuracoes/NotaFiscalTab";
import { CategoriasTab } from "@/components/configuracoes/CategoriasTab";
import { CaixasTab } from "@/components/configuracoes/CaixasTab";
import { CadeirasTab } from "@/components/configuracoes/CadeirasTab";
import { LocaisEstoqueTab } from "@/components/configuracoes/LocaisEstoqueTab";
import { FornecedoresTab } from "@/components/configuracoes/FornecedoresTab";
import { DespesasTabV2 } from "@/components/configuracoes/DespesasTabV2";
import { RegrasComissaoTab } from "@/components/configuracoes/RegrasComissaoTab";

const Configuracoes = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [clinica, setClinica] = useState<any>(null);
  const { isAdmin, isSuperAdmin, isLoading: permissionsLoading, clinicId } = useAuth();

  useEffect(() => {
    if (!permissionsLoading) {
      loadData();
    }
  }, [permissionsLoading, isSuperAdmin, clinicId]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Clínica efetiva: a impersonada quando o super admin visualiza uma clínica.
      // Antes usava sempre profiles.clinic_id e, impersonando, as abas abriam vazias.
      const clinicaEfetiva = clinicId ?? profileData?.clinic_id ?? null;

      if (!clinicaEfetiva && !isSuperAdmin) {
        navigate("/onboarding/welcome");
        return;
      }

      setProfile({ ...profileData, clinic_id: clinicaEfetiva });

      const { data: clinicData } = await supabase
        .from("clinicas")
        .select("*")
        .eq("id", clinicaEfetiva)
        .maybeSingle();

      setClinica(clinicData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    if (!permissionsLoading && !isAdmin && !isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, isSuperAdmin, permissionsLoading, navigate]);

  if (permissionsLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-9 w-full max-w-3xl" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Configurações"
        subtitulo={
          clinica
            ? `${clinica.nome} · plano ${nomePlano(clinica.plano)} · assinatura ${statusAssinatura(clinica.status_assinatura).rotulo.toLowerCase()}`
            : "Clínica, equipe, cadastros e regras do financeiro"
        }
      />

      <Tabs defaultValue="clinica" className="space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="clinica">Clínica</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="nota-fiscal">Nota fiscal</TabsTrigger>
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
            <TabsTrigger value="caixas">Caixas</TabsTrigger>
            <TabsTrigger value="cadeiras">Cadeiras</TabsTrigger>
            <TabsTrigger value="locais-estoque">Estoque</TabsTrigger>
            <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
            <TabsTrigger value="despesas">Despesas</TabsTrigger>
            <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="clinica">
          <ClinicaTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="equipe">
          <ProfissionaisTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="usuarios">
          <UsuariosTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="nota-fiscal">
          <NotaFiscalTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="planos">
          <ProcedimentosTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="categorias">
          <CategoriasTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="caixas">
          <CaixasTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="cadeiras">
          <CadeirasTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="locais-estoque">
          <LocaisEstoqueTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="fornecedores">
          <FornecedoresTab clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="despesas">
          <DespesasTabV2 clinicaId={profile.clinic_id} />
        </TabsContent>

        <TabsContent value="comissoes">
          <RegrasComissaoTab clinicId={profile.clinic_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
