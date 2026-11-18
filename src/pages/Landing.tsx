import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import FeatureSection from '@/components/landing/FeatureSection';
import DiferenciaisSection from '@/components/landing/DiferenciaisSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';
import WhatsAppButton from '@/components/landing/WhatsAppButton';
import agendaMockup from '@/assets/agenda-mockup.jpg';
import prontuarioMockup from '@/assets/prontuario-mockup.jpg';
import documentosMockup from '@/assets/documentos-mockup.jpg';
import financeiroMockup from '@/assets/financeiro-mockup.jpg';

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>
        <HeroSection />
        
        {/* Agenda Inteligente */}
        <FeatureSection
          id="agenda"
          badge="AGENDA INTELIGENTE"
          title="Organize a agenda e confirme pelo WhatsApp"
          description="Agende e reagende consultas, acompanhe a sala de espera e envie confirmações pelo WhatsApp."
          benefits={[
            "Confirmação automática via WhatsApp",
            "Visualização de sala de espera em tempo real",
            "Bloqueio inteligente de horários",
            "Lembretes personalizados para pacientes"
          ]}
          ctaText="Testar grátis"
          imageSrc={agendaMockup}
          imageAlt="Interface de Agenda do Flowdent"
          imagePosition="right"
        />

        {/* Prontuário Eletrônico */}
        <FeatureSection
          id="prontuario"
          badge="PRONTUÁRIO ELETRÔNICO"
          title="Odontograma e histórico no mesmo prontuário"
          description="Registre o atendimento no odontograma e consulte exames, imagens e tratamentos no prontuário do paciente."
          benefits={[
            "Odontograma digital interativo",
            "Registro de fotos e exames",
            "Histórico completo de tratamentos",
          ]}
          ctaText="Testar grátis"
          imageSrc={prontuarioMockup}
          imageAlt="Prontuário Eletrônico Digital"
          imagePosition="left"
        />

        {/* Documentos Digitais */}
        <FeatureSection
          id="documentos"
          badge="DOCUMENTOS DIGITAIS"
          title="Emita documentos a partir do atendimento"
          description="Crie receitas, atestados e orçamentos profissionais em minutos. Todos os documentos ficam salvos e organizados no sistema."
          benefits={[
            "Modelos de receituário personalizáveis",
            "Atestados e declarações profissionais",
            "Assinatura digital integrada",
            "Envio direto por WhatsApp ou e-mail"
          ]}
          ctaText="Testar grátis"
          imageSrc={documentosMockup}
          imageAlt="Sistema de Documentos Digitais"
          imagePosition="right"
        />

        {/* Gestão Financeira */}
        <FeatureSection
          id="financeiro"
          badge="GESTÃO FINANCEIRA"
          title="Acompanhe o que entrou e o que falta receber"
          description="Acompanhe receitas, despesas e lucros em tempo real. Gere relatórios completos e tome decisões baseadas em dados."
          benefits={[
            "Dashboard financeiro completo",
            "Controle de contas a pagar e receber",
            "Relatórios gerenciais detalhados",
            "Integração com meios de pagamento"
          ]}
          ctaText="Testar grátis"
          imageSrc={financeiroMockup}
          imageAlt="Dashboard Financeiro"
          imagePosition="left"
        />

        <DiferenciaisSection />
        <CTASection />
      </main>
      <LandingFooter />
      <WhatsAppButton />
    </div>
  );
}
