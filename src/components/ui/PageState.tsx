import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import { Card, CardContent } from './Card'
import { Button } from './Button'

interface StateBaseProps {
  title: string
  description: string
  icon?: LucideIcon
}

function StateCard({ title, description, icon: Icon = Inbox, children }: StateBaseProps & { children?: ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="mb-4 rounded-full bg-bg-main p-3">
          <Icon className="h-6 w-6 text-text-secondary" />
        </div>
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-text-secondary">{description}</p>
        {children}
      </CardContent>
    </Card>
  )
}

export function EmptyState(props: StateBaseProps) {
  return <StateCard {...props} />
}

export function ErrorState({ title, description, onRetry }: StateBaseProps & { onRetry?: () => void }) {
  return (
    <StateCard title={title} description={description} icon={AlertCircle}>
      {onRetry ? (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </StateCard>
  )
}

export function LoadingState({ title, description }: Omit<StateBaseProps, 'icon'>) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <Loader2 className="mb-4 h-6 w-6 animate-spin text-primary" />
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </CardContent>
    </Card>
  )
}
