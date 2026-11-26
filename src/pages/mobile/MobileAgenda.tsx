import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { addDays, addMonths, endOfDay, endOfMonth, endOfWeek, format, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { COLUNAS_CONSULTA_MOBILE, LinhaConsultaMobile, type ConsultaMobile } from "@/components/mobile/LinhaConsultaMobile";

interface MobileAgendaProps {
  clinicId: string;
}

type Visao = "day" | "week" | "month";

const intervalo = (data: Date, visao: Visao) => {
  if (visao === "day") return { inicio: startOfDay(data), fim: endOfDay(data) };
  if (visao === "week") return { inicio: startOfWeek(data, { locale: ptBR }), fim: endOfWeek(data, { locale: ptBR }) };
  return { inicio: startOfMonth(data), fim: endOfMonth(data) };
};

const rotuloPeriodo = (data: Date, visao: Visao) => {
  const { inicio, fim } = intervalo(data, visao);
  if (visao === "day") return format(data, "EEEE, d 'de' MMMM", { locale: ptBR });
  if (visao === "week") return `${format(inicio, "d MMM", { locale: ptBR })} – ${format(fim, "d MMM", { locale: ptBR })}`;
  return format(data, "MMMM 'de' yyyy", { locale: ptBR });
};

/**
 * Agenda do celular no padrão da referência: cabeçalho comum, abas Dia/Semana/Mês, filtro de profissional
 * e linhas com barra de status (as mesmas da home). Antes: topo em degradê, status gravados em português
 * (o banco recusava e nada avisava), cancelamento por deslize sem confirmação e consultas sem filtro de clínica.
 */
const MobileAgenda = ({ clinicId }: MobileAgendaProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState(new Date());
  const [visao, setVisao] = useState<Visao>("day");
  const [profissional, setProfissional] = useState("all");
  const { inicio, fim } = intervalo(data, visao);

  const { data: profissionais } = useQuery({
    queryKey: ["mobile-dentists", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("clinica_id", clinicId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: consultas, isLoading, isError, refetch } = useQuery({
    queryKey: ["mobile-agenda", clinicId, inicio.toISOString(), visao, profissional],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(COLUNAS_CONSULTA_MOBILE)
        .eq("patients.clinic_id", clinicId)
        .gte("appointment_date", inicio.toISOString())
        .lte("appointment_date", fim.toISOString())
        .order("appointment_date", { ascending: true });
      if (profissional !== "all") query = query.eq("dentist_id", profissional);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ConsultaMobile[];
    },
  });

  const mover = (direcao: 1 | -1) =>
    setData((d) => (visao === "day" ? addDays(d, direcao) : visao === "week" ? addDays(d, 7 * direcao) : addMonths(d, direcao)));

  const porDia = (consultas || []).reduce<Record<string, ConsultaMobile[]>>((acc, c) => {
    const dia = format(parseISO(c.appointment_date), "yyyy-MM-dd");
    (acc[dia] ||= []).push(c);
    return acc;
  }, {});

  const novaConsulta = () => navigate("/dashboard/agenda?new=true");

  return (
    <div className="space-y-4 pt-4">
      <CabecalhoPagina
        titulo="Agenda"
        acoes={
          <Button size="sm" onClick={novaConsulta}>
            <Plus className="mr-1 h-4 w-4" />
            Nova consulta
          </Button>
        }
      />

      <div className="space-y-2">
        <Tabs value={visao} onValueChange={(v) => setVisao(v as Visao)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={profissional} onValueChange={setProfissional}>
          <SelectTrigger aria-label="Profissional">
            <SelectValue placeholder="Todos os profissionais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {profissionais?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-1 py-1">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => mover(-1)} aria-label="Período anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setData(new Date())}
          className="min-w-0 flex-1 rounded-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Voltar para hoje"
        >
          <span className="block truncate text-sm font-medium text-foreground first-letter:uppercase">
            {rotuloPeriodo(data, visao)}
          </span>
          <span className="block text-xs text-muted-foreground tabular-nums">
            {isLoading ? "Carregando…" : `${consultas?.length ?? 0} ${consultas?.length === 1 ? "consulta" : "consultas"}`}
          </span>
        </button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => mover(1)} aria-label="Próximo período">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border bg-card">
          <EstadoVazio
            icone={Calendar}
            titulo="Não foi possível carregar a agenda"
            descricao="Verifique a conexão e tente de novo."
            acao={
              <Button variant="outline" onClick={() => refetch()}>
                Tentar de novo
              </Button>
            }
          />
        </div>
      ) : !consultas?.length ? (
        <div className="rounded-lg border bg-card">
          <EstadoVazio
            icone={Calendar}
            titulo={visao === "day" ? "Nenhuma consulta neste dia" : visao === "week" ? "Nenhuma consulta nesta semana" : "Nenhuma consulta neste mês"}
            descricao="As consultas agendadas aparecem aqui."
            acao={
              <Button variant="outline" onClick={novaConsulta}>
                <Plus className="mr-1.5 h-4 w-4" />
                Agendar consulta
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(porDia).map(([dia, itens]) => (
            <section key={dia}>
              {visao !== "day" && (
                <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {format(parseISO(dia), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
              )}
              <ul className="divide-y rounded-lg border bg-card">
                {itens.map((c) => (
                  <LinhaConsultaMobile key={c.id} consulta={c} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileAgenda;
