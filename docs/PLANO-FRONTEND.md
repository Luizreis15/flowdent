# Plano de evolução do frontend — FlowDent

Criado em 2026-11-24. Objetivo: completar o redesign e chegar à **nota 9 em frontend premium**.
Referências obrigatórias: a ementa de identidade (paleta, raios, alturas e escala tipográfica fechados) e a
referência aprovada "HOJE × PROPOSTO". Pendências gerais do projeto: [PENDENCIAS.md](PENDENCIAS.md).

## Onde estamos

**Nota estimada em 2026-11-24: 6,5/10** — desigual. O que passou pelo redesign está perto de 8; o resto do app
perto de 5. A troca entre telas novas e antigas é o que mais tira a sensação de produto premium.

Já em produção (PRs #10–#12):

| Área | Estado |
|---|---|
| Componentes base (botão, card, selo, abas, tabela, input, modal) | Na escala da ementa |
| Sidebar, cabeçalho, faixa de impersonação | Prontos |
| Dashboard, Financeiro (aba Fluxo), Pacientes, ficha do paciente | Padrão "PROPOSTO" |
| Odontograma | Anatômico, convenção clínica |
| Textos | Sem exclamações; ações em caixa normal |
| Componentes do sistema | `CabecalhoPagina`, `FaixaIndicadores`, `SeloStatus` (`src/components/sistema`) |

Dívida medida no código em 2026-11-24 (antes da fase A):

| Item | Ocorrências |
|---|---|
| Cores escritas à mão (`hsl(var(--success-green))`…) em vez de tokens | 337 em 33 arquivos |
| Degradês no app | 29 em 21 arquivos (19 fora da landing e do ui) |
| Sombras grandes em elementos em fluxo | 52 em 40 arquivos |
| `transition-all` e `hover:scale`/`hover:shadow` | 83 |
| Raios acima de 8px | 22 |
| Botões em "Title Case" ("Novo Paciente") | 34 |
| Emojis na interface | 19 em 8 arquivos |
| Telas do app não revisadas | 12 de 17 (+21 de super admin) |
| Modo escuro | 24 classes `dark:` no app inteiro |
| Maior chunk JS | 745 KB, sem divisão por rota |

Lacunas da ementa: odontograma sem **Ausente/extraído** (`#544F45`); **família tipográfica** sem decisão.

## Critérios de "nota 9" (verificáveis)

| Critério | Meta |
|---|---|
| Coerência | 0 cores fora dos tokens, 0 degradês no app, 100% das telas com o mesmo cabeçalho, botões e selos; lint bloqueando regressão |
| Tipografia | Família escolhida e carregada; escala da ementa em todas as telas |
| Estados | Carregamento, vazio e erro desenhados em todas as listas e tabelas |
| Mobile | Casca revisada; nenhuma tela quebrada em 390px |
| Acessibilidade | Foco visível, contraste AA, navegação por teclado nos fluxos principais |
| Movimento | Uma curva; sem `transition-all` nem `hover:scale` |
| Desempenho | Divisão por rota; nenhum chunk acima de 250 KB; carregamento inicial abaixo de 2,5 s |
| Gráficos | Relatórios com uma série em destaque e as demais neutras |
| Odontograma | Todos os estados clínicos, legenda completa, teclado, impressão |
| Modo escuro | Funcional nas cores da ementa — **se o dono decidir mantê-lo** |

## Fases

Cada fase vira PR com preview na Vercel; merge só com aprovação do dono.

| Fase | Escopo | PRs | Estado |
|---|---|---|---|
| **A — Fundação** | Cores escritas à mão → tokens; regra de lint de design; família tipográfica | 1–2 | Itens 1 e 2 em produção (PR #14); fonte aguarda decisão |
| B — Uso diário | Financeiro (Receber, Pagar, Calendário, Recorrências, Comissões, Relatórios), Agenda (semana/dia, modais), CRM e Atendimento | 3 | Concluída (PRs #15–#17) |
| C — Clínico | Odontograma (ausente/extraído, implante, decíduo, legenda, impressão); Ortodontia, Próteses, Anamnese, Documentos (atestado e recibo impressos) | 2 | Concluída (PRs #18–#19) |
| D — Gestão | Estoque, Produtos, Movimentações; Relatórios (gráficos); Configurações, Perfil, Assinatura, Portal, IA | 2 | Concluída (PRs #20–#21) |
| E — Mobile e estados | Casca mobile (`MobileHome`, navbar, barra inferior, faixa de impersonação); estados de carregamento/vazio/erro | 2 | E1 (casca mobile) em produção (PR #23); E2 (estados) em PR |
| F — Acabamento | Acessibilidade, movimento, divisão de JS por rota, modo escuro (se aprovado), captura visual por página no CI | 2–3 | — |
| G — Super admin | 21 telas internas | 1–2 | — |

Estimativa: 13–16 PRs. A–C levam o app a ~8; E e F fazem a diferença entre 8 e 9.

### Fase A — detalhe

1. **Cores → tokens (feito na branch `design/fase-a-fundacao`).** 342 utilitários `*-[hsl(var(--legado))]` em
   25 arquivos trocados pelos tokens de mesmo valor (`flowdent-blue`→`primary`, `success-green`→`sinal-ok`,
   `card-green`→`sinal-ok-tenue` etc.). No tema claro os valores HSL são idênticos: **nenhuma mudança visual**.
   No modo escuro, algumas variáveis antigas tinham valor próprio — tratado na fase F.
2. **Lint de design (feito na mesma branch).** `eslint-rules/design-rules.cjs`:
   `design/no-arbitrary-color` (**erro**, 0 ocorrências), `design/no-gradient` (aviso, 19) e
   `design/no-transition-all` (aviso, 40). Landing excluída; `transition-all` liberado no `src/components/ui`.
   Os avisos sobem para erro quando chegarem a zero.
3. **Família tipográfica — aguarda decisão do dono.** Proposta: 3 opções aplicadas no Dashboard e no
   odontograma para comparar. Requisitos da ementa: numerais tabulares, pesos 400–700, legível a 13px,
   acentuação completa, Google Fonts ou licença web.

### Fase D1 — o que entrou

- Estoque, Produtos e Movimentações no padrão "PROPOSTO" (cabeçalho, faixa de indicadores, selos tênues, estados vazios).
- Relatórios: faixa de indicadores, gráficos com uma série em destaque, pizzas trocadas por lista ranqueada, um botão "Exportar".
- Novo componente `EstadoVazio` (`src/components/sistema`), base para a fase E.
- Bugs corrigidos: relatórios filtravam status em português (`realizado`, `faltou`…) que não existem no banco,
  e comparecimento, faltas e ativos davam sempre 0; o último dia do período ficava de fora; o gráfico mensal
  só recebia o período filtrado; Movimentações nunca carregava (join com `usuarios` inexistente);
  "movimentações hoje" contava só entre as 10 últimas; busca de produtos quebrava com vírgula ou parêntese.
- Retirados: indicador "Remarcação" (status inexistente) e o botão "Upload XML NFe", que abria um esboço.

### Fase D2 — o que entrou

- Configurações, Perfil, Assinatura e Portal do Paciente no padrão "PROPOSTO" (cabeçalho, abas, selos tênues,
  faixa de indicadores, estados vazios); rótulos e botões em caixa de frase.
- Novos componentes de sistema: `Selo`/`SeloAtivo` (selo genérico nos tons do status) e `EsqueletoSecao`
  (carregamento de seção/aba). Novo `src/lib/assinatura.ts` (nome do plano e situação da assinatura).
- **IA Assistente saiu do menu** (decisão do dono): a tela mostrava pacientes, números e automações inventados.
  A rota leva ao Dashboard e a permissão some da tela de permissões. O código segue no repositório.
- **Portal do Paciente**: números e atividades inventados trocados por convites e acessos reais. O botão de
  convite sai até o aceite funcionar (PENDENCIAS P4.12); o modal de convite ganhou busca de paciente.
  Lado do paciente: sem degradê e sem os quatro botões que não levavam a lugar nenhum.
- Retirados por serem só "em desenvolvimento" ou não funcionarem: aba "Anamnese" e aba "Contratos" de
  Configurações; abas "Contratos", "Privacidade", "Integrações", "Logs" e "Encerramento" do Perfil; cartões de
  2FA e sessões; botão "Upload foto" (não enviava nada).
- Bugs corrigidos: **troca de senha não conferia a senha atual** (qualquer pessoa com a sessão aberta trocava);
  "Portal de pagamento" no Perfil não fazia nada (agora abre o portal da Stripe via `customer-portal`);
  Configurações ignorava a impersonação e abria vazia com erro; "Responsável pela clínica" mostrava o ID cru;
  "Economize 10%" no plano anual (o desconto real é de 2 meses, ~17%, agora calculado dos preços);
  duas buscas na aba Usuários.

### Fase E1 — o que entrou

- **Casca do celular no padrão "PROPOSTO"**: barra do topo branca com logotipo e menu da conta; barra inferior com
  cinco itens na mesma linha (o "+" virou o item "Novo", sem flutuar nem sombra) e item ativo também nas rotas
  filhas; faixa de impersonação numa linha só (nome da clínica truncado).
- **Home do celular**: cabeçalho igual ao do desktop ("Hoje" e a data), faixa de indicadores (consultas,
  confirmadas, pendentes), agenda do dia em linhas com barra de status e selo, atalhos para os módulos.
  Saíram o topo em degradê, os blocos coloridos e o sino sem função.
- **Agenda do celular**: cabeçalho comum, abas Dia/Semana/Mês, filtro de profissional, mesmas linhas da home,
  estados de carregamento, vazio e erro.
- **Menu "Mais"**: a mesma lista e as mesmas permissões da sidebar (`src/lib/navegacao.ts`); ganhou Relatórios,
  Produtos e Movimentações. `ModuleCards` (tablet e celular) no padrão neutro, respeitando permissões.
- Bugs corrigidos: **a agenda do celular gravava status em português** ("confirmado"/"cancelado"); o banco recusa
  e a tela não avisava, então confirmar e cancelar pelo celular nunca funcionou. **Cancelar era um deslize no
  cartão, sem confirmação**: agora é uma ação no menu "⋮" com diálogo. Os avisos diziam "o paciente será
  notificado" (não é). Home e agenda do celular não filtravam por clínica (o super admin via consultas de todas as
  clínicas). "Perfil" no menu do topo levava a `/dashboard/profile`, rota inexistente. "2 confirmaçãoões".
  O cartão "Relatórios" levava ao Financeiro.
- Removidos 9 componentes mobile substituídos ou que não eram usados (cartão de deslizar, FAB, métricas etc.).

### Fase E2 — o que entrou

- Novos componentes de sistema: `EstadoErro` (mesmo desenho do `EstadoVazio`, com "Tentar de novo") e
  `EsqueletoLista` (carregamento no desenho da lista pronta). `DataTable` ganhou estado de erro, estado vazio
  desenhado e "Nenhum resultado para a busca" com "Limpar busca", separado de "não há registros".
- Carregamento, vazio e erro desenhados em: Pacientes, Agenda (calendário e dia), Financeiro (Receber, Pagar,
  Recorrências, Comissões), CRM (campanhas, atendimento, conversas, contatos, funil), Ortodontia, Próteses,
  Estoque, Produtos, Movimentações, Configurações (Profissionais, Usuários) e abas da ficha do paciente
  (Agendamentos, Financeiro, Imagens, Ortodontia). Antes uma falha ao carregar deixava a lista vazia, como se não
  houvesse registros, com no máximo um aviso passageiro; no CRM nem isso.
- Cabeçalho comum em Ortodontia e Próteses; botões em caixa de frase ("Novo caso", "Nova prótese", "Novo paciente").
- Bugs corrigidos: **Próteses não filtrava por clínica** (o super admin via próteses de todas as clínicas) e a
  contagem de etapas lia as etapas de todas; Produtos, Estoque, Movimentações e CRM Atendimento ignoravam a
  impersonação (liam a clínica do perfil); a busca de Pacientes consultava o servidor a cada tecla e quebrava com
  vírgula ou parênteses no termo.

## Decisões pendentes do dono

1. Família tipográfica (fase A, item 3).
2. Modo escuro: manter (fase F) ou remover.
3. Estilo de ícone e de ilustração para estados vazios (aberto na ementa).
4. Padronizar botões em caixa de frase ("Novo paciente").
