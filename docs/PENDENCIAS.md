# Pendências — FlowDent

Ponto de retomada. Atualizado em 2026-11-23.
Contexto completo: [AUDITORIA-CONSISTENCIA.md](AUDITORIA-CONSISTENCIA.md) (seção "Status da execução").

## Atualização 2026-11-23

- PRs mesclados desde a auditoria: #2 (quality gates ESLint, fase 1) e #3 (design system: tokens, densidade).
- **Migrations do PR #3 aplicadas em produção**: `20261118100000` (REVOKE em funções de gatilho e
  `complete_user_onboarding`), `20261118110000` (`search_path`), `20261118120000` (17 policies passam a usar
  `get_user_clinic_id()`; nenhuma policy lê mais `profiles`). Testadas localmente (79/79) antes.
- **P3 passo 1 aplicado**: `20261123100000_renomear_legados` (tabelas/coluna viraram `_legacy_*`),
  `WhatsAppConfigModal.tsx` removido. Falta o passo 2 (DROP) — ver P3.
- **Landing parada por decisão do dono** (possível LP com profissional externo). PRs #6 e #7 ficam em rascunho.
- **Redesign do app (telas internas) pedido pelo dono**, ainda não iniciado. Perguntas em aberto: escopo só
  app?, mesclar PR #5 (logo) antes?, referência visual? Proposta: casca do app + componentes base primeiro,
  depois dashboard, agenda, paciente, financeiro.
- PRs abertos: #4 (CI + e2e, rascunho), #5 (logo, aberto), #6/#7 (landing, rascunho).
- **Acesso ao banco**: o Supabase CLI perdeu permissão (403 na conta logada). Usar o conector Supabase do
  claude.ai (`execute_sql`). O conector recusa `DROP POLICY`/`DROP TABLE`: nesses casos, gerar o SQL
  (com o `INSERT` em `supabase_migrations.schema_migrations`) e o dono roda no SQL Editor.
- Banco local de teste: o outro projeto do dono (`gendex2.0`) ocupa as portas 5432x; a cópia de teste usa
  544xx (api 54421, db 54422).

## Onde paramos (2026-11-04)

- Auditoria de consistência concluída (etapas 1–5). Migrations `20261102120000` … `20261102160000`
  **aplicadas em produção**; 24 edge functions publicadas; front publicado na Vercel (build com npm).
- Projeto Supabase de produção: `iuoarrfjpsbtvomhfchr` (único ambiente; não há staging).
- Testes de banco: `supabase/verificacoes/*.test.sql` (79 verificações). Rodam em transação com ROLLBACK.
- Produção tinha 1 clínica e 1 usuário com clínica (dono, perfil admin, não é super admin).

## Antes de começar qualquer pendência

```bash
cd "/Users/samiragouvea/Desktop/Digital Hera/Flowdent/flowdent"
git fetch origin && git switch main && git pull     # main local ainda está antes do merge
git status                                           # ver alterações locais (item P2)
supabase migration list --linked                     # só 20260722143000 deve aparecer pendente
```

Regras do projeto (definidas pelo dono): branch própria (nunca na main), migrations novas e reversíveis
com rollback em `supabase/rollbacks/`, sem apagar dados, testar em banco local antes, rodar build + lint
+ testes ao final de cada correção, responder em português.

**Atenção ao usar `supabase db push`:** ele envia todas as migrations pendentes, inclusive a
`20260722143000` (ver P2). Sempre rode `--dry-run` antes e retire essa migration da pasta se ela ainda existir.

---

## P1 — Conferências manuais em produção (dono do projeto)

Bloqueia: nada, mas valida as etapas 3 e 4.

1. CRM → modal "Configurar WhatsApp (Z-API)": deve abrir sem erro. Com configuração salva, os campos de
   token aparecem vazios com "Token salvo — preencha só para trocar".
2. Onboarding com conta nova (clínica e consultório liberal): o dono deve terminar como **admin** e
   conseguir abrir Configurações.
3. Se algo falhar, verificar no banco (só leitura):
   ```sql
   select u.id, u.perfil, u.clinica_id, p.clinic_id
   from usuarios u join profiles p on p.id = u.id
   order by u.created_at desc limit 5;
   ```

## P2 — Alterações locais não commitadas (decisão do dono)

Na pasta do projeto, fora de qualquer commit:
- `src/components/configuracoes/ProcedimentosTab.tsx` e `src/utils/criarPlanoPadrao.ts`: lógica para
  "popular Tabela Padrão vazia". Partem do modelo antigo do catálogo (antes da etapa 2). Revisar: com
  RLS nova, `criarPlanoPadrao` copia catálogo do sistema + procedimentos da própria clínica — provavelmente
  continua correto, mas precisa ser testado antes de commitar.
- `supabase/migrations/20260722143000_populate_empty_default_procedure_plans.sql`: **não aplicar**.
  Faz `CROSS JOIN` do catálogo inteiro com o plano padrão de todas as clínicas; hoje não há planos vazios.
  Recomendação: apagar o arquivo.

Passos: perguntar ao dono → se aprovar, criar branch, ajustar/commitar os dois arquivos, apagar a migration.

## P3 — Remoção definitiva de legados (após P1 validado)

Marcados com `COMMENT 'LEGADO…'` na migration `20261102160000`. Todos com 0 linhas em 2026-11-02.

| Objeto | Referências restantes |
|---|---|
| tabela `whatsapp_config` | só `src/components/configuracoes/WhatsAppConfigModal.tsx` (não montado em nenhuma tela) |
| coluna `appointments.duracao_minutos` | nenhuma (app parou de ler na etapa 5) |
| tabela `tenant_feature_overrides` | nenhuma |

Passos:
1. ~~Revalidar contagens e referências~~ — feito em 2026-11-23.
2. ~~Remover `WhatsAppConfigModal.tsx`~~ — feito (branch `chore/remover-legados`).
3. ~~Renomear para `_legacy_*`~~ — aplicado em produção (`20261123100000_renomear_legados`).
   **Falta:** depois de um ciclo sem erro, migration de `DROP` de `_legacy_whatsapp_config`,
   `_legacy_tenant_feature_overrides` e `appointments._legacy_duracao_minutos` (o dono roda o SQL; o
   conector recusa DROP).
4. Regenerar `src/integrations/supabase/types.ts` (ver P5) — ainda cita os nomes antigos.

## P4 — Achados da auditoria ainda não tratados

Em ordem de prioridade sugerida:

1. **RPCs SECURITY DEFINER que aceitam qualquer `_user_id`**: `get_user_clinic_id`, `has_role`,
   `get_user_perfil`, `is_super_admin` revelam clínica/perfil de outros usuários.
   Passo: `REVOKE EXECUTE … FROM anon`; avaliar `REVOKE` de `authenticated` e versões sem parâmetro.
   Cuidado: são usadas dentro de policies e por `requireUserClinic` (edge functions, via service_role).
2. **Referências cruzadas em INSERT**: policies validam o `clinic_id` do registro, mas não que o
   `patient_id`/`professional_id`/`procedure_id` referenciado seja da mesma clínica (ex.: `budgets`,
   `budget_items.procedure_id`, `appointments.dentist_id`). Mesma técnica do trigger
   `guard_plano_item_procedimento` (etapa 2).
3. **`send-whatsapp` lê colunas inexistentes** (`mensagem_confirmacao`, `mensagem_lembrete` em
   `whatsapp_configs`): sempre cai no texto padrão. Decidir se as mensagens personalizadas devem existir
   (seriam funcionalidade nova → precisa de aprovação).
4. **`producao_eventos` vazia**: o fechamento de comissões (`FechamentoComissoesModal.tsx`) lê uma tabela
   que nada preenche. Investigar de onde deveria vir a produção.
5. **Tabelas incompletas**: `cadeiras` (cadastro sem uso na agenda), `repasse_regras` (sem tela de escrita).
   Só documentar/decidir; não é correção estrutural.
6. **Catálogo de procedimentos**: o dono da clínica não altera mais os 335 procedimentos do sistema pela
   importação (só super admin). Se for necessário, decidir entre dar papel de super admin ou atribuir o
   catálogo à clínica.
7. ~~17 policies ainda leem `profiles.clinic_id` direto~~ — resolvido por `20261118120000` (PR #3).
   Item 1 acima foi parcialmente tratado por `20261118100000` (funções de gatilho e onboarding); as 6
   funções usadas em policies continuam expostas por necessidade.

## P5 — Higiene do repositório

1. **Migrations não recriam o banco do zero** (impede staging/CI):
   - `20251030203313` exige `admin@admin.com` em `auth.users`;
   - `20260109011955` insere o UUID fixo de um usuário de produção em `user_roles`;
   - `20260121125350` faz `UPDATE` de trial de uma clínica específica.
   Para testar localmente foi usada uma pré-migration só local
   (`20251030203000_local_only_seed_admin.sql`, numa cópia em scratchpad). Solução definitiva a desenhar
   sem editar migrations já aplicadas (ex.: `supabase/seed.sql` local).
2. **Regenerar tipos**: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`
   (colunas novas: `procedimentos.clinica_id`; funções novas: `is_clinic_admin` etc.). Rodar build depois.
3. **Testes automatizados**: não existem no front. Sugestão: rodar `supabase/verificacoes/*.test.sql` em CI
   com `supabase start` (depende do item 1).
4. **Lint**: 561 problemas pré-existentes (maioria `no-explicit-any`). Não bloqueia.
5. **Supabase CLI** local está na v2.98.2 (há v3.0.0).
6. **Vercel**: aviso de `install-scripts` do npm (`@swc/core`, `core-js`, `esbuild`) — inofensivo hoje.
7. Branches já mescladas podem ser apagadas: `fix/isolamento-clinicas`, `fix/procedimentos-por-clinica`,
   `fix/isolamento-etapa3`, `fix/vinculo-clinica-fonte-unica`, `chore/consistencia-etapa5`.

## Como testar localmente (receita usada nas etapas)

1. Docker Desktop aberto.
2. Copiar `supabase/config.toml` e `supabase/migrations/` para uma pasta temporária e acrescentar a
   pré-migration local `20251030203000_local_only_seed_admin.sql` com os usuários fictícios que as
   migrations antigas exigem (`admin@admin.com` e o UUID `9fa2445b-2561-4fe2-bb3a-507427294f32`).
3. `supabase start --workdir <pasta> -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,supavisor,realtime`
4. `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/verificacoes/<teste>.sql`
5. Edge functions: `supabase functions serve --workdir <pasta> --no-verify-jwt` e OPTIONS em cada função.
6. Ao final: `supabase stop --no-backup --workdir <pasta>`.
