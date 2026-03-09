import { useMemo, useState, type ComponentType } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Goal, Wallet } from 'lucide-react'
import { Card, CardContent, EmptyState } from '@/components/ui'

interface SummaryCardProps {
  title: string
  value: string
  hint: string
  icon: ComponentType<{ className?: string }>
  iconColor: string
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

export function DashboardPage() {
  const [hasData] = useState(false)

  const summaryCards = useMemo(
    () => [
      { title: 'Receitas do mês', value: 'R$ 0,00', hint: 'Aguardando lançamentos', icon: ArrowUpCircle, iconColor: 'text-success' },
      { title: 'Despesas do mês', value: 'R$ 0,00', hint: 'Aguardando lançamentos', icon: ArrowDownCircle, iconColor: 'text-danger' },
      { title: 'Orçamento utilizado', value: '0%', hint: 'Defina seus primeiros limites', icon: Wallet, iconColor: 'text-info' },
      { title: 'Metas em andamento', value: '0', hint: 'Crie metas para a família', icon: Goal, iconColor: 'text-warning' },
    ],
    [],
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
            {!hasData ? (
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
            {!hasData ? (
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
