import { useEffect } from "react";
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  ClipboardList,
  CreditCard,
  FileCheck2,
  HeartHandshake,
  Menu,
  MessageCircle,
  ShieldCheck,
  Shapes,
  Stethoscope,
} from "lucide-react";
import { FlowdentBrand } from "@/components/landing/FlowdentBrand";
import {
  AgendaPreview,
  FinancePreview,
  Odontogram,
} from "@/components/landing/FlowdentPreviews";
import { getAppUrl } from "@/config/domains";
import styles from "./Landing.module.css";

const nav = [
  ["Recursos", "recursos"],
  ["Como funciona", "como-funciona"],
  ["Planos", "planos"],
  ["Perguntas", "perguntas"],
];
const features = [
  [
    MessageCircle,
    "Lembretes por WhatsApp",
    "Conecte o número da clínica por QR code e envie lembretes de consulta.",
  ],
  [
    ClipboardList,
    "Prontuário e documentos",
    "Registre no odontograma e emita PDFs timbrados e recibos.",
  ],
  [
    FileCheck2,
    "Orçamento",
    "Apresente o plano de tratamento e registre a aprovação do paciente.",
  ],
  [
    CreditCard,
    "Financeiro",
    "Acompanhe recebíveis, registre pagamentos, renegocie títulos e emita avisos de cobrança.",
  ],
  [
    Shapes,
    "Ortodontia",
    "Organize parcelas e acompanhe os reajustes do tratamento.",
  ],
  [
    Stethoscope,
    "Próteses",
    "Acompanhe os casos de prótese em um módulo próprio.",
  ],
  [
    HeartHandshake,
    "Relacionamento",
    "Organize campanhas, automações no WhatsApp e avaliações pós-consulta.",
  ],
  [
    Boxes,
    "Estoque e relatórios",
    "Acompanhe movimentações e consulte relatórios da operação.",
  ],
  [
    ShieldCheck,
    "Portal e permissões",
    "Ofereça acesso ao paciente e organize as permissões da equipe por função.",
  ],
] as const;
const steps = [
  ["Agenda", "A recepção marca a consulta de Marina e envia o lembrete."],
  ["Atendimento", "O dentista registra a avaliação e atualiza o odontograma."],
  [
    "Orçamento aprovado",
    "Marina aprova o plano de tratamento e combina o pagamento.",
  ],
  [
    "Recebimento",
    "A equipe registra a primeira parcela e acompanha a próxima.",
  ],
];
const plans = [
  ["Solo", "89,90", "500"],
  ["Crescimento", "134,90", "1.000"],
  ["Premium", "179,90", "2.000"],
];
const questions = [
  [
    "Funciona no celular?",
    "Sim. Acesse o Flowdent pelo navegador no computador ou no celular.",
  ],
  [
    "Os dados ficam separados de outras clínicas?",
    "Sim. Cada clínica tem acesso aos dados da sua própria operação.",
  ],
  [
    "Como conecto o WhatsApp?",
    "Conecte o número da clínica no sistema por QR code.",
  ],
  [
    "Como funciona o teste?",
    "Você tem 7 dias para usar o Flowdent na sua clínica antes de escolher um plano.",
  ],
  [
    "O que são créditos de comunicação?",
    "São as mensagens incluídas mensalmente no seu plano: 500, 1.000 ou 2.000.",
  ],
];

function Trial({ label = "Testar grátis" }: { label?: string }) {
  return (
    <a className={styles.trial} href={getAppUrl("/cadastro")}>
      {label}
      <ArrowRight size={17} aria-hidden="true" />
    </a>
  );
}

export default function Landing() {
  useEffect(() => {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/svg+xml";
    icon.href = "/brand/flowdent-icon.svg";
    document.head.append(icon);
    return () => icon.remove();
  }, []);

  return (
    <div className={styles.page} id="inicio">
      <a className={styles.skip} href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={styles.shell + " " + styles.headerInner}>
          <a href="#inicio" className={styles.brandLink}>
            <FlowdentBrand />
          </a>
          <nav className={styles.desktopNav} aria-label="Navegação principal">
            {nav.map(([label, id]) => (
              <a key={id} href={"#" + id}>
                {label}
              </a>
            ))}
          </nav>
          <div className={styles.desktopTrial}>
            <Trial />
          </div>
          <details className={styles.mobileNav}>
            <summary>
              <Menu size={21} aria-hidden="true" /> Menu
            </summary>
            <nav
              aria-label="Navegação móvel"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a"))
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
              }}
            >
              {nav.map(([label, id]) => (
                <a key={id} href={"#" + id}>
                  {label}
                </a>
              ))}
              <Trial />
            </nav>
          </details>
        </div>
      </header>
      <main id="conteudo">
        <section className={styles.hero}>
          <div className={styles.shell + " " + styles.split}>
            <div>
              <p className={styles.eyebrow}>
                Gestão para clínicas odontológicas
              </p>
              <h1>
                A clínica flui.
                <br />
                Você cuida.
              </h1>
              <p className={styles.lead}>
                Da consulta marcada ao pagamento registrado, organize agenda,
                prontuário, orçamentos e financeiro no mesmo sistema.
                Desenvolvido por um cirurgião-dentista para a rotina da clínica.
              </p>
              <div className={styles.actions}>
                <Trial label="Testar grátis por 7 dias" />
                <a className={styles.secondary} href="#como-funciona">
                  Ver como funciona <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
              <p className={styles.note}>Planos a partir de R$ 89,90 por mês</p>
            </div>
            <AgendaPreview />
          </div>
        </section>
        <section className={styles.section} id="como-funciona">
          <div className={styles.shell}>
            <p className={styles.eyebrow}>Como funciona</p>
            <h2>
              Do primeiro agendamento ao último recebimento, sem trocar de
              sistema.
            </h2>
            <div className={styles.workflow}>
              <ol className={styles.steps}>
                {steps.map(([title, description], index) => (
                  <li key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Odontogram />
            </div>
          </div>
        </section>
        <section className={styles.section + " " + styles.alt} id="recursos">
          <div className={styles.shell}>
            <p className={styles.eyebrow}>Recursos</p>
            <h2>Ferramentas para a rotina inteira da clínica.</h2>
            <div className={styles.features}>
              {features.map(([Icon, title, description]) => (
                <article key={title} className={styles.card}>
                  <Icon size={22} aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className={styles.section + " " + styles.dark}>
          <div className={styles.shell + " " + styles.split}>
            <div>
              <p className={styles.eyebrow}>Orçamento e financeiro</p>
              <h2>Orçamento aprovado. Recebimento acompanhado.</h2>
              <p className={styles.lead}>
                Veja o que já foi pago e quais parcelas ainda vão vencer depois
                que o paciente aprova o tratamento.
              </p>
            </div>
            <FinancePreview />
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.shell + " " + styles.founder}>
            <div>
              <p className={styles.eyebrow}>Origem</p>
              <h2>Feito por quem atende.</h2>
            </div>
            <div>
              <p className={styles.lead}>
                O Flowdent é desenvolvido por um cirurgião-dentista. Quem
                desenhou o sistema conhece a rotina de uma clínica por dentro.
              </p>
              <p>
                <strong>Dr. Luiz Eduardo Batista Reis</strong>
                <br />
                <small>Cirurgião-dentista · implantes e próteses fixas</small>
              </p>
            </div>
          </div>
        </section>
        <section className={styles.section + " " + styles.alt} id="planos">
          <div className={styles.shell}>
            <p className={styles.eyebrow}>Planos</p>
            <h2>Escolha um plano para sua clínica.</h2>
            <div className={styles.features}>
              {plans.map(([name, price, credits]) => (
                <article className={styles.card + " " + styles.plan} key={name}>
                  <h3>{name}</h3>
                  <p className={styles.price}>
                    <span>R$</span> {price}
                    <small>/ mês</small>
                  </p>
                  <p>{credits} créditos de comunicação por mês</p>
                  <Trial />
                </article>
              ))}
            </div>
            <p className={styles.note}>
              Todos os planos incluem agenda e prontuário digital.{" "}
              <a href="/precos">Confira os detalhes de cada plano</a>.
            </p>
          </div>
        </section>
        <section className={styles.section} id="perguntas">
          <div className={styles.shell + " " + styles.faq}>
            <div>
              <p className={styles.eyebrow}>Perguntas</p>
              <h2>Dúvidas antes de começar?</h2>
            </div>
            <div>
              {questions.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section
          className={styles.section + " " + styles.dark + " " + styles.closing}
        >
          <div className={styles.shell}>
            <div className={styles.fdClosingBrand}>
              <FlowdentBrand variant="inverso" />
            </div>
            <h2>A clínica flui. Você cuida.</h2>
            <p className={styles.lead}>
              Teste o Flowdent por 7 dias na sua clínica.
            </p>
            <Trial />
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.shell + " " + styles.footerInner}>
          <a href="#inicio" className={styles.brandLink}>
            <FlowdentBrand />
          </a>
          <p>Desenvolvido pela Hera Digital em Santo André – SP</p>
          <nav aria-label="Links legais">
            <a href="/termos">Termos de uso</a>
            <a href="/privacidade">Política de privacidade</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
