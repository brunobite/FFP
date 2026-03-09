import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Tags,
  PieChart,
  Target,
  BarChart3,
  FileUp,
  BellRing,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ArrowUpDown, label: 'Lançamentos', path: '/lancamentos' },
  { icon: TrendingUp, label: 'Receitas', path: '/receitas' },
  { icon: TrendingDown, label: 'Despesas', path: '/despesas' },
  { icon: Wallet, label: 'Contas', path: '/contas' },
  { icon: CreditCard, label: 'Cartões', path: '/cartoes' },
  { icon: Tags, label: 'Categorias', path: '/categorias' },
  { icon: PieChart, label: 'Orçamentos', path: '/orcamentos' },
  { icon: Target, label: 'Metas', path: '/metas' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: FileUp, label: 'Importações', path: '/importacoes' },
  { icon: BellRing, label: 'Alertas', path: '/alertas' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { profile, signOut } = useAuth()

  return (
    <aside className={cn('flex h-full w-64 flex-col bg-bg-sidebar text-white', className)}>
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold">$</div>
        <span className="text-lg font-bold">FFP</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={profile?.full_name || 'Usuário'} src={profile?.avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name || 'Usuário'}</p>
          </div>
          <button onClick={() => signOut()} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
