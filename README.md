# FFP — Family Financial Planner

Base técnica do **Bloco 1** com foco em fundação escalável, layout responsivo e autenticação com Supabase.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Supabase (Auth + Postgres)

## Como rodar localmente

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente:

```bash
cp .env.example .env
```

3. Preencha as variáveis com seu projeto Supabase:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

4. Rode a aplicação:

```bash
npm run dev
```

5. Build de validação:

```bash
npm run build
```

## Rotas iniciais (Bloco 1)

- `/login`
- `/dashboard`
- `/lancamentos`
- `/receitas`
- `/despesas`
- `/contas`
- `/cartoes`
- `/categorias`
- `/orcamentos`
- `/metas`
- `/relatorios`
- `/importacoes`
- `/alertas`
- `/configuracoes`

## Estrutura de pastas (resumo)

- `src/components`: componentes reutilizáveis de layout e UI
- `src/features/auth`: contexto e regras de autenticação
- `src/features/family`: base para fluxo familiar multiusuário
- `src/hooks`: hooks compartilhados da aplicação
- `src/lib`: integrações e utilitários compartilhados
- `src/pages`: páginas de rota
- `src/routes`: composição das rotas e proteção de acesso
- `supabase/migrations`: SQL versionado de estrutura inicial

## SQL / Migrations (Supabase)

Executar no Supabase CLI/SQL Editor as migrations em `supabase/migrations`:

1. `00001_create_profiles.sql`
2. `00002_create_family_groups.sql`
3. `00003_create_family_members.sql`
4. `00004_create_family_invites.sql`

Essas migrations entregam a base para:

- perfil por usuário autenticado (`profiles`)
- agrupamento familiar (`family_groups`)
- vínculo usuário-grupo com papel (`family_members`)
- convites para expansão multiusuário (`family_invites`)

## Deploy no Render (Static Site)

Este repositório já está preparado para deploy com Vite em `dist`.

### Configuração recomendada

- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Rewrite SPA

Para evitar erro 404 ao recarregar rotas (`/dashboard`, `/receitas`, etc.), use rewrite para `index.html`.

Você pode usar o arquivo `render.yaml` deste projeto, que já contém:

- build command
- publish path
- rewrite `/* -> /index.html`
