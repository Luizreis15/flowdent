import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function Termos() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-7" />
          </Link>
          <div className="h-6 w-px bg-border" />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 10 de março de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar o sistema Flowdent ("Plataforma"), você concorda integralmente com estes Termos de Uso. 
              Se você não concordar com qualquer disposição, não utilize a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>
              O Flowdent é um software como serviço (SaaS) de gestão para clínicas odontológicas, que oferece funcionalidades de 
              agendamento, prontuário eletrônico, gestão financeira, controle de estoque, CRM e demais módulos disponíveis 
              conforme o plano contratado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Cadastro e Conta</h2>
            <p>
              Para utilizar a Plataforma, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. 
              Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades 
              realizadas em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Planos e Pagamento</h2>
            <p>
              O Flowdent oferece diferentes planos de assinatura com funcionalidades variadas. Os valores e condições 
              estão disponíveis na página de preços. O pagamento é recorrente e processado de forma segura via Stripe.
              O não pagamento poderá resultar na suspensão do acesso à Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Uso Permitido</h2>
            <p>Você concorda em utilizar a Plataforma exclusivamente para fins legítimos e de acordo com a legislação vigente. É proibido:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Utilizar a Plataforma para fins ilegais ou não autorizados</li>
              <li>Tentar acessar dados de outros usuários ou clínicas</li>
              <li>Realizar engenharia reversa, descompilação ou desmontagem do software</li>
              <li>Compartilhar credenciais de acesso com terceiros não autorizados</li>
              <li>Sobrecarregar intencionalmente os servidores ou infraestrutura</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, design, código-fonte, marcas e demais elementos da Plataforma são de propriedade exclusiva 
              da Hera Digital ou de seus licenciadores. Nenhum direito de propriedade intelectual é transferido ao usuário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Disponibilidade do Serviço</h2>
            <p>
              Nos esforçamos para manter a Plataforma disponível 24 horas por dia, 7 dias por semana. No entanto, 
              interrupções podem ocorrer para manutenção programada ou por motivos de força maior. 
              Não garantimos disponibilidade ininterrupta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Cancelamento</h2>
            <p>
              Você pode cancelar sua assinatura a qualquer momento através do painel de gerenciamento de assinatura. 
              O acesso continuará disponível até o final do período já pago. Dados serão mantidos por 90 dias após 
              o cancelamento, podendo ser exportados durante este período.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Limitação de Responsabilidade</h2>
            <p>
              O Flowdent não se responsabiliza por danos indiretos, incidentais, especiais ou consequenciais 
              decorrentes do uso ou impossibilidade de uso da Plataforma, incluindo perda de dados, lucros cessantes 
              ou interrupção de negócios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão 
              comunicadas por email ou aviso na Plataforma. O uso continuado após as alterações constitui aceitação 
              dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Foro e Legislação Aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer litígio será submetido 
              ao foro da Comarca de Santo André, Estado de São Paulo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos de Uso, entre em contato pelo email{" "}
              <a href="mailto:contato@flowdent.com.br" className="text-primary hover:underline">
                contato@flowdent.com.br
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
