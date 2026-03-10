import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Goal, Wallet } from 'lucide-react'
import { Card, CardContent, EmptyState } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { getDashboardSummaryByUser } from '@/services/firestore/dashboard'

interface SummaryCardProps {
  title: string
  value: string
  hint: string
  icon: ComponentType<{ className?: string }>
  iconColor: string
}

interface DashboardData {
  revenuesTotal: number
  expensesTotal: number
  goalsCount: number
  budgetUsedPercent: number
  hasAnyData: boolean
  recentTransactions: Array<{ id: string; description: string; amount: number; type: 'income' | 'expense'; date: string }>
}

function SummaryCard({ title, value, hint, icon: Icon, iconColor }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between py-5">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
          <p className="mt-1 text-xs text-text-secondary">{hint}</p>
        </div>
        <div className="rounded-xl bg-bg-main p-3">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardData>({
    revenuesTotal: 0,
    expensesTotal: 0,
    goalsCount: 0,
    budgetUsedPercent: 0,
    hasAnyData: false,
    recentTransactions: [],
  })

  useEffect(() => {
    if (!user?.uid) {
      setDashboard({ revenuesTotal: 0, expensesTotal: 0, goalsCount: 0, budgetUsedPercent: 0, hasAnyData: false, recentTransactions: [] })
      return
    }

    let active = true

    const loadDashboard = async () => {
      const result = await getDashboardSummaryByUser(user.uid)

      if (!active) return

      setDashboard({
        revenuesTotal: result.revenuesTotal,
        expensesTotal: result.expensesTotal,
        goalsCount: result.goalsCount,
        budgetUsedPercent: result.budgetUsedPercent,
        hasAnyData: result.hasAnyData,
        recentTransactions: result.recentTransactions,
      })

      if (result.diagnostics.length > 0) {
        console.warn('[dashboard] leituras iniciadas com fallback', result.diagnostics)
      }
    }

    void loadDashboard()

    return () => {
      active = false
    }
  }, [user?.uid])

  const summaryCards = useMemo(
    () => [
      {
        title: 'Receitas do mês',
        value: formatCurrency(dashboard.revenuesTotal),
        hint: dashboard.revenuesTotal > 0 ? 'Total já registrado no período' : 'Aguardando lançamentos',
        icon: ArrowUpCircle,
        iconColor: 'text-success',
      },
      {
        title: 'Despesas do mês',
        value: formatCurrency(dashboard.expensesTotal),
        hint: dashboard.expensesTotal > 0 ? 'Total já registrado no período' : 'Aguardando lançamentos',
        icon: ArrowDownCircle,
        iconColor: 'text-danger',
      },
      {
        title: 'Orçamento utilizado',
        value: `${dashboard.budgetUsedPercent.toFixed(0)}%`,
        hint: 'Placeholder até o módulo de orçamento do Bloco 3',
        icon: Wallet,
        iconColor: 'text-info',
      },
      {
        title: 'Metas em andamento',
        value: String(dashboard.goalsCount),
        hint: 'Placeholder até o módulo de metas do Bloco 3',
        icon: Goal,
        iconColor: 'text-warning',
      },
    ],
    [dashboard],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">Visão consolidada da saúde financeira da família.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 py-5">
            <h2 className="text-lg font-semibold text-text-primary">Fluxo financeiro</h2>
            {!dashboard.hasAnyData ? (
              <EmptyState
                title="Sem lançamentos ainda"
                description="Quando receitas e despesas forem registradas, este painel mostrará os movimentos mais recentes do mês."
              />
            ) : (
              <ul className="space-y-2">
                {dashboard.recentTransactions.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{item.description}</p>
                      <p className="text-xs text-text-secondary">{new Date(`${item.date}T00:00:00`).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={item.type === 'income' ? 'font-semibold text-success' : 'font-semibold text-danger'}>
                      {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 py-5">
            <h2 className="text-lg font-semibold text-text-primary">Orçamentos e metas</h2>
            <EmptyState
              title="Módulos em preparação"
              description="Orçamentos e metas permanecem como placeholder neste bloco, mantendo o dashboard pronto para evolução."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
