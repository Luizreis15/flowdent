import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Calendar, FileText, DollarSign, ChevronDown, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";

const plans = [
  {
    id: "solo",
    name: "Plano Solo",
    description: "Perfeito para dentistas que querem começar com o pé direito",
    price: "89,90",
    popular: false,
    features: [
      "Agendamento ilimitado",
      "Prontuário digital completo",
      "Controle financeiro básico",
      "500 créditos de comunicação/mês",
      "Suporte por email",
    ],
  },
  {
    id: "crescimento",
    name: "Plano Crescimento",
    description: "Ideal para clínicas que estão escalando",
    price: "134,90",
    popular: true,
    features: [
      "Tudo do Plano Solo",
      "Gestão financeira avançada",
      "Controle de estoque",
      "1.000 créditos de comunicação/mês",
      "Relatórios personalizados",
      "Suporte prioritário",
    ],
  },
  {
    id: "premium",
    name: "Plano Premium",
    description: "Para clínicas que buscam excelência operacional",
    price: "179,90",
    popular: false,
    features: [
      "Tudo do Plano Crescimento",
      "Multi-clínica ilimitado",
      "2.000 créditos de comunicação/mês",
      "API personalizada",
      "Gerente de conta dedicado",
      "Suporte 24/7 via WhatsApp",
    ],
  },
];

const comparisonFeatures = [
  { name: "Agendamento Inteligente", solo: true, crescimento: true, premium: true },
  { name: "Prontuário Digital", solo: true, crescimento: true, premium: true },
  { name: "Controle Financeiro", solo: "Básico", crescimento: "Avançado", premium: "Completo" },
  { name: "Gestão de Estoque", solo: false, crescimento: true, premium: true },
  { name: "Relatórios Personalizados", solo: false, crescimento: true, premium: true },
  { name: "Multi-clínica", solo: false, crescimento: false, premium: true },
  { name: "API Personalizada", solo: false, crescimento: false, premium: true },
  { name: "Créditos de Comunicação", solo: "500/mês", crescimento: "1.000/mês", premium: "2.000/mês" },
];

const testimonials = [
  {
    name: "Dr. Carlos Silva",
    role: "Ortodontista",
    content: "O Flowdent transformou minha clínica. Agora consigo focar no que realmente importa: meus pacientes.",
    avatar: "CS",
  },
  {
    name: "Dra. Ana Paula",
    role: "Implantodontista",
    content: "Antes eu perdia horas com papelada. Hoje, tudo é automatizado e minha equipe trabalha muito melhor.",
    avatar: "AP",
  },
  {
    name: "Dr. Roberto Lima",
    role: "Clínico Geral",
    content: "Dobrei minha produtividade com o Flowdent. É simplesmente indispensável para qualquer dentista moderno.",
    avatar: "RL",
  },
];

export default function Precos() {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCheckout = async (planId: string) => {
    setLoading(planId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Login necessário",
          description: "Faça login para assinar um plano",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao criar checkout:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o checkout. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <LandingHeader />
      
      <main className="container mx-auto px-4 py-16 md:py-24">
        {/* Bloco A: Headline Principal */}
        <section className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            A Gestão Odontológica que Liberta Você
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Chega de papelada e estresse. Escolha o plano que vai transformar seu consultório em uma clínica de alto desempenho.
          </p>
        </section>

        {/* Bloco B: Escolha a Jornada do Seu Sucesso */}
        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Escolha a Jornada do Seu Sucesso
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative transition-colors hover:border-foreground/30 ${
                  plan.popular ? "border-primary border-2 shadow-xl scale-105 md:scale-110" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm">
                      ⭐ Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="pb-6">
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-xl">R$</span>
                      <span className="text-5xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    className="w-full text-base h-12"
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loading !== null}
                  >
                    {loading === plan.id ? "Processando..." : "TESTAR GRÁTIS POR 7 DIAS"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* Bloco C: Visão Rápida - Tabela de Comparação */}
        <section className="mb-24 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Visão Rápida: O que cada plano entrega de valor
          </h2>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse bg-card rounded-lg shadow-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-semibold">Recurso</th>
                  <th className="p-4 text-center font-semibold">Solo</th>
                  <th className="p-4 text-center font-semibold bg-primary/5">Crescimento</th>
                  <th className="p-4 text-center font-semibold">Premium</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, idx) => (
                  <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{feature.name}</td>
                    <td className="p-4 text-center">
                      {typeof feature.solo === "boolean" ? (
                        feature.solo ? (
                          <Check className="h-5 w-5 text-primary mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-sm">{feature.solo}</span>
                      )}
                    </td>
                    <td className="p-4 text-center bg-primary/5">
                      {typeof feature.crescimento === "boolean" ? (
                        feature.crescimento ? (
                          <Check className="h-5 w-5 text-primary mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-sm font-medium">{feature.crescimento}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof feature.premium === "boolean" ? (
                        feature.premium ? (
                          <Check className="h-5 w-5 text-primary mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-sm">{feature.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {comparisonFeatures.map((feature, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{feature.name}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Solo</p>
                    {typeof feature.solo === "boolean" ? (
                      feature.solo ? (
                        <Check className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground mx-auto" />
                      )
                    ) : (
                      <span className="text-sm">{feature.solo}</span>
                    )}
                  </div>
                  <div className="bg-primary/5 -my-4 py-4">
                    <p className="text-xs text-muted-foreground mb-2">Crescimento</p>
                    {typeof feature.crescimento === "boolean" ? (
                      feature.crescimento ? (
                        <Check className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground mx-auto" />
                      )
                    ) : (
                      <span className="text-sm font-medium">{feature.crescimento}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Premium</p>
                    {typeof feature.premium === "boolean" ? (
                      feature.premium ? (
                        <Check className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground mx-auto" />
                      )
                    ) : (
                      <span className="text-sm">{feature.premium}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Bloco D: Detalhes que Fazem a Diferença */}
        <section className="mb-24 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Detalhes que Fazem a Diferença
          </h2>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="agendamento" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">Agendamento Inteligente</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Calendário online para pacientes marcarem consultas 24/7</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Lembretes automáticos via WhatsApp e SMS</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Gestão de múltiplos profissionais e salas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Visualização por dia, semana ou mês</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prontuario" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">Prontuário Digital Completo</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Odontograma interativo com histórico completo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Registro de anamnese, evoluções e tratamentos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Upload de radiografias e fotos intraorais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Geração automática de documentos e atestados</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="financeiro" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">Gestão Financeira</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Controle de contas a pagar e receber</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Emissão de orçamentos e contratos digitais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Conciliação bancária automática (Crescimento e Premium)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Relatórios de faturamento e DRE (Crescimento e Premium)</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Bloco E: Transparência Total */}
        <section className="mb-24 max-w-4xl mx-auto">
          <div className="bg-muted/50 rounded-lg p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
              Transparência Total: Créditos de Comunicação
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="text-center text-lg">
                Cada plano inclui créditos mensais para envio de mensagens via WhatsApp e SMS para seus pacientes.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-lg mb-2">Solo</p>
                    <p className="text-2xl font-bold text-foreground">500</p>
                    <p className="text-sm">créditos/mês</p>
                  </CardContent>
                </Card>
                <Card className="border-primary border-2">
                  <CardContent className="pt-6 text-center">
                    <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-lg mb-2">Crescimento</p>
                    <p className="text-2xl font-bold text-foreground">1.000</p>
                    <p className="text-sm">créditos/mês</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-lg mb-2">Premium</p>
                    <p className="text-2xl font-bold text-foreground">2.000</p>
                    <p className="text-sm">créditos/mês</p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-center text-sm mt-6">
                Créditos adicionais disponíveis: <strong>R$ 0,10 por mensagem</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Bloco F: Depoimentos */}
        <section className="mb-24 max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Quem Usa o Flowdent, Não Volta Atrás
          </h2>
          <Carousel className="w-full">
            <CarouselContent>
              {testimonials.map((testimonial, idx) => (
                <CarouselItem key={idx} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                            {testimonial.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-lg">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                        <div className="flex gap-1 text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                        <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        {/* Bloco G: CTA Final */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Pronto para a Revolução?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Junte-se a centenas de dentistas que já transformaram suas clínicas com o Flowdent.
              Comece hoje mesmo, sem compromisso.
            </p>
            <Button size="lg" className="text-lg h-14 px-8" onClick={() => navigate("/auth")}>
              TESTAR GRÁTIS POR 7 DIAS
            </Button>
            <p className="text-sm text-muted-foreground mt-6">
              Dúvidas? Fale com um consultor pelo WhatsApp: <strong>(11) 99999-9999</strong>
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
