# FFP — Family Financial Planner

Base técnica do **Bloco 1** com foco em fundação escalável, layout responsivo e autenticação com Firebase.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Firebase Authentication
- Cloud Firestore
- Firebase Storage (base preparada para evolução)

## Como rodar localmente

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente:

```bash
cp .env.example .env
```

3. Preencha as variáveis do Firebase no `.env`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
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
- `src/lib/firebase`: inicialização e clientes do Firebase
- `src/services/firestore`: serviços para modelagem inicial em Firestore
- `src/pages`: páginas de rota
- `src/routes`: composição das rotas e proteção de acesso
- `server.mjs`: servidor Node para deploy como Render Web Service

## Estrutura inicial no Firestore

Coleções base:

1. `users`
   - documento com id igual ao `uid` do Firebase Auth
   - campos iniciais: `email`, `displayName`, `photoURL`, `familyGroupId`, `createdAt`, `updatedAt`

2. `family_groups`
   - grupo familiar principal
   - campos iniciais: `name`, `ownerUid`, `createdAt`, `updatedAt`

3. `family_members`
   - vínculo usuário-grupo
   - campos iniciais: `familyGroupId`, `uid`, `role`, `createdAt`, `updatedAt`

Essa modelagem mantém base para evolução multiusuário familiar.

## Deploy no Render (Web Service)

Este projeto está preparado para Render **Web Service** com build Vite e servidor Node para SPA.

### Configuração recomendada

- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm run start`
- **Environment Variables**:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

Você pode usar o arquivo `render.yaml` deste projeto para provisionar o serviço automaticamente.
