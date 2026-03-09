import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFamily } from '@/hooks/useFamily'
import { LoadingScreen } from '@/components/ui'

interface ProtectedRouteProps {
  requireFamily?: boolean
}

export function ProtectedRoute({ requireFamily = true }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth()
  const { familyGroup, isLoading: familyLoading } = useFamily()

  if (authLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  if (requireFamily && familyLoading) {
    return <LoadingScreen />
  }

  if (requireFamily && !familyGroup) {
    return <Navigate to="/family/create" replace />
  }

  return <Outlet />
}
