import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'

interface PlaceholderPageProps {
  title: string
  icon: LucideIcon
}

export function PlaceholderPage({ title, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="max-w-md text-center">
        <CardContent className="py-12">
          <Icon className="mx-auto mb-4 h-16 w-16 text-text-secondary/40" />
          <h1 className="mb-2 text-2xl font-bold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary">
            Este módulo será implementado na próxima etapa.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
