import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'

interface PlaceholderPageProps {
  title: string
  icon: LucideIcon
  description?: string
}

export function PlaceholderPage({ title, icon: Icon, description }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center">
      <Card className="max-w-xl text-center">
        <CardContent className="py-12">
          <Icon className="mx-auto mb-4 h-16 w-16 text-text-secondary/40" />
          <h1 className="mb-2 text-2xl font-bold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary">
            {description ?? 'Esta seção está pronta para evoluir no próximo bloco do projeto.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
