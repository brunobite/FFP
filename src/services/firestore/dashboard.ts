import { loadSession } from '@/services/firebase'
import { getFamilyByUser, getFirestoreBaseUrl } from '@/services/firestore/family'

interface DashboardSummary {
  revenuesTotal: number
  expensesTotal: number
  goalsCount: number
  budgetUsedPercent: number
  hasAnyData: boolean
  diagnostics: string[]
}

interface FirestoreQueryRow {
  document?: {
    fields?: Record<string, unknown>
  }
}

function field(value: string) {
  return { stringValue: value }
}

function parseNumberField(value: unknown) {
  if (!value || typeof value !== 'object') return 0

  if ('doubleValue' in value) return Number((value as { doubleValue: string | number }).doubleValue) || 0
  if ('integerValue' in value) return Number((value as { integerValue: string | number }).integerValue) || 0
  if ('stringValue' in value) return Number((value as { stringValue: string }).stringValue) || 0

  return 0
}

function getAuthHeaders() {
  const session = loadSession()
  if (!session?.idToken) {
    throw new Error('Usuário não autenticado para leitura do dashboard.')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.idToken}`,
  }
}

async function runFamilyCollectionQuery(collectionId: string, familyGroupId: string) {
  const response = await fetch(`${getFirestoreBaseUrl()}:runQuery`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'familyGroupId' },
            op: 'EQUAL',
            value: field(familyGroupId),
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Query ${collectionId} falhou (${response.status}): ${message || 'sem payload'}`)
  }

  return (await response.json()) as FirestoreQueryRow[]
}

function sumAmount(rows: FirestoreQueryRow[]) {
  return rows.reduce((acc, row) => {
    const fields = row.document?.fields || {}
    return acc + parseNumberField(fields.amount)
  }, 0)
}

function countDocuments(rows: FirestoreQueryRow[]) {
  return rows.filter((row) => row.document).length
}

function emptySummary(diagnostics: string[] = []): DashboardSummary {
  return {
    revenuesTotal: 0,
    expensesTotal: 0,
    goalsCount: 0,
    budgetUsedPercent: 0,
    hasAnyData: false,
    diagnostics,
  }
}

export async function getDashboardSummaryByUser(uid: string): Promise<DashboardSummary> {
  try {
    const family = await getFamilyByUser(uid)
    if (!family.group) {
      return emptySummary(['Usuário sem grupo familiar.'])
    }

    const diagnostics: string[] = []

    const [revenuesRows, expensesRows, goalsRows, budgetsRows] = await Promise.all([
      runFamilyCollectionQuery('revenues', family.group.id).catch((error: Error) => {
        diagnostics.push(error.message)
        return []
      }),
      runFamilyCollectionQuery('expenses', family.group.id).catch((error: Error) => {
        diagnostics.push(error.message)
        return []
      }),
      runFamilyCollectionQuery('goals', family.group.id).catch((error: Error) => {
        diagnostics.push(error.message)
        return []
      }),
      runFamilyCollectionQuery('budgets', family.group.id).catch((error: Error) => {
        diagnostics.push(error.message)
        return []
      }),
    ])

    const revenuesTotal = sumAmount(revenuesRows)
    const expensesTotal = sumAmount(expensesRows)
    const goalsCount = countDocuments(goalsRows)

    const budgetLimit = budgetsRows.reduce((acc, row) => {
      const fields = row.document?.fields || {}
      return acc + parseNumberField(fields.limit)
    }, 0)

    const budgetUsedPercent = budgetLimit > 0 ? Math.min((expensesTotal / budgetLimit) * 100, 999) : 0

    return {
      revenuesTotal,
      expensesTotal,
      goalsCount,
      budgetUsedPercent,
      hasAnyData: countDocuments(revenuesRows) + countDocuments(expensesRows) + goalsCount + countDocuments(budgetsRows) > 0,
      diagnostics,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida ao carregar dashboard'
    console.error('[dashboard] erro ao carregar snapshot inicial', error)
    return emptySummary([message])
  }
}
