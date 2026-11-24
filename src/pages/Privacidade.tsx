import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function Privacidade() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 10 de março de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introdução</h2>
            <p>
              A Hera Digital ("nós"), responsável pelo Flowdent, está comprometida com a proteção da privacidade 
              e dos dados pessoais de seus usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Dados Coletados</h2>
            <p>Coletamos os seguintes tipos de dados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome completo, email, telefone, CPF/CNPJ da clínica</li>
              <li><strong>Dados de uso:</strong> logs de acesso, ações realizadas na plataforma, dispositivo e navegador</li>
              <li><strong>Dados financeiros:</strong> informações de pagamento processadas pelo Stripe (não armazenamos dados de cartão)</li>
              <li><strong>Dados de pacientes:</strong> informações clínicas inseridas pelo usuário para gestão da clínica</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Finalidade do Tratamento</h2>
            <p>Os dados são tratados para as seguintes finalidades:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prestação dos serviços contratados (gestão clínica, agendamento, financeiro)</li>
              <li>Comunicação com o usuário sobre a plataforma</li>
              <li>Melhoria contínua dos serviços e experiência do usuário</li>
              <li>Cumprimento de obrigações legais e regulatórias</li>
              <li>Processamento de pagamentos e cobrança</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Base Legal</h2>
            <p>
              O tratamento dos dados pessoais é realizado com base no consentimento do titular, na execução do contrato 
              de prestação de serviços, no cumprimento de obrigações legais e no legítimo interesse do controlador, 
              conforme aplicável a cada situação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Compartilhamento de Dados</h2>
            <p>Seus dados podem ser compartilhados com:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Stripe:</strong> processamento de pagamentos</li>
              <li><strong>Provedores de infraestrutura:</strong> hospedagem e armazenamento seguro de dados</li>
              <li><strong>Autoridades legais:</strong> quando exigido por lei ou ordem judicial</li>
            </ul>
            <p>
              Não vendemos, alugamos ou comercializamos dados pessoais de nossos usuários a terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Segurança dos Dados</h2>
            <p>
              Implementamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais, incluindo:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Criptografia em trânsito (TLS/SSL) e em repouso</li>
              <li>Controle de acesso baseado em funções (RBAC)</li>
              <li>Isolamento de dados por clínica (multi-tenancy)</li>
              <li>Monitoramento e logs de auditoria</li>
              <li>Políticas de segurança em nível de linha (Row-Level Security)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Retenção de Dados</h2>
            <p>
              Os dados pessoais são mantidos pelo período necessário para cumprir as finalidades para as quais foram 
              coletados. Após o cancelamento da conta, os dados são mantidos por 90 dias para eventual reativação, 
              após o qual são anonimizados ou excluídos, exceto quando a retenção for necessária por obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Direitos do Titular (LGPD)</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmação da existência de tratamento</li>
              <li>Acesso aos dados pessoais</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados a outro fornecedor</li>
              <li>Eliminação dos dados tratados com consentimento</li>
              <li>Revogação do consentimento</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato pelo email{" "}
              <a href="mailto:privacidade@flowdent.com.br" className="text-primary hover:underline">
                privacidade@flowdent.com.br
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação e sessão). 
              Não utilizamos cookies de rastreamento ou publicidade de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Dados de Pacientes</h2>
            <p>
              Os dados de pacientes inseridos na plataforma são de responsabilidade exclusiva da clínica que os cadastra. 
              A clínica atua como controladora desses dados e deve garantir o consentimento adequado dos pacientes. 
              O Flowdent atua como operador, processando os dados conforme as instruções da clínica.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Encarregado de Dados (DPO)</h2>
            <p>
              O encarregado pelo tratamento de dados pessoais pode ser contatado pelo email{" "}
              <a href="mailto:dpo@flowdent.com.br" className="text-primary hover:underline">
                dpo@flowdent.com.br
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Alterações na Política</h2>
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos os usuários sobre 
              alterações significativas por email ou aviso na plataforma.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
