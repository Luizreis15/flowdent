import { useState } from "react";
import { Check, Loader2, Minus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { Selo } from "@/components/sistema/Selo";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { nomePlano, statusAssinatura } from "@/lib/assinatura";
import { cn } from "@/lib/utils";

type Periodo = "monthly" | "annual";

const PLANOS: {
  id: string;
  nome: string;
  mensal: number;
  anual: number;
  destaque?: boolean;
  recursos: string[];
}[] = [
  {
    id: "solo",
    nome: "Solo",
    mensal: 89.9,
    anual: 899.0,
    recursos: ["1 profissional/agenda", "Agendamento online", "Prontuário digital", "Gestão financeira básica"],
  },
  {
    id: "crescimento",
    nome: "Crescimento",
    mensal: 134.9,
    anual: 1349.0,
    destaque: true,
    recursos: [
      "Até 3 profissionais/agendas",
      "Confirmação automática (SMS/WhatsApp)",
      "Assinatura digital de documentos",
      "Relatórios avançados",
    ],
  },
  {
    id: "premium",
    nome: "Premium",
    mensal: 179.9,
    anual: 1799.0,
    recursos: [
      "Profissionais ilimitados",
      "Assistente IA para anamnese",
      "Integração com laboratórios",
      "Suporte prioritário 24/7",
    ],
  },
];

const COMPARACAO: { rotulo: string; valores: (string | boolean)[] }[] = [
  { rotulo: "Agendas", valores: ["1", "3", "Ilimitadas"] },
  { rotulo: "Confirmação automática", valores: [false, true, true] },
  { rotulo: "Assinatura digital", valores: [false, true, true] },
  { rotulo: "Assistente IA", valores: [false, false, true] },
];

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/** Meses que o plano anual deixa de cobrar em relação a 12 mensalidades (hoje, 2 em todos os planos). */
const mesesGratis = Math.round(12 - PLANOS[0].anual / PLANOS[0].mensal);

const Assinatura = () => {
  const [periodo, setPeriodo] = useState<Periodo>("annual");
  const [carregando, setCarregando] = useState<string | null>(null);
  const { plan: planoAtual, status } = useSubscription();
  const situacao = statusAssinatura(status);

  const assinar = async (planoId: string) => {
    setCarregando(planoId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planoId, billingPeriod: periodo },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error) {
      console.error("Erro ao criar checkout:", error);
      toast.error("Não foi possível abrir o pagamento. Tente novamente.");
    } finally {
      setCarregando(null);
    }
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Assinatura"
        subtitulo={
          status === "admin_impersonation" ? (
            "Visualizando como super admin: a assinatura da clínica aparece em Super Admin → Locatários"
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2">
              Plano {nomePlano(planoAtual)}
              <Selo tom={situacao.tom}>{situacao.rotulo}</Selo>
            </span>
          )
        }
        acoes={
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <TabsList>
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="annual">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {status === "trialing" && (
        <div className="flex gap-3 rounded-lg border-l-[3px] border-l-sinal-espera bg-sinal-espera-tenue px-4 py-3">
          <p className="text-sm text-foreground">
            Você está no período de teste. Escolha um plano para continuar usando todos os recursos depois do teste.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANOS.map((plano) => {
          const preco = periodo === "monthly" ? plano.mensal : plano.anual;
          const atual = planoAtual === plano.id;
          return (
            <Card key={plano.id} className={cn("flex flex-col", (atual || plano.destaque) && "border-foreground/30")}>
              <CardHeader className="gap-3 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-[15px]">{plano.nome}</CardTitle>
                  {atual ? (
                    <Selo tom="ok">Plano atual</Selo>
                  ) : plano.destaque ? (
                    <Selo tom="tinta">Mais popular</Selo>
                  ) : null}
                </div>
                <div>
                  <p className="flex items-baseline gap-1 tabular-nums">
                    <span className="text-[28px] font-semibold leading-8 text-foreground">{brl(preco)}</span>
                    <span className="text-sm text-muted-foreground">/{periodo === "monthly" ? "mês" : "ano"}</span>
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
                    {periodo === "annual"
                      ? `Equivale a ${brl(plano.anual / 12)} por mês · ${mesesGratis} meses grátis`
                      : `Ou ${brl(plano.anual)} por ano no plano anual`}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <ul className="space-y-2.5">
                  {plano.recursos.map((recurso) => (
                    <li key={recurso} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      {recurso}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-auto w-full"
                  variant={plano.destaque && !atual ? "default" : "outline"}
                  onClick={() => assinar(plano.id)}
                  disabled={carregando === plano.id || atual}
                >
                  {carregando === plano.id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {atual ? "Plano atual" : `Assinar ${plano.nome}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">Comparação</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-y bg-muted/40">
                  <th className="px-5 py-2.5 text-left font-semibold text-foreground">Recurso</th>
                  {PLANOS.map((p) => (
                    <th key={p.id} className="px-5 py-2.5 text-center font-semibold text-foreground">
                      {p.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {COMPARACAO.map((linha) => (
                  <tr key={linha.rotulo}>
                    <td className="px-5 py-2.5 text-foreground">{linha.rotulo}</td>
                    {linha.valores.map((valor, i) => (
                      <td key={i} className="px-5 py-2.5 text-center text-foreground">
                        {typeof valor === "boolean" ? (
                          valor ? (
                            <Check className="mx-auto h-4 w-4" aria-label="Incluído" />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Não incluído" />
                          )
                        ) : (
                          valor
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assinatura;
