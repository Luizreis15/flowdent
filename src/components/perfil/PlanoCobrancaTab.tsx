import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Selo } from "@/components/sistema/Selo";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { nomePlano, statusAssinatura } from "@/lib/assinatura";

interface PlanoCobrancaTabProps {
  userId: string;
}

const PlanoCobrancaTab = (_props: PlanoCobrancaTabProps) => {
  const { plan, status, subscriptionEnd } = useSubscription();
  const navigate = useNavigate();
  const [abrindoPortal, setAbrindoPortal] = useState(false);
  const situacao = statusAssinatura(status);

  // Antes o botão não fazia nada; agora abre o portal de cobrança da Stripe (função customer-portal)
  const abrirPortalCobranca = async () => {
    setAbrindoPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (!data?.url) throw new Error("Portal sem endereço");
      window.open(data.url, "_blank", "noopener");
    } catch (error) {
      console.error("Erro ao abrir o portal de cobrança:", error);
      toast.error("Não foi possível abrir o portal de cobrança. Se você ainda não assinou um plano, escolha um em Assinatura.");
    } finally {
      setAbrindoPortal(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">Plano atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-section text-foreground">{nomePlano(plan)}</p>
            <Selo tom={situacao.tom}>{situacao.rotulo}</Selo>
          </div>
          {subscriptionEnd && (
            <p className="text-[13px] text-muted-foreground tabular-nums">
              Renovação em {new Date(subscriptionEnd).toLocaleDateString("pt-BR")}
            </p>
          )}
          <Button variant="outline" onClick={() => navigate("/dashboard/assinatura")}>
            Ver planos
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">Forma de pagamento e faturas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cartão, faturas e cancelamento ficam no portal de cobrança da Stripe.
          </p>
          <Button variant="outline" onClick={abrirPortalCobranca} disabled={abrindoPortal}>
            {abrindoPortal ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-1.5 h-4 w-4" />
            )}
            Abrir portal de cobrança
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanoCobrancaTab;
