import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { Selo } from "@/components/sistema/Selo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import EnviarConviteModal from "@/components/portal/EnviarConviteModal";

/*
 * Antes esta tela mostrava números e atividades inventados (182 usuários, "Maria Silva
 * confirmou consulta"). Agora mostra só convites e acessos reais da clínica.
 * O paciente aceita o convite em /portal/auth (funções validar/vincular_convite_portal).
 */

type SituacaoConvite = "pendente" | "aceito" | "expirado";

const SELO_CONVITE: Record<SituacaoConvite, { rotulo: string; tom: "neutro" | "ok" | "espera" }> = {
  pendente: { rotulo: "Pendente", tom: "espera" },
  aceito: { rotulo: "Aceito", tom: "ok" },
  expirado: { rotulo: "Expirado", tom: "neutro" },
};

const situacaoConvite = (c: { used_at: string | null; expires_at: string }): SituacaoConvite =>
  c.used_at ? "aceito" : new Date(c.expires_at) < new Date() ? "expirado" : "pendente";

const PortalPaciente = () => {
  const { clinicId } = useAuth();
  const [convidando, setConvidando] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["portal-paciente", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      // Filtra pela clínica via join, sem lista de IDs na URL
      const [convitesRes, acessosRes] = await Promise.all([
        supabase
          .from("patient_portal_invites")
          .select("id, email, created_at, expires_at, used_at, patients!inner(full_name, clinic_id)")
          .eq("patients.clinic_id", clinicId!)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("patient_portal_access")
          .select("id, patients!inner(clinic_id)", { count: "exact", head: true })
          .eq("patients.clinic_id", clinicId!)
          .eq("active", true),
      ]);
      if (convitesRes.error) throw convitesRes.error;
      const convites = convitesRes.data || [];
      return {
        convites,
        pendentes: convites.filter((c) => situacaoConvite(c) === "pendente").length,
        aceitos: convites.filter((c) => situacaoConvite(c) === "aceito").length,
        acessosAtivos: acessosRes.count || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Portal do paciente"
        subtitulo="Convites e acessos dos pacientes ao portal"
        acoes={
          <Button onClick={() => setConvidando(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Convidar paciente
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-[104px] rounded-lg" />
      ) : (
        <FaixaIndicadores
          itens={[
            { rotulo: "Pacientes com acesso", valor: data?.acessosAtivos ?? 0, nota: "Acessos ativos" },
            {
              rotulo: "Convites pendentes",
              valor: data?.pendentes ?? 0,
              nota: "Aguardando o paciente",
              tom: data?.pendentes ? "espera" : "padrao",
            },
            { rotulo: "Convites aceitos", valor: data?.aceitos ?? 0, nota: "Nos últimos 50 convites" },
          ]}
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">Convites</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 px-5 pb-5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : data?.convites.length ? (
            <ul className="divide-y border-t">
              {data.convites.map((c) => {
                const selo = SELO_CONVITE[situacaoConvite(c)];
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{c.patients?.full_name}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{c.email}</p>
                    </div>
                    <time className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
                      {format(new Date(c.created_at), "dd MMM yyyy", { locale: ptBR })}
                    </time>
                    <Selo tom={selo.tom} className="w-[76px] justify-center">
                      {selo.rotulo}
                    </Selo>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EstadoVazio
              icone={Users}
              titulo="Nenhum paciente no portal ainda"
              descricao="Gere um link de convite: o paciente cria a senha e passa a entrar pelo portal."
              acao={
                <Button variant="outline" onClick={() => setConvidando(true)}>
                  Convidar paciente
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <EnviarConviteModal open={convidando} onOpenChange={setConvidando} onConviteGerado={() => refetch()} />
    </div>
  );
};

export default PortalPaciente;
