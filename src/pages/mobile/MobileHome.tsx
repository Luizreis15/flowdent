import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { endOfDay, format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { COLUNAS_CONSULTA_MOBILE, LinhaConsultaMobile, type ConsultaMobile } from "@/components/mobile/LinhaConsultaMobile";
import { ModuleCards } from "@/components/dashboard/ModuleCards";

interface MobileHomeProps {
  clinicId: string;
}

/**
 * Home do celular no padrão da referência aprovada: cabeçalho igual ao do desktop ("Hoje" e a data),
 * faixa de indicadores, agenda do dia em linhas com barra de status e atalhos para os módulos.
 * Antes: topo em degradê, blocos coloridos, sino sem função, "2 confirmaçãoões" e consultas de
 * todas as clínicas somadas quando o super admin visualizava uma clínica (faltava o filtro por clínica).
 */
const MobileHome = ({ clinicId }: MobileHomeProps) => {
  const navigate = useNavigate();
  const hoje = new Date();

  const { data: consultas, isLoading } = useQuery({
    queryKey: ["mobile-agenda-hoje", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(COLUNAS_CONSULTA_MOBILE)
        .eq("patients.clinic_id", clinicId)
        .gte("appointment_date", startOfDay(new Date()).toISOString())
        .lte("appointment_date", endOfDay(new Date()).toISOString())
        .order("appointment_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ConsultaMobile[];
    },
  });

  const ativas = (consultas || []).filter((c) => c.status !== "cancelled");
  const confirmadas = ativas.filter((c) => c.status === "confirmed").length;
  const aConfirmar = ativas.filter((c) => (c.status || "scheduled") === "scheduled").length;

  return (
    <div className="space-y-5 pt-4">
      <CabecalhoPagina
        titulo="Hoje"
        subtitulo={<span className="first-letter:uppercase">{format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>}
      />

      {isLoading ? (
        <Skeleton className="h-[88px] rounded-lg" />
      ) : (
        <FaixaIndicadores
          compacto
          className="grid-cols-3 divide-x divide-y-0"
          itens={[
            { rotulo: "Consultas", valor: ativas.length, onClick: () => navigate("/dashboard/agenda") },
            { rotulo: "Confirmadas", valor: confirmadas, onClick: () => navigate("/dashboard/agenda") },
            {
              rotulo: "Pendentes",
              valor: aConfirmar,
              tom: aConfirmar ? "espera" : "padrao",
              onClick: () => navigate("/dashboard/agenda"),
            },
          ]}
        />
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[15px]">Agenda do dia</CardTitle>
          <Link
            to="/dashboard/agenda"
            className="rounded-sm text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver agenda
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 px-4 pb-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : consultas?.length ? (
            <ul className="divide-y border-t">
              {consultas.map((c) => (
                <LinhaConsultaMobile key={c.id} consulta={c} />
              ))}
            </ul>
          ) : (
            <EstadoVazio
              icone={Calendar}
              titulo="Nenhuma consulta hoje"
              descricao="As consultas do dia aparecem aqui."
              acao={
                <Button variant="outline" onClick={() => navigate("/dashboard/agenda?new=true")}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agendar consulta
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">Módulos</h2>
        <ModuleCards limite={6} className="grid-cols-2" />
      </section>
    </div>
  );
};

export default MobileHome;
