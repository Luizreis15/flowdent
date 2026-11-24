import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import agendaMockup from '@/assets/agenda-mockup.jpg';

export default function AgendaRecurso() {
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
                  Agenda Inteligente
                </h1>
                <p className="text-xl text-foreground mb-8">
                  Organize todos os seus atendimentos em um só lugar. Reduza faltas, otimize seu tempo e melhore a experiência dos seus pacientes.
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
                  src={agendaMockup} 
                  alt="Interface da Agenda Flowdent" 
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
              Por que usar nossa Agenda?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Visualização Clara</h3>
                <p className="text-foreground">
                  Veja todos os agendamentos em calendário, lista ou linha do tempo
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-acento-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-acento-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Lembretes Automáticos</h3>
                <p className="text-foreground">
                  Notificações por WhatsApp e SMS reduzem faltas em até 80%
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Multi-profissional</h3>
                <p className="text-foreground">
                  Gerencie a agenda de toda sua equipe em um só lugar
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-acento-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-acento-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Confirmação Fácil</h3>
                <p className="text-foreground">
                  Pacientes confirmam presença direto pelo celular
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades Detalhadas */}
        <section className="py-16 bg-border">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-primary mb-12">
              Funcionalidades que fazem a diferença
            </h2>
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Agendamento Online</h3>
                  <p className="text-foreground">
                    Seus pacientes podem agendar consultas 24/7 pelo site ou WhatsApp
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Gestão de Encaixes</h3>
                  <p className="text-foreground">
                    Preencha horários vagos rapidamente com lista de espera inteligente
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Bloqueios e Recorrências</h3>
                  <p className="text-foreground">
                    Configure horários de almoço, férias e agendamentos recorrentes
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Sincronização em Tempo Real</h3>
                  <p className="text-foreground">
                    Toda equipe vê as atualizações instantaneamente, sem conflitos
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
              Pronto para otimizar sua agenda?
            </h2>
            <p className="text-xl text-foreground mb-8 max-w-2xl mx-auto">
              Comece gratuitamente e veja como é fácil ter controle total dos seus agendamentos
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
