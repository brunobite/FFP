import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingScreen } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

const SETUP_PATH = '/configuracao-inicial'

export function FamilySetupGate() {
  const { user, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen message="Finalizando sua configuração inicial..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    if (location.pathname !== SETUP_PATH) {
      return <Navigate to={SETUP_PATH} replace />
    }

    return <Outlet />
  }

  if (!profile.familyGroupId && location.pathname !== SETUP_PATH) {
    return <Navigate to={SETUP_PATH} replace />
  }

  if (profile.familyGroupId && location.pathname === SETUP_PATH) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
