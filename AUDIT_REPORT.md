# RELATÓRIO DE AUDITORIA FFP

**Data:** 2026-03-10
**Escopo:** Auditoria completa de inicialização, offline, auth e segurança
**Status:** Somente leitura — nenhum arquivo do projeto foi modificado

---

## Arquivos Analisados

- `src/lib/firebase/config.ts`
- `src/lib/firebase/sdk.ts`
- `src/services/firebase.ts`
- `src/services/firestore/family.ts`
- `src/services/firestore/finance.ts`
- `src/services/firestore/dashboard.ts`
- `src/services/firestore/errors.ts`
- `src/features/auth/AuthProvider.tsx`
- `src/features/family/FamilyContext.tsx`
- `src/features/family/InviteMembers.tsx`
- `src/routes/AppRouter.tsx`
- `src/routes/ProtectedRoute.tsx`
- `src/routes/FamilySetupGate.tsx`
- `src/pages/InitialSetupPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/TransactionsPage.tsx`
- `src/pages/CategoriesPage.tsx`
- `src/pages/AccountsPage.tsx`
- `src/pages/family/CreateFamilyPage.tsx`
- `src/main.tsx`
- `index.html`
- `.env.example`

## Resumo

| Tipo | Quantidade |
|------|-----------|
| Bugs críticos | 3 |
| Problemas offline/rede | 5 |
| Deprecações Firebase | 1 |
| Problemas de segurança | 2 |
| Outros (performance/UX/code quality) | 5 |
| **TOTAL** | **16** |

---

## Problemas Encontrados

### #1 — FamilySetupGate não distingue offline vs perfil inexistente [CRÍTICO]

- **Arquivo:** `src/routes/FamilySetupGate.tsx:19-24`
- **Tipo:** Bug / Offline
- **Descrição:** `profile === null` é usado tanto para "perfil não existe" quanto para "perfil inacessível por rede". O gate redireciona para `/configuracao-inicial` em ambos os casos.
- **Impacto:** Usuários configurados veem tela de setup quando offline.
- **Sugestão:** Adicionar estado `profileStatus: 'loaded' | 'offline' | 'not-found'` ao AuthContext.

### #2 — getUserProfile não faz fallback para cache quando offline [CRÍTICO]

- **Arquivo:** `src/services/firestore/family.ts:66-85`
- **Tipo:** Bug / Offline
- **Descrição:** O primeiro `userRef.get()` lança exceção offline. O fallback `{ source: 'cache' }` só executa quando `snapshot.exists === false`, nunca quando há exceção.
- **Impacto:** Perfil nunca recuperado do cache offline.
- **Sugestão:** Envolver primeiro get() em try/catch; se offline, tentar `{ source: 'cache' }`.

### #3 — ensureUserProfile mesma lógica quebrada [CRÍTICO]

- **Arquivo:** `src/services/firestore/family.ts:87-131`
- **Tipo:** Bug / Offline
- **Descrição:** Mesmo padrão do #2.
- **Impacto:** Bootstrap do perfil falha completamente offline.
- **Sugestão:** Mesma correção do #2.

### #4 — enablePersistence() deprecated [MÉDIO]

- **Arquivo:** `src/lib/firebase/sdk.ts:111-126`
- **Tipo:** Deprecação
- **Descrição:** Usa `db.enablePersistence()` legado. Firebase avisa para usar `FirestoreSettings.cache`.
- **Impacto:** Funciona hoje, será removido futuramente.
- **Sugestão:** Migrar para API modular com `persistentLocalCache`.

### #5 — Nenhum listener de reconexão de rede [ALTO]

- **Arquivo:** Projeto inteiro
- **Tipo:** Offline / UX
- **Descrição:** Zero listeners para eventos `online`/`offline`. `navigator.onLine` usado apenas em logging.
- **Impacto:** App não retenta operações ao reconectar.
- **Sugestão:** Hook `useOnlineStatus()` + auto-reload profile ao reconectar.

### #6 — refreshSession descarta sessão offline [ALTO]

- **Arquivo:** `src/features/auth/AuthProvider.tsx:66-76`
- **Tipo:** Offline
- **Descrição:** `refreshSession()` faz fetch HTTP. Offline = clearSession() = logout automático.
- **Impacto:** Offline = perda de sessão, redirect para /login.
- **Sugestão:** Se offline, usar sessão salva sem refresh. Só limpar em erro de credencial.

### #7 — enablePersistence sem synchronizeTabs [BAIXO]

- **Arquivo:** `src/lib/firebase/sdk.ts:112`
- **Tipo:** Bug
- **Descrição:** `enablePersistence()` chamado sem `{ synchronizeTabs: true }`.
- **Impacto:** Segunda aba não tem persistência.
- **Sugestão:** Passar `{ synchronizeTabs: true }`.

### #8 — Sem verificação navigator.onLine nas operações Firestore [MÉDIO]

- **Arquivo:** `src/services/firestore/family.ts`, `src/services/firestore/finance.ts`
- **Tipo:** Offline
- **Descrição:** Nenhuma verificação de conectividade antes de operações remotas.
- **Impacto:** Latência e erros confusos offline.
- **Sugestão:** Wrapper que usa `{ source: 'cache' }` quando offline.

### #9 — createFamilyGroup não funciona offline [MÉDIO]

- **Arquivo:** `src/services/firestore/family.ts:133-182`
- **Tipo:** Offline
- **Descrição:** Depende de ensureUserProfile (bug #3) + operações remotas.
- **Impacto:** Setup inicial impossível offline.
- **Sugestão:** Corrigir #3 primeiro.

### #10 — FamilyContext silencia erros sem distinção [BAIXO]

- **Arquivo:** `src/features/family/FamilyContext.tsx:28-33`
- **Tipo:** Bug
- **Descrição:** Catch engole todos os erros sem log ou distinção.
- **Impacto:** Erros reais invisíveis.
- **Sugestão:** Logar e expor estado de erro.

### #11 — API Key no frontend (informativo) [BAIXO]

- **Arquivo:** `src/lib/firebase/config.ts:2`
- **Tipo:** Segurança (informativo)
- **Descrição:** API Key embutida no build. Esperado para Firebase Web SDK.
- **Impacto:** Segurança depende das Firestore Rules.
- **Sugestão:** Garantir rules restritivas (ver #12).

### #12 — Firestore Security Rules ausentes do repositório [ALTO]

- **Arquivo:** `firestore.rules` (ausente)
- **Tipo:** Segurança
- **Descrição:** Regras gerenciadas fora do repo. Impossível auditar.
- **Impacto:** Não se pode validar isolamento de dados entre famílias.
- **Sugestão:** Exportar e versionar as rules.

### #13 — Dashboard sem indicação de dados offline [BAIXO]

- **Arquivo:** `src/pages/DashboardPage.tsx:64-65`
- **Tipo:** Bug
- **Descrição:** Erros silenciados; dashboard mostra zeros sem explicação.
- **Impacto:** Usuário offline vê dashboard vazio sem feedback.
- **Sugestão:** Exibir banner quando diagnostics não vazio.

### #14 — Auth via REST API sem cache offline [MÉDIO]

- **Arquivo:** `src/services/firebase.ts:61-73, 123-161`
- **Tipo:** Offline
- **Descrição:** Auth usa REST API ao invés de Firebase Auth SDK. Sem persistência nativa.
- **Impacto:** refreshSession sempre requer rede.
- **Sugestão:** Migrar para Firebase Auth SDK ou falhar graciosamente offline.

### #15 — Duplicação nowIso() [BAIXO]

- **Arquivo:** `src/services/firestore/family.ts:31`, `src/services/firestore/finance.ts:48`
- **Tipo:** Code Quality
- **Descrição:** Função idêntica em dois arquivos.
- **Sugestão:** Extrair para utilitário.

### #16 — Duplicação formatCurrency() [BAIXO]

- **Arquivo:** `DashboardPage.tsx:41`, `TransactionsPage.tsx:40`, `AccountsPage.tsx:23`
- **Tipo:** Code Quality
- **Descrição:** Função idêntica em três arquivos.
- **Sugestão:** Extrair para `src/lib/utils.ts`.

---

## Ordem de Prioridade para Correção

1. **#2** — getUserProfile fallback cache (CRÍTICO — root cause)
2. **#3** — ensureUserProfile fallback cache (CRÍTICO)
3. **#1** — FamilySetupGate estado offline (CRÍTICO)
4. **#6** — refreshSession graceful offline (ALTO)
5. **#5** — Listeners de reconexão (ALTO)
6. **#12** — Firestore Security Rules no repo (ALTO)
7. **#8** — navigator.onLine nas operações (MÉDIO)
8. **#9** — createFamilyGroup offline (MÉDIO)
9. **#14** — Auth REST → Firebase Auth SDK (MÉDIO)
10. **#4** — Migrar enablePersistence (MÉDIO)
11. **#7** — synchronizeTabs (BAIXO)
12. **#10** — FamilyContext logging (BAIXO)
13. **#13** — Dashboard feedback offline (BAIXO)
14. **#11** — API Key informativo (BAIXO)
15. **#15** — DRY nowIso (BAIXO)
16. **#16** — DRY formatCurrency (BAIXO)

---

## Arquivos Não Encontrados

| Arquivo Esperado | Status |
|---|---|
| `firestore.rules` | Ausente — regras fora do repositório |
| `sw.js` / Service Worker | Ausente — não implementado |
| `firebase.json` | Ausente — deploy não usa Firebase CLI |

---

## Diagnóstico do Bug Relatado

Cadeia de falhas quando offline:

1. `refreshSession()` → fetch HTTP falha → sessão descartada → logout
2. Se sessão sobrevive: `getUserProfile()` → get() remoto falha → **fallback cache nunca executa** (bug #2)
3. `hydrateProfile()` captura erro → `setProfile(null)`
4. `FamilySetupGate` vê `null` → redireciona para `/configuracao-inicial`
5. `InitialSetupPage` → `createFamilyGroup()` falha → erro vermelho exibido

**Root cause:** Ausência de fallback para cache no `getUserProfile()` + falta de distinção entre "perfil inexistente" e "perfil inacessível" no `FamilySetupGate`.
