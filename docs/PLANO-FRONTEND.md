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
| **A — Fundação** | Cores escritas à mão → tokens; regra de lint de design; família tipográfica | 1–2 | **Em andamento** |
| B — Uso diário | Financeiro (Receber, Pagar, Calendário, Recorrências, Comissões, Relatórios), Agenda (semana/dia, modais), CRM e Atendimento | 3 | — |
| C — Clínico | Odontograma (ausente/extraído, implante, decíduo, legenda, impressão); Ortodontia, Próteses, Anamnese, Documentos (atestado e recibo impressos) | 2 | — |
| D — Gestão | Estoque, Produtos, Movimentações; Relatórios (gráficos); Configurações, Perfil, Assinatura, Portal, IA | 2 | — |
| E — Mobile e estados | Casca mobile (`MobileHome`, navbar, barra inferior, faixa de impersonação); estados de carregamento/vazio/erro | 2 | — |
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

## Decisões pendentes do dono

1. Família tipográfica (fase A, item 3).
2. Modo escuro: manter (fase F) ou remover.
3. Estilo de ícone e de ilustração para estados vazios (aberto na ementa).
4. Padronizar botões em caixa de frase ("Novo paciente").
