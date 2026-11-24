# Pendências — FlowDent

Ponto de retomada. Atualizado em 2026-11-24, após o merge do PR #12 (`661becb`).
Contexto da auditoria de banco: [AUDITORIA-CONSISTENCIA.md](AUDITORIA-CONSISTENCIA.md) (seção "Status da execução").

## Onde paramos

- **Produção** (Vercel + Supabase `iuoarrfjpsbtvomhfchr`, único ambiente, sem staging): 1 clínica, ~780 pacientes
  reais. Tudo abaixo já está publicado.
- **Auditoria de consistência (nov/2026):** concluída. Isolamento entre clínicas, catálogo de procedimentos por
  clínica, fonte única do vínculo usuário↔clínica, legados removidos (`20261123110000`). Migrations do PR #3
  (`20261118100000`, `…110000`, `…120000`) aplicadas.
- **Redesign das telas internas:** etapas 1 a 5 publicadas (PRs #10, #11 e #12). Ver seção "Redesign".
- **Landing:** parada por decisão do dono (possível LP com profissional externo). PRs #6 e #7 em rascunho.
- PRs abertos: #4 (CI + e2e + CORS, rascunho), #6 e #7 (landing, rascunho).

## Antes de começar qualquer pendência

```bash
cd "/Users/samiragouvea/Desktop/Digital Hera/Flowdent/flowdent"
git fetch origin && git switch main && git pull
git status          # alterações locais do dono (P2) devem continuar lá, fora de commits
```

Regras do projeto (definidas pelo dono):
- Branch própria (nunca na main), PR, build + lint + testes ao final de cada correção, responder em português.
- Migrations novas e reversíveis, com rollback em `supabase/rollbacks/` e teste em `supabase/verificacoes/`;
  sem apagar dados; testar em banco local antes.
- **Design: a ementa de identidade é a referência.** Paleta, raios (cartão 8px, botão/input 6px), alturas de
  controle (28/32/40) e escala tipográfica (h1 26/700, h2 20/600, seção 18/600, tabela 13, cabeçalho de tabela
  13/600) são **fechados**. Não criar cores fora dos tokens (`tinta`, `acento`, `bone`, `sinal-*`, `clinico-*`).
  Rótulos pequenos em caixa alta ("OCUPAÇÃO", "CONTATO") fazem parte da referência aprovada.
- Merge na main e deploy de edge functions: o dono aprova; o agente só mescla com autorização explícita.

**Acesso ao banco:** o Supabase CLI dá 403 na conta logada. Usar o conector Supabase do claude.ai
(`execute_sql`), aplicando a migration e o `INSERT` em `supabase_migrations.schema_migrations` (versão do
arquivo) na mesma transação. O conector recusa `DROP POLICY`/`DROP TABLE`: nesses casos, entregar o SQL na tela
(e `pbcopy < arquivo`) para o dono colar no SQL Editor — confirmar que o projeto selecionado é o
`iuoarrfjpsbtvomhfchr` (já rodou uma vez no projeto errado).

**`supabase db push`** envia todas as migrations pendentes, inclusive a `20260722143000` (P2). Sempre `--dry-run`
antes e retirar essa migration da pasta se ela ainda existir.

---

## Redesign das telas internas — estado

| Etapa | PR | O que entrou |
|---|---|---|
| 1 | #10 | Componentes base na escala da ementa; cores cruas do Tailwind mapeadas só para tokens existentes; sidebar e cabeçalho; correção do cabeçalho escondido sob a faixa de impersonação; **odontograma anatômico** em vetor (dentes na rampa bone, status em cor chapada da convenção clínica) e correção de mesial/distal (quadrantes 2 e 3) e vestibular/lingual (arcada inferior) |
| 2 | #11 | `CabecalhoPagina`, `FaixaIndicadores`, `SeloStatus` (`src/components/sistema`) + `src/lib/statusConsulta.ts`; Financeiro, Dashboard, Agenda e Pacientes no padrão da referência "PROPOSTO"; bugs de dados do dashboard (ver abaixo) |
| 3 | #12 | Ficha do paciente e abas |
| 4 | #12 | Modais e formulários |
| 5 | #12 | Textos: 101 exclamações removidas (landing e mensagens ao paciente fora) |

Bugs de dados corrigidos no caminho (PR #11):
- Métricas do dashboard presas no carregamento: `clinic-config` devolvia `undefined`; faturamento mandava os
  780 IDs de pacientes na URL (`.in(...)`). Agora filtra pela clínica via join.
- "Pagamentos atrasados" sempre 0: usava `payments.due_date` (coluna inexistente). Agora `receivable_titles`
  com a regra de vencido do Contas a Receber (7 vencidos em 2026-11-24).

Próximas etapas sugeridas do redesign (não iniciadas):
1. Telas ainda não revisadas uma a uma: CRM, Ortodontia, Próteses, Estoque, Relatórios, Configurações,
   Portal do Paciente, IA Assistente, Super Admin. Mesmo método: `CabecalhoPagina`, `FaixaIndicadores`,
   selos tênues, ações em caixa normal.
2. Layout mobile: com a faixa de impersonação ativa há uma faixa vazia sob ela (navbar mobile escondida);
   revisar a casca mobile (`Navbar`, `MobileBottomNav`, `MobileHome`).
3. **Família tipográfica: decisão aberta do dono** (ementa, seção 4). Hoje roda na fonte de sistema.
   Requisitos: numerais tabulares, pesos 400–700, legível a 13px, acentuação completa, Google Fonts ou
   licença web. A Geist foi testada e retirada por não ter sido aprovada.
4. Títulos e botões em "Title Case" ("Novo Paciente", "Ver Horários", "Agendar Consulta") → caixa de frase,
   se o dono quiser padronizar.

---

## P1 — Conferências manuais em produção (dono do projeto)

1. Com a **conta da clínica** (não como super admin): abrir "Novo orçamento" e "Aprovar orçamento" e conferir
   os modais; conferir no Dashboard "Pagamentos atrasados" = número real.
2. CRM → "Configurar WhatsApp (Z-API)": abre sem erro; com configuração salva, tokens aparecem vazios com
   "Token salvo — preencha só para trocar".
3. Onboarding com conta nova (clínica e consultório liberal): o dono termina como **admin** e abre Configurações.
4. Encerrar a impersonação ("Encerrar" na faixa) depois de usar, para fechar o registro na auditoria.

## P2 — Alterações locais não commitadas (decisão do dono)

Na pasta do projeto, fora de qualquer commit (não incluir em PRs sem o dono pedir):
- `src/components/configuracoes/ProcedimentosTab.tsx` e `src/utils/criarPlanoPadrao.ts`: lógica para
  "popular Tabela Padrão vazia". Partem do modelo antigo do catálogo. Com a RLS nova, `criarPlanoPadrao`
  copia catálogo do sistema + procedimentos da própria clínica — testar antes de commitar.
  Atenção ao rodar scripts que editam o código em massa: excluir esses dois arquivos.
- `supabase/migrations/20260722143000_populate_empty_default_procedure_plans.sql`: **não aplicar**
  (`CROSS JOIN` do catálogo com o plano padrão de todas as clínicas; não há planos vazios). Recomendação: apagar.

## P3 — Legados do schema

**Concluído em 2026-11-23** (`20261123100000` renomear, `20261123110000` dropar; `WhatsAppConfigModal.tsx`
removido; `types.ts` regenerado).

## P4 — Achados ainda não tratados

Em ordem de prioridade sugerida:

1. **Campanhas do CRM saem sem destinatários** (`NovaCampanhaModal.tsx`): a busca usa `patients.nome` e
   `patients.telefone` (colunas inexistentes; são `full_name` e `phone`) e **ignora o segmento escolhido**.
   Corrigir só as colunas faria uma campanha para "Inativos" enviar WhatsApp a **todos** os pacientes com
   telefone. Implementar o filtro de segmento junto, com aprovação do dono (envio em massa a pacientes reais).
2. **Super admin não lê `receivable_titles`** (só há policy por clínica): visualizando uma clínica, o super
   admin vê "Pagamentos atrasados" = 0 e o Contas a Receber vazio. Decidir se o super admin deve ler
   (policy `is_super_admin`) — impersonação hoje é só no cliente, as consultas rodam como super admin.
3. **RPCs SECURITY DEFINER com `_user_id` livre** (`get_user_clinic_id`, `has_role`, `get_user_perfil`,
   `is_super_admin`): revelam clínica/perfil de outros usuários. `20261118100000` tratou as de gatilho e o
   onboarding; estas 6 seguem expostas porque estão dentro de policies. Avaliar versões sem parâmetro.
4. **Referências cruzadas em INSERT**: policies validam o `clinic_id` do registro, mas não que o
   `patient_id`/`professional_id`/`procedure_id` referenciado seja da mesma clínica (`budgets`,
   `budget_items.procedure_id`, `appointments.dentist_id`). Mesma técnica do trigger `guard_plano_item_procedimento`.
5. **Consultas com listas de IDs na URL** (`.in("patient_id", ids)`): quebram com muitos pacientes. Corrigidas
   no dashboard; `Ortodontia.tsx` usa o padrão com lista pequena (ok hoje). Procurar outros casos ao mexer nas telas.
6. **`send-whatsapp` lê colunas inexistentes** (`mensagem_confirmacao`, `mensagem_lembrete`): sempre cai no
   texto padrão. Mensagens personalizadas seriam funcionalidade nova → precisa de aprovação.
7. **`producao_eventos` vazia**: o fechamento de comissões lê uma tabela que nada preenche.
8. **Tabelas incompletas**: `cadeiras` (sem uso na agenda), `repasse_regras` (sem tela de escrita).
9. **Catálogo de procedimentos**: o dono da clínica não altera os 335 procedimentos do sistema pela
   importação (só super admin). Decidir se precisa.

## P5 — Higiene do repositório

1. **Migrations não recriam o banco do zero** (impede staging/CI): `20251030203313` exige `admin@admin.com`,
   `20260109011955` usa UUID fixo de produção, `20260121125350` faz `UPDATE` de trial de uma clínica.
   Desenhar solução sem editar migrations aplicadas (ex.: `supabase/seed.sql` local).
2. **CI (PR #4, rascunho)**: teto de lint em 468 erros — a `main` está em 465; dá para baixar. Os testes de
   `supabase/verificacoes/` dependem do item 1.
3. **Lint**: 465 erros / 590 avisos pré-existentes (maioria `no-explicit-any`). Não bloqueia.
4. **Vercel**: variáveis `VITE_SUPABASE_*` agora valem também para **Preview** (antes os previews abriam em
   branco). Aviso de `install-scripts` do npm — inofensivo.
5. **Supabase CLI** local v2.98.2 (há v3) e sem permissão no projeto (403).
6. Branches já mescladas que podem ser apagadas: `fix/isolamento-clinicas`, `fix/procedimentos-por-clinica`,
   `fix/isolamento-etapa3`, `fix/vinculo-clinica-fonte-unica`, `chore/consistencia-etapa5`,
   `chore/remover-legados`, `chore/dropar-legados`, `design/redesign-app`, `design/telas-etapa2`,
   `design/ficha-paciente`, `marca/logotipo-svg`.

## Como testar localmente

**Banco** (receita usada na auditoria):
1. Docker Desktop aberto. O outro projeto do dono (`gendex2.0`) ocupa as portas 5432x: usar uma cópia de
   `supabase/` numa pasta temporária com portas 544xx no `config.toml` (api 54421, db 54422).
2. Acrescentar à cópia a pré-migration local `20251030203000_local_only_seed_admin.sql` com os usuários fictícios
   que as migrations antigas exigem (`admin@admin.com` e o UUID `9fa2445b-2561-4fe2-bb3a-507427294f32`).
3. `supabase start --workdir <pasta> -x studio,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor,realtime`
4. `psql postgresql://postgres:postgres@127.0.0.1:54422/postgres -v ON_ERROR_STOP=1 -f supabase/verificacoes/<teste>.sql`
5. Ao final: `supabase stop --no-backup --workdir <pasta>`.

**Front:** `npx vite --port 5179` usa o `.env` (Supabase de produção). Para ver telas da clínica como super
admin: Super Admin → Locatários → ícone de pessoa (impersonação, registrada em `admin_impersonation_logs`).
Para conferir o odontograma com marcações sem gravar dados, montar uma prévia local temporária e apagá-la
antes do commit.
