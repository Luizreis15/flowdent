import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, CreditCard, CheckCircle } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import financeiroMockup from '@/assets/financeiro-mockup.jpg';

export default function FinanceiroRecurso() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-acento-600/5">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">
                  Controle Financeiro Completo
                </h1>
                <p className="text-xl text-foreground mb-8">
                  Gerencie pagamentos, comissões e faturamento em um só lugar. Tenha visão clara da saúde financeira da sua clínica.
                </p>
                <Button 
                  asChild
                  size="lg"
                  className="bg-primary text-white hover:bg-acento-600"
                >
                  <a href="https://app.flowdent.com.br/cadastro">Começar Agora</a>
                </Button>
              </div>
              <div>
                <img 
                  src={financeiroMockup} 
                  alt="Interface do Controle Financeiro Flowdent" 
                  className="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-primary mb-12">
              Finanças sob controle
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Fluxo de Caixa</h3>
                <p className="text-foreground">
                  Visualize todas as entradas e saídas em tempo real
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-acento-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-acento-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Relatórios Inteligentes</h3>
                <p className="text-foreground">
                  Gráficos e análises para decisões estratégicas
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Múltiplas Formas de Pagamento</h3>
                <p className="text-foreground">
                  Dinheiro, cartão, PIX e parcelamento integrados
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-acento-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-acento-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Comissões Automáticas</h3>
                <p className="text-foreground">
                  Calcule e pague comissões sem erros
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades Detalhadas */}
        <section className="py-16 bg-border">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-primary mb-12">
              Recursos financeiros avançados
            </h2>
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Contas a Receber e Pagar</h3>
                  <p className="text-foreground">
                    Controle de parcelas, vencimentos e cobranças automáticas
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Gestão de Comissões</h3>
                  <p className="text-foreground">
                    Configure percentuais por profissional e procedimento automaticamente
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Fechamento de Caixa</h3>
                  <p className="text-foreground">
                    Conciliação diária com conferência de valores por forma de pagamento
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Planos de Tratamento</h3>
                  <p className="text-foreground">
                    Crie orçamentos com parcelamento e acompanhe o pagamento por etapa
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Notas Fiscais</h3>
                  <p className="text-foreground">
                    Emissão integrada de NF-e e NFS-e diretamente do sistema
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-primary mb-6">
              Organize suas finanças hoje
            </h2>
            <p className="text-xl text-foreground mb-8 max-w-2xl mx-auto">
              Tenha clareza total sobre seus números e tome decisões mais inteligentes
            </p>
            <Button 
              asChild
              size="lg"
              className="bg-primary text-white hover:bg-acento-600"
            >
              <a href="https://app.flowdent.com.br/cadastro">Experimentar Grátis por 7 Dias</a>
            </Button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
