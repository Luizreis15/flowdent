import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";
import DadosContaTab from "@/components/perfil/DadosContaTab";
import EmailNotificacoesTab from "@/components/perfil/EmailNotificacoesTab";
import SegurancaTab from "@/components/perfil/SegurancaTab";
import PlanoCobrancaTab from "@/components/perfil/PlanoCobrancaTab";
import PreferenciasTab from "@/components/perfil/PreferenciasTab";

/*
 * Abas "Contratos", "Privacidade", "Integrações", "Logs" e "Encerramento" saíram da tela:
 * eram só um aviso de "em desenvolvimento". Os componentes seguem em src/components/perfil.
 */
const Perfil = () => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      setUserId(user.id);
    } catch (error: any) {
      console.error("Erro ao carregar usuário:", error);
      toast.error("Erro ao carregar dados do usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Meu perfil" subtitulo="Seus dados, notificações, segurança e preferências" />

      {loading ? (
        <EsqueletoSecao linhas={5} />
      ) : userId ? (
        <Tabs defaultValue="dados" className="space-y-6">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="w-max">
              <TabsTrigger value="dados">Dados da conta</TabsTrigger>
              <TabsTrigger value="email">Notificações</TabsTrigger>
              <TabsTrigger value="seguranca">Segurança</TabsTrigger>
              <TabsTrigger value="plano">Plano e cobrança</TabsTrigger>
              <TabsTrigger value="preferencias">Preferências</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dados">
            <Card>
              <CardContent className="p-5">
                <DadosContaTab userId={userId} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="email">
            <EmailNotificacoesTab userId={userId} />
          </TabsContent>
          <TabsContent value="seguranca">
            <SegurancaTab userId={userId} />
          </TabsContent>
          <TabsContent value="plano">
            <PlanoCobrancaTab userId={userId} />
          </TabsContent>
          <TabsContent value="preferencias">
            <PreferenciasTab userId={userId} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
};

export default Perfil;
