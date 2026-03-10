import { getFirestoreClient } from '@/lib/firebase/sdk'
import { getFamilyByUser } from '@/services/firestore/family'

interface DashboardSummary {
  revenuesTotal: number
  expensesTotal: number
  goalsCount: number
  budgetUsedPercent: number
  hasAnyData: boolean
  diagnostics: string[]
}

function parseAmount(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
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

async function getFamilyCollectionDocs(collectionId: string, familyGroupId: string) {
  const db = await getFirestoreClient()
  const snapshot = await db.collection(collectionId).where('familyGroupId', '==', familyGroupId).get()
  return snapshot.docs.map((doc) => doc.data())
}

export async function getDashboardSummaryByUser(uid: string): Promise<DashboardSummary> {
  try {
    const family = await getFamilyByUser(uid)
    if (!family.group) {
      return emptySummary(['Usuário sem grupo familiar.'])
    }

    const diagnostics: string[] = []

    const [revenuesRows, expensesRows, goalsRows, budgetsRows] = await Promise.all([
      getFamilyCollectionDocs('revenues', family.group.id).catch((error: Error) => {
        diagnostics.push(error.message)
        return []
      }),
      getFamilyCollectionDocs('expenses', family.group.id).catch((error: Error) => {
        diagnostics.push(error.message)
        return []
      }),
      getFamilyCollectionDocs('goals', family.group.id).catch((error: Error) => {
        diagnostics.push(error.message)
        return []
      }),
      getFamilyCollectionDocs('budgets', family.group.id).catch((error: Error) => {
        diagnostics.push(error.message)
        return []
      }),
    ])

    const revenuesTotal = revenuesRows.reduce((acc, row) => acc + parseAmount(row.amount), 0)
    const expensesTotal = expensesRows.reduce((acc, row) => acc + parseAmount(row.amount), 0)
    const goalsCount = goalsRows.length
    const budgetLimit = budgetsRows.reduce((acc, row) => acc + parseAmount(row.limit), 0)

    return {
      revenuesTotal,
      expensesTotal,
      goalsCount,
      budgetUsedPercent: budgetLimit > 0 ? Math.min((expensesTotal / budgetLimit) * 100, 999) : 0,
      hasAnyData: revenuesRows.length + expensesRows.length + goalsRows.length + budgetsRows.length > 0,
      diagnostics,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida ao carregar dashboard'
    console.error('[firestore][dashboard] erro ao carregar snapshot inicial', error)
    return emptySummary([message])
  }
}
