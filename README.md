# Flowdent

Sistema de gestão para clínicas odontológicas — agendamento, prontuário digital, odontograma, ortodontia, financeiro, CRM e automações via WhatsApp.

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS
- [Supabase](https://supabase.com/) — Postgres, Auth e Edge Functions
- Deploy: [Vercel](https://vercel.com/) (frontend) + Supabase (backend)

## Rodando localmente

Requisitos: Node.js e npm.

```sh
npm install
npm run dev
```

O app sobe em `http://localhost:8080`.

## Variáveis de ambiente

Crie um `.env` na raiz do projeto com as credenciais do projeto Supabase:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

## Build

```sh
npm run build
```

Gera os arquivos estáticos em `dist/`.

## Lint

```sh
npm run lint
```

## Supabase

Migrations e Edge Functions ficam em `supabase/`. Requer o [Supabase CLI](https://supabase.com/docs/guides/cli) autenticado e linkado ao projeto (`supabase link`).

```sh
# Aplicar migrations pendentes no banco
supabase db push

# Publicar todas as Edge Functions
supabase functions deploy

# Publicar uma função específica
supabase functions deploy <nome-da-função>
```

## Deploy

O frontend é publicado na Vercel a partir do branch `main` (deploy automático a cada push). Variáveis `VITE_SUPABASE_*` precisam estar configuradas no projeto da Vercel (Project Settings → Environment Variables), já que são embutidas no build.
