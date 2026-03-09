import { Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-bg-card px-4 lg:px-6">
      <button onClick={onMenuClick} className="rounded-lg p-2 text-text-primary hover:bg-bg-main lg:hidden">
        <Menu className="h-6 w-6" />
      </button>
      <div className="hidden lg:block">
        <h1 className="text-base font-semibold text-text-primary">Family Financial Planner</h1>
      </div>

      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">$</div>
        <span className="text-lg font-bold text-text-primary">FFP</span>
      </div>

      <Avatar name={profile?.full_name || 'Usuário'} src={profile?.avatar_url} size="sm" />
    </header>
  )
}
