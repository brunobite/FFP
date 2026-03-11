import { NavLink, Outlet } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Perfil familiar', path: '/familia' },
  { label: 'Editar', path: '/familia/editar' },
  { label: 'Convidar', path: '/familia/convites' },
  { label: 'Membros', path: '/familia/membros' },
  { label: 'Permissões', path: '/familia/permissoes' },
]

export function FamilyLayoutPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <h1 className="text-xl font-semibold text-text-primary">Configuração familiar</h1>
          <p className="text-sm text-text-secondary">Gerencie dados do grupo, membros e permissões.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                end={tab.path === '/familia'}
                to={tab.path}
                className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm', isActive ? 'bg-primary text-white' : 'bg-bg-main text-text-primary')}
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </CardContent>
      </Card>
      <Outlet />
    </div>
  )
}
