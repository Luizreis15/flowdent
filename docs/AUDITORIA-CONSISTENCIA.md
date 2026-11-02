# Auditoria de consistência — FlowDent

Data: 2026-11-02 · Escopo: `supabase/migrations` (116 arquivos), `supabase/functions`, `src/` · Branch analisada: `main` (`e5078d4`) + alterações locais não commitadas.

## Como foi feito e limites

- Estado final de tabelas, RLS e policies **reconstruído estaticamente** a partir das migrations, em ordem. Colunas e FKs conferidas contra `src/integrations/supabase/types.ts`, que é gerado a partir do banco real.
- **Não houve acesso ao banco.** Policies criadas pelo painel do Supabase, fora das migrations, não aparecem aqui. A seção [Verificação no banco](#verificação-no-banco-somente-leitura) traz consultas só de leitura para confirmar cada achado em produção.
- Nada foi alterado no código nem no banco.

### Atenção: alterações locais não commitadas

`src/components/configuracoes/ProcedimentosTab.tsx`, `src/utils/criarPlanoPadrao.ts` e a migration não rastreada `20260722143000_populate_empty_default_procedure_plans.sql`. **Não aplique essa migration antes de corrigir o item 5.** Ela faz `CROSS JOIN` de todo o catálogo `procedimentos` com o plano padrão de **todas** as clínicas, e o catálogo hoje contém procedimentos criados por clínicas específicas (ver 5).

---

## Resumo por gravidade

| # | Achado | Gravidade |
|---|---|---|
| A1 | Qualquer usuário pode trocar o próprio `profiles.clinic_id` e passar a acessar outra clínica | **Crítica** |
| A2 | `has_role(...,'admin')` não considera a clínica e amplia A1 e outras policies | Alta |
| 5 | `procedimentos` é um catálogo global que qualquer clínica pode alterar: escrever, sobrescrever e apagar | **Alta** |
| A3 | `role_audit_log`: admin de qualquer clínica lê o log de todas | Alta |
| A4 | `reviews`: qualquer usuário autenticado insere avaliação em qualquer clínica | Média |
| A5 | `whatsapp-webhook` sem autenticação: injeção de mensagens no CRM de uma clínica | Média |
| A6 | Tokens do WhatsApp (`whatsapp_configs`) legíveis por qualquer perfil da clínica | Média |
| A7 | Admin de clínica altera plano, status e vencimento da assinatura em `clinicas` | Média (cobrança) |
| A8 | Duas fontes de vínculo com a clínica (`profiles.clinic_id` × `usuarios.clinica_id`) | Média (estrutural) |
| 1 | `clinics`/`professionals` não estão duplicadas (foram renomeadas); só `whatsapp_config` × `whatsapp_configs` estão | Baixa |
| 2 | FKs cruzadas já corrigidas no banco real pelo rename | Baixa |
| 3 | Mistura de idiomas; `duracao_minutos` é uma coluna morta | Baixa |
| 4 | Tabelas pouco usadas | Baixa |
| 6 | Três lockfiles versionados; `dist` não está versionado | Baixa |

RLS está habilitado nas 108 tabelas do schema `public`, e toda tabela tem ao menos uma policy. Das 334 policies, 215 dependem de `get_user_clinic_id()` ou de `profiles.clinic_id`, e por isso A1 afeta praticamente todo o isolamento.

---

## Item 5 — `procedimentos`: catálogo global sem dono

### Evidência

- Criação: `20251028004735_…sql:2-10`. A tabela tem `codigo_sistema TEXT NOT NULL UNIQUE` e nenhuma coluna `clinica_id`.
- Policies vigentes, depois de todas as migrations:
  - `"Todos podem ver procedimentos base"`: `FOR SELECT USING (true)`, sem `TO`, portanto vale também para **anon** (`20251028004735:56`). A migration `20260121125350` tentou restringir o catálogo a `authenticated`, mas removeu policies com outros nomes. Esta continua ativa.
  - `"Authenticated users can read procedimentos"`: `SELECT USING (true)` (`20260121125350:13`).
  - `"Admins podem gerenciar procedimentos base"`: `FOR ALL USING (has_role(auth.uid(),'admin'))` (`20251028004735:61`). `has_role` aceita `usuarios.perfil = 'admin'` de **qualquer** clínica (`20260121145857`). Resultado: o admin de qualquer clínica pode fazer INSERT, UPDATE e DELETE no catálogo de todas.
  - `"Usuarios com clinica podem inserir procedimentos"`: `FOR INSERT` para qualquer usuário com `profiles.clinic_id` preenchido (`20260109030606:2`). **Não foi removida**: `20260121125350` removeu só a policy de UPDATE.
- O app trata o catálogo como se fosse da clínica e grava nele:
  - [NovoProcedimentoInline.tsx:52](../src/components/orcamentos/NovoProcedimentoInline.tsx#L52): `insert` em `procedimentos` a partir do orçamento.
  - [AdicionarProcedimentoPlanoModal.tsx:180](../src/components/configuracoes/AdicionarProcedimentoPlanoModal.tsx#L180): `insert`.
  - [NovoPlanoProcedimentosModal.tsx:201](../src/components/configuracoes/NovoPlanoProcedimentosModal.tsx#L201): `insert` na importação por arquivo.
  - [ImportProcedimentosModal.tsx:157-176](../src/components/configuracoes/ImportProcedimentosModal.tsx#L157-L176): **`update` de `descricao`, `especialidade` e `valor` por `codigo_sistema`** no catálogo global.
- O app lê o catálogo inteiro sem filtro e copia tudo para planos da clínica: [criarPlanoPadrao.ts:58](../src/utils/criarPlanoPadrao.ts#L58), [NovoPlanoProcedimentosModal.tsx:165](../src/components/configuracoes/NovoPlanoProcedimentosModal.tsx#L165), e a migration local `20260722143000`.
- `planos_procedimentos_itens.procedimento_id … ON DELETE CASCADE` (`20251028004735:28`).

### Conclusão

O catálogo foi desenhado como **global** (tabela de referência do sistema), mas o app o usa como **catálogo da clínica**. Riscos concretos:

1. **Vazamento:** um procedimento criado pela clínica A (nome e preço) aparece para todas as clínicas e entra no "Tabela Padrão" e nos planos "base" das clínicas que os criarem depois.
2. **Alteração cruzada:** quando o admin da clínica A importa uma planilha, `descricao`, `especialidade` e `valor` mudam para todas as clínicas. Os planos já existentes guardam `valor_customizado`, mas exibem a descrição vinda do catálogo.
3. **Exclusão cruzada:** um DELETE feito por um admin de A remove, por CASCADE, o item dos planos de **todas** as clínicas. A exclusão só é bloqueada se houver `budget_items.procedure_id` apontando para o procedimento, porque essa FK não tem `ON DELETE`.
4. **Colisão:** como `codigo_sistema` é UNIQUE global, a clínica B não consegue criar um código que A já usou, e a mensagem "Código de procedimento já existe" revela que esse código existe.
5. O catálogo é legível por anon. A sensibilidade é baixa (é a tabela base), mas não era o que se pretendia.

### Correção proposta

- Adicionar `procedimentos.clinica_id uuid NULL REFERENCES clinicas(id)`. `NULL` marca o catálogo do sistema; preenchido, o procedimento é da clínica.
- Trocar `UNIQUE(codigo_sistema)` por dois índices únicos parciais: `(codigo_sistema) WHERE clinica_id IS NULL` e `(clinica_id, codigo_sistema) WHERE clinica_id IS NOT NULL`.
- Novas policies:
  - SELECT, para `authenticated`: `clinica_id IS NULL OR clinica_id = get_user_clinic_id(auth.uid())`.
  - INSERT, UPDATE e DELETE: só `clinica_id = get_user_clinic_id(auth.uid())`, sempre com `WITH CHECK`.
  - Catálogo do sistema (`clinica_id IS NULL`): escrita só por `is_super_admin`.
  - Remover as duas policies de SELECT abertas e as policies `FOR ALL` admin e INSERT atuais.
- **Migração de dados sem apagar nada:** atribuir `clinica_id` aos procedimentos que não pertencem ao catálogo original. Isso exige identificar a origem, por exemplo pelo `created_at` posterior à carga inicial e pelos `planos_procedimentos_itens` que os referenciam: se só planos de uma clínica usam o procedimento, ele é dessa clínica. Procedimentos ambíguos (usados por mais de uma clínica) entram em uma lista para decisão manual. **Esta etapa precisa de uma consulta no banco antes; ver V5.**
- Código: os inserts passam a enviar `clinica_id`, e a importação deixa de dar `update` no catálogo global (passa a criar ou atualizar o procedimento da própria clínica). `criarPlanoPadrao` e a migration local filtram `clinica_id IS NULL`.
- Rollback: remover as novas policies e restaurar as antigas; manter a coluna (nullable, não quebra nada).

---

## Isolamento entre clínicas

### A1 — Troca do próprio `profiles.clinic_id` (crítica)

**Evidência**
- `profiles`: a única policy de UPDATE é `"Users can update their own profile" USING (auth.uid() = id)`, sem `WITH CHECK` (`20251027012048`). O Postgres reaplica o USING como check, o que não restringe nenhuma coluna.
- Os únicos triggers em `profiles` atualizam `updated_at` (`20251027012048:172`, `20251028210714:206`). Não há `REVOKE UPDATE (clinic_id)` em nenhuma migration.
- O próprio app grava `profiles.clinic_id` pelo cliente: [Clinica.tsx:68](../src/pages/onboarding/Clinica.tsx#L68), [Profissional.tsx:63](../src/pages/onboarding/Profissional.tsx#L63), [Profissional.tsx:109](../src/pages/onboarding/Profissional.tsx#L109).
- `get_user_clinic_id()` retorna `COALESCE(profiles.clinic_id, usuarios.clinica_id)`, com **profiles em primeiro** (`20260109031852:2-11`). Policies de `appointments`, `reviews`, `whatsapp_configs` e outras usam `profiles.clinic_id` diretamente.
- O storage (`patient-files`, `20260223222333`) e as edge functions (`_shared/auth.ts` → `requireUserClinic` → `rpc('get_user_clinic_id')`) usam a mesma fonte.

**Cenário:** qualquer conta autenticada (o cadastro de trial é aberto) executa no console do navegador `supabase.from('profiles').update({ clinic_id: '<uuid da clínica alvo>' }).eq('id', meuId)`. A partir daí, todas as policies baseadas em `get_user_clinic_id` liberam pacientes, prontuários, financeiro, CRM e arquivos da clínica alvo. Se a conta for admin da própria clínica, que é o caso de quem criou um trial, `has_role('admin')` continua verdadeiro (A2) e o acesso inclui escrita e exclusão. O único pré-requisito é conhecer o UUID da clínica. UUID não é segredo: ex-funcionários e consultores que atendem várias clínicas o conhecem, e ele aparece no caminho `clinicas/<uuid>/…` dos arquivos do storage.

**Correção proposta**
1. Trigger `BEFORE UPDATE` em `profiles` (e o mesmo em `usuarios.clinica_id`) que rejeita mudança de `clinic_id`, com estas exceções: (a) a requisição vem de `service_role`; (b) `OLD.clinic_id IS NULL` e a clínica de destino tem `owner_user_id = auth.uid()`. A exceção (b) mantém o onboarding atual funcionando sem mudar o front.
2. Em seguida, passar o onboarding para a RPC `complete_user_onboarding`, que já existe (`20251027155551:92`), e remover os `update` de `clinic_id` do cliente.
3. Rollback: `DROP TRIGGER`.
4. Teste: com um usuário de teste, um UPDATE de `clinic_id` para uma clínica de terceiros precisa retornar erro. Um usuário novo sem clínica que cria a própria clínica precisa continuar conseguindo vincular-se a ela.

### A2 — `has_role('admin')` não considera a clínica

`has_role` aceita `user_roles` (role global) **ou** `usuarios.perfil`, sem relação com a clínica do registro (`20260121145857`). A maioria das policies combina `has_role` com um filtro de clínica (ok), mas não `procedimentos` (item 5) nem `role_audit_log` (A3). **Correção:** criar `is_clinic_admin(_user_id, _clinic_id)` e usá-la nessas policies. `has_role` continua existindo para compatibilidade.

### A3 — `role_audit_log` visível entre clínicas

`"Admins can view audit logs for their clinic" USING (has_role(auth.uid(),'admin'))` (`20251027155551`) não tem filtro de clínica, apesar do nome. O admin de qualquer clínica lê as mudanças de perfil de todos os usuários do sistema. **Correção:** filtrar pelo `usuarios.clinica_id` do usuário afetado.

### A4 — `reviews` aceita insert em qualquer clínica

`"Authenticated users can create reviews" WITH CHECK (auth.uid() IS NOT NULL)` (`20251027014321`). Qualquer conta cria avaliações com qualquer `clinic_id` e `patient_id`. **Correção:** `WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()) AND patient_id IN (pacientes da clínica))`. Se a avaliação for enviada pelo paciente via link, isso deve passar por uma edge function com token.

### A5 — `whatsapp-webhook` sem autenticação

[whatsapp-webhook/index.ts:41-96](../supabase/functions/whatsapp-webhook/index.ts#L41-L96): `verify_jwt = false`, sem segredo nem assinatura. A clínica é identificada só pelo `instanceId` do body. Quem conhece o `instanceId` cria contatos, conversas e mensagens no CRM dessa clínica. O caminho de `MessageStatusCallback` (linha 59) altera o status de `crm_messages` só pelo `whatsapp_message_id`, sem considerar a clínica. **Correção:** validar o `client_token` da instância, que `whatsapp_configs` já armazena, ou um segredo na URL do webhook, e filtrar o update de status por `clinica_id`.

### A6 — Tokens do WhatsApp legíveis por qualquer perfil

As policies de `whatsapp_configs` liberam SELECT, INSERT, UPDATE e DELETE para **qualquer** usuário da clínica (recepção, assistente), via `profiles.clinic_id` (`20251031041055`). A tabela guarda `access_token`, `instance_token`, `client_token` e `session_data`. **Correção:** restringir a escrita a admin da clínica e tirar os tokens do cliente (uma view sem as colunas secretas, ou leitura só via edge function).

### A7 — Admin altera colunas de cobrança de `clinicas`

`"Owners e admins podem atualizar sua clínica"` (`20251027170132`) não restringe colunas, e nenhum trigger protege `plano`, `status_assinatura`, `current_period_end`, `stripe_*` ou `owner_user_id`. O admin pode estender o próprio trial ou trocar de plano sem pagar. **Correção:** trigger que bloqueia mudanças nessas colunas fora de `service_role` ou `is_super_admin`.

### A8 — Duas fontes de vínculo com a clínica

`profiles.clinic_id` e `usuarios.clinica_id` representam a mesma coisa. Se divergirem, `get_user_clinic_id` usa `profiles`, enquanto várias policies (`usuarios`, `clinic_permissions`, `whatsapp_config`, DELETE de `appointments`) usam `usuarios`. Um usuário pode, portanto, ter permissões de duas clínicas diferentes. **Correção (estrutural, depois de A1):** eleger `usuarios.clinica_id` como fonte única, sincronizar `profiles.clinic_id` por trigger e fazer `get_user_clinic_id` ler só de `usuarios`. Antes disso, rodar V3 para ver se já existem divergências.

### Outros pontos de isolamento (menor gravidade)

- INSERT de tabelas filhas valida o `clinic_id` do registro, mas não que o `patient_id` ou `professional_id` referenciado seja da mesma clínica (ex.: `budgets`, `appointments.dentist_id`). Isso não vaza dados, mas permite referências cruzadas inconsistentes.
- As RPCs `get_user_clinic_id(_user_id)`, `has_role(_user_id, …)`, `get_user_perfil(_user_id)` e `is_super_admin(_user_id)` são `SECURITY DEFINER` e aceitam qualquer `_user_id`: revelam a clínica, o perfil e o status de super admin de outros usuários. **Correção:** `REVOKE EXECUTE … FROM anon`, e avaliar versões sem parâmetro que usam `auth.uid()`.
- Edge functions de cron (`send-*-reminders`, `run-crm-automations`) usam `requireInternalOnly`: ok. `stripe-webhook` valida assinatura e `yampi-webhook` valida segredo: ok. `invite-user` ignora o `clinicaId` do body e usa a clínica do chamador: ok.

---

## Item 1 — Tabelas "duplicadas"

| Par | Situação real | Evidência |
|---|---|---|
| `clinics` × `clinicas` | **Não estão duplicadas.** `clinics` foi renomeada para `clinicas`. As FKs que apontavam para `clinics` acompanharam o rename. | `20251027170132:2` `ALTER TABLE clinics RENAME TO clinicas`. `types.ts` não tem `clinics`. |
| `professionals` × `profissionais` | **Não estão duplicadas.** Rename. | `20251027171852:2`. `types.ts` não tem `professionals`. |
| `whatsapp_config` × `whatsapp_configs` | **Estão duplicadas.** `whatsapp_configs` é a usada: CRM ([CRMAtendimento.tsx:39](../src/pages/dashboard/CRMAtendimento.tsx#L39), [ConfigurarWhatsAppModal.tsx](../src/components/crm/ConfigurarWhatsAppModal.tsx)) e as funções `send-whatsapp`, `whatsapp-webhook` e `whatsapp-qr-connect`. `whatsapp_config` só aparece em [WhatsAppConfigModal.tsx](../src/components/configuracoes/WhatsAppConfigModal.tsx), que **não é montado em nenhuma tela**. | `whatsapp_config` vem de `20260128221406:75`; `whatsapp_configs` vem de `20251031041055:2`. |

`whatsapp_config` tem campos que `whatsapp_configs` não tem (`confirmacao_automatica`, `lembrete_1h`, `lembrete_24h`, `mensagem_confirmacao`, `mensagem_lembrete`). **Correção proposta:** verificar se há linhas (V6). Se houver, migrar esses campos para `whatsapp_configs` (ou `configuracoes_clinica`), criar uma view `whatsapp_config` de compatibilidade e remover o modal órfão. A remoção da tabela fica para uma etapa posterior.

## Item 2 — Referências cruzadas

Pelo `types.ts`, as FKs reais no banco são:
- `appointments.dentist_id → profissionais`. A migration inicial (`20251027012048:102`) apontava para `profiles`, mas o banco real já não aponta. **Confirmar com V4**, porque nenhuma migration do repositório mostra essa troca e ela pode ter sido feita pelo painel.
- `treatments.professional_id → profissionais` e `treatment_items.professional_id → profissionais`: consistentes, porque `professionals` virou `profissionais`.
- A migration inicial também criou `patients.clinic_id REFERENCES profiles(id)` (`20251027012048:62`); hoje a FK aponta para `clinicas`, também sem migration correspondente.

Conclusão: o repositório **não reproduz o banco**. Recriar o banco do zero a partir das migrations (staging, local) geraria FKs diferentes das de produção. **Correção:** gerar um dump do schema de produção (`supabase db dump --schema public`) e registrar uma migration de reconciliação.

## Item 3 — Idiomas e convenções

- Tabelas: em inglês (`appointments`, `patients`, `budgets`, `treatments`, `financial_*`, `ortho_*`, `expense_*`) e em português (`clinicas`, `profissionais`, `usuarios`, `procedimentos`, `proteses`, `cadeiras`).
- Coluna de clínica: `clinic_id` em 32 tabelas e `clinica_id` em 23. É a inconsistência que mais gera erro em policy e em query.
- `appointments.duracao_minutos` (`20260122001958`) existe ao lado de `duration_minutes` (default 60). O único uso é a leitura em [useAvailableSlots.tsx:141](../src/hooks/useAvailableSlots.tsx#L141) (`duration_minutes || duracao_minutos`), e nenhum código grava `duracao_minutos`. **É uma coluna morta.**
- `appointments` não tem coluna de clínica: o isolamento é feito por `patient_id → patients.clinic_id`.

**Correção proposta:** não renomear tabelas (alto risco, ganho baixo). Copiar `duracao_minutos` para `duration_minutes` onde a primeira for diferente e a segunda estiver nula, e deixar de ler `duracao_minutos`. A remoção da coluna vem depois. Adotar `clinic_id` como padrão **para tabelas novas** e documentar isso.

## Item 4 — Tabelas pouco usadas

| Tabela | Uso real | Diagnóstico |
|---|---|---|
| `cadeiras` | CRUD completo em [CadeirasTab.tsx](../src/components/configuracoes/CadeirasTab.tsx), aba em Configurações. Nenhuma FK aponta para ela; a agenda não a usa. | **Incompleta**: dá para cadastrar cadeiras, mas elas não são usadas em nenhum fluxo. |
| `treatment_items` | Escrita pela edge function [approve-budget:285](../supabase/functions/approve-budget/index.ts#L285). Nenhuma leitura no front. | **Usada pelo backend**, sem tela de leitura. Não remover. |
| `tenant_feature_overrides` | Nenhum uso, nem trigger nem função. | **Abandonada** (só tem policy de super admin). |
| `repasse_regras` | Leitura em [RemuneracaoTab.tsx:99](../src/components/configuracoes/RemuneracaoTab.tsx#L99). | **Incompleta** (sem tela de escrita). |
| `producao_eventos` | Leitura em [FechamentoComissoesModal.tsx:50](../src/components/financeiro/FechamentoComissoesModal.tsx#L50). Nenhum trigger ou função grava nela. | **Incompleta**: o fechamento de comissões lê uma tabela que nada preenche, e o resultado sai provavelmente sempre vazio. Confirmar com V6. |

Todas têm RLS com filtro de clínica. Proposta: não remover nada agora; registrar o diagnóstico e decidir caso a caso.

## Item 6 — Lockfiles e `dist`

- Versionados: `bun.lock` (último commit 2026-03-07), `bun.lockb` (2025-10-27, herança do Lovable) e `package-lock.json` (2026-07-22, atualizado junto com o `package.json` no último commit de segurança).
- `dist/` **não está versionado**: está no `.gitignore` e existe só localmente. Não há o que corrigir.
- O `package.json` não declara `packageManager`, e o `vercel.json` não define `installCommand`. Com lockfiles do bun presentes, a Vercel pode instalar com bun, usando um lock desatualizado em relação ao `package.json`. **Confirmar no log do último deploy** qual gerenciador foi usado.
- **Correção proposta:** adotar npm (o lock é o único atualizado), remover `bun.lock` e `bun.lockb` do repositório e declarar `"packageManager": "npm@<versão>"`.

## Outros achados

- **Não há testes automatizados**: nenhum `*.test.*` ou `*.spec.*`, nenhum script `test` e nenhuma config do Playwright, embora `@playwright/test` esteja nas dependências. Nas correções, "testes" vai significar os SQL de verificação abaixo, além de `build` e `lint`.
- `20260121125350` contém um `UPDATE` de dados de uma clínica específica (trial de 14 dias). Isso é dado dentro de migration de schema e roda de novo em qualquer ambiente recriado.

---

## Verificação no banco (somente leitura)

Rode no SQL Editor do Supabase. Nenhuma destas consultas altera dados.

```sql
-- V1. Policies vigentes nas tabelas críticas
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','usuarios','procedimentos','role_audit_log','reviews','whatsapp_configs','clinicas')
order by tablename, policyname;

-- V2. Triggers e privilégios de coluna em profiles/usuarios/clinicas (A1, A7)
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public' and event_object_table in ('profiles','usuarios','clinicas');
select grantee, table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles' and column_name = 'clinic_id'
  and grantee in ('authenticated','anon');

-- V3. Divergência entre profiles.clinic_id e usuarios.clinica_id (A1/A8)
select p.id, p.email, p.clinic_id as profiles_clinic, u.clinica_id as usuarios_clinic
from profiles p join usuarios u on u.id = p.id
where p.clinic_id is distinct from u.clinica_id;

-- V4. FKs reais (item 2)
select conrelid::regclass as tabela, conname, pg_get_constraintdef(oid)
from pg_constraint
where contype = 'f'
  and conrelid::regclass::text in ('appointments','patients','treatments','treatment_items','planos_procedimentos_itens');

-- V5. Origem dos procedimentos (item 5): quantas clínicas usam cada procedimento em planos
select pr.id, pr.codigo_sistema, pr.descricao, pr.created_at,
       count(distinct pp.clinica_id) as clinicas_que_usam,
       array_agg(distinct pp.clinica_id) as clinicas
from procedimentos pr
left join planos_procedimentos_itens i on i.procedimento_id = pr.id
left join planos_procedimentos pp on pp.id = i.plano_id
group by pr.id
order by pr.created_at desc
limit 200;
select date_trunc('day', created_at) as dia, count(*) from procedimentos group by 1 order by 1;

-- V6. Volume das tabelas duvidosas (itens 1 e 4)
select 'whatsapp_config' t, count(*) from whatsapp_config
union all select 'whatsapp_configs', count(*) from whatsapp_configs
union all select 'cadeiras', count(*) from cadeiras
union all select 'treatment_items', count(*) from treatment_items
union all select 'tenant_feature_overrides', count(*) from tenant_feature_overrides
union all select 'repasse_regras', count(*) from repasse_regras
union all select 'producao_eventos', count(*) from producao_eventos
union all select 'appointments com duracao_minutos <> duration_minutes', count(*) from appointments
  where duracao_minutos is distinct from duration_minutes;

-- V7. Tabelas do schema public sem RLS (deve retornar vazio)
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
```

## Ordem de correção sugerida (aguardando aprovação)

Cada etapa fica em branch própria, com migration nova e reversível, sem apagar dados.

1. **A1** (trigger em `profiles`/`usuarios`) + **A7** (trigger em `clinicas`): fecham o vazamento. Não mudam o front.
2. **Item 5 + A2**: `procedimentos.clinica_id`, novas policies, ajuste dos inserts no front. Depende do resultado de V5 para atribuir os dados existentes.
3. **A3, A4, A6** (policies) e **A5** (webhook).
4. **A8** (fonte única de vínculo com a clínica), depois de V3.
5. Itens 1, 3, 4 e 6 (estruturais e de higiene).

Ambiente: o repositório está ligado a um único projeto Supabase, e não encontrei staging. O Supabase CLI e o Docker estão instalados, então posso testar cada migration num banco **local** (`supabase start`, sem tocar em produção). Ressalva: como o item 2 mostra, o banco gerado a partir das migrations difere do de produção. O teste local valida a lógica, mas não substitui rodar V1 a V7 em produção antes e depois de aplicar. Para produção, entrego os arquivos, os comandos e um teste de verificação por etapa, para você executar.
