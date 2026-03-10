import { getMonthlyTransactionsSummary } from '@/services/firestore/finance'

interface DashboardSummary {
  revenuesTotal: number
  expensesTotal: number
  goalsCount: number
  budgetUsedPercent: number
  hasAnyData: boolean
  diagnostics: string[]
  recentTransactions: Array<{ id: string; description: string; amount: number; type: 'income' | 'expense'; date: string }>
}

function emptySummary(diagnostics: string[] = []): DashboardSummary {
  return {
    revenuesTotal: 0,
    expensesTotal: 0,
    goalsCount: 0,
    budgetUsedPercent: 0,
    hasAnyData: false,
    diagnostics,
    recentTransactions: [],
  }
}

export async function getDashboardSummaryByUser(uid: string): Promise<DashboardSummary> {
  try {
    const monthly = await getMonthlyTransactionsSummary(uid)

    return {
      revenuesTotal: monthly.revenuesTotal,
      expensesTotal: monthly.expensesTotal,
      goalsCount: 0,
      budgetUsedPercent: 0,
      hasAnyData: monthly.hasAnyData,
      diagnostics: [],
      recentTransactions: monthly.recentTransactions.map((item) => ({
        id: item.id,
        description: item.description,
        amount: item.amount,
        type: item.type,
        date: item.date,
      })),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida ao carregar dashboard'
    console.error('[firestore][dashboard] erro ao carregar snapshot inicial', error)
    return emptySummary([message])
  }
}
