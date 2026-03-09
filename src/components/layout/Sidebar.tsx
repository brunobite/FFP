import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowUpDown,
  Wallet,
  CreditCard,
  Tags,
  PieChart,
  Target,
  BarChart3,
  FileUp,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ArrowUpDown, label: 'Lançamentos', path: '/transactions' },
  { icon: Wallet, label: 'Contas', path: '/accounts' },
  { icon: CreditCard, label: 'Cartões', path: '/cards' },
  { icon: Tags, label: 'Categorias', path: '/categories' },
  { icon: PieChart, label: 'Orçamentos', path: '/budgets' },
  { icon: Target, label: 'Metas', path: '/goals' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: FileUp, label: 'Importações IA', path: '/imports' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { profile, signOut } = useAuth()

  return (
    <aside
      className={cn(
        'flex h-full w-60 flex-col bg-bg-sidebar text-white',
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold">
          $
        </div>
        <span className="text-lg font-bold">FFP</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-3 border-primary bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar
            name={profile?.full_name || 'Usuário'}
            src={profile?.avatar_url}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {profile?.full_name || 'Usuário'}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
