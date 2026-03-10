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
  })

  useEffect(() => {
    if (!user?.uid) {
      setDashboard({ revenuesTotal: 0, expensesTotal: 0, goalsCount: 0, budgetUsedPercent: 0, hasAnyData: false })
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
        hint: dashboard.budgetUsedPercent > 0 ? 'Percentual calculado sobre os limites criados' : 'Defina seus primeiros limites',
        icon: Wallet,
        iconColor: 'text-info',
      },
      {
        title: 'Metas em andamento',
        value: String(dashboard.goalsCount),
        hint: dashboard.goalsCount > 0 ? 'Metas em acompanhamento' : 'Crie metas para a família',
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
                description="Quando receitas e despesas forem registradas, este painel mostrará a evolução mensal."
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 py-5">
            <h2 className="text-lg font-semibold text-text-primary">Orçamentos e metas</h2>
            {!dashboard.hasAnyData ? (
              <EmptyState
                title="Nenhum orçamento ativo"
                description="Crie um orçamento e metas familiares para acompanhar progresso por categoria."
              />
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
