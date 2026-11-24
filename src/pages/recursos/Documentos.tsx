import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FileCheck, Zap, Clock, CheckCircle } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import documentosMockup from '@/assets/documentos-mockup.jpg';

export default function DocumentosRecurso() {
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
                  Gestão de Documentos Automatizada
                </h1>
                <p className="text-xl text-foreground mb-8">
                  Crie receitas, atestados e contratos em segundos. Modelos personalizáveis e assinatura digital integrada.
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
                  src={documentosMockup} 
                  alt="Interface de Gestão de Documentos Flowdent" 
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
              Documentos profissionais em minutos
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Modelos Prontos</h3>
                <p className="text-foreground">
                  Biblioteca completa de receitas, atestados e contratos
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-acento-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-acento-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Geração Rápida</h3>
                <p className="text-foreground">
                  Preenche automaticamente com dados do paciente
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Economize Tempo</h3>
                <p className="text-foreground">
                  Reduza de 10 minutos para 30 segundos por documento
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-acento-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-acento-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Assinatura Digital</h3>
                <p className="text-foreground">
                  Validade jurídica total com certificado digital
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades Detalhadas */}
        <section className="py-16 bg-border">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-primary mb-12">
              Tipos de documentos disponíveis
            </h2>
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Receitas Médicas</h3>
                  <p className="text-foreground">
                    Simples, controladas e de uso contínuo com integração ao banco de medicamentos
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Atestados</h3>
                  <p className="text-foreground">
                    Atestado de comparecimento, capacidade e saúde com CID automático
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Contratos de Tratamento</h3>
                  <p className="text-foreground">
                    Termos de consentimento e planos de tratamento detalhados
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Declarações Personalizadas</h3>
                  <p className="text-foreground">
                    Crie seus próprios modelos para qualquer necessidade
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-acento-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Envio Automático</h3>
                  <p className="text-foreground">
                    Entregue documentos por WhatsApp, email ou impressão direta
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
              Automatize sua documentação
            </h2>
            <p className="text-xl text-foreground mb-8 max-w-2xl mx-auto">
              Pare de perder tempo com papelada e foque no que realmente importa: seus pacientes
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
