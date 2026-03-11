import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoadingScreen } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { FamilySetupGate } from './FamilySetupGate'
import { AuthLayout } from '@/pages/auth/AuthLayout'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage').then((m) => ({ default: m.TransactionsPage })))
const RevenuesPage = lazy(() => import('@/pages/RevenuesPage').then((m) => ({ default: m.RevenuesPage })))
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
const AccountsPage = lazy(() => import('@/pages/AccountsPage').then((m) => ({ default: m.AccountsPage })))
const CardsPage = lazy(() => import('@/pages/CardsPage').then((m) => ({ default: m.CardsPage })))
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const BudgetsPage = lazy(() => import('@/pages/BudgetsPage').then((m) => ({ default: m.BudgetsPage })))
const GoalsPage = lazy(() => import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const ImportsPage = lazy(() => import('@/pages/ImportsPage').then((m) => ({ default: m.ImportsPage })))
const AlertsPage = lazy(() => import('@/pages/AlertsPage').then((m) => ({ default: m.AlertsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const InitialSetupPage = lazy(() => import('@/pages/InitialSetupPage').then((m) => ({ default: m.InitialSetupPage })))
const FamilyLayoutPage = lazy(() => import('@/pages/family/FamilyLayoutPage').then((m) => ({ default: m.FamilyLayoutPage })))
const FamilyProfilePage = lazy(() => import('@/pages/family/FamilyProfilePage').then((m) => ({ default: m.FamilyProfilePage })))
const FamilyEditPage = lazy(() => import('@/pages/family/FamilyEditPage').then((m) => ({ default: m.FamilyEditPage })))
const FamilyInvitesPage = lazy(() => import('@/pages/family/FamilyInvitesPage').then((m) => ({ default: m.FamilyInvitesPage })))
const FamilyMembersPage = lazy(() => import('@/pages/family/FamilyMembersPage').then((m) => ({ default: m.FamilyMembersPage })))
const FamilyPermissionsPage = lazy(() => import('@/pages/family/FamilyPermissionsPage').then((m) => ({ default: m.FamilyPermissionsPage })))

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen message="Carregando módulo..." />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/login" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/signup" element={<Navigate to="/signup" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/forgot-password" element={<Navigate to="/forgot-password" replace />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<FamilySetupGate />}>
            <Route element={<AppShell />}>
              <Route path="/configuracao-inicial" element={<InitialSetupPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/familia" element={<FamilyLayoutPage />}>
                <Route index element={<FamilyProfilePage />} />
                <Route path="editar" element={<FamilyEditPage />} />
                <Route path="convites" element={<FamilyInvitesPage />} />
                <Route path="membros" element={<FamilyMembersPage />} />
                <Route path="permissoes" element={<FamilyPermissionsPage />} />
              </Route>
              <Route path="/lancamentos" element={<TransactionsPage />} />
              <Route path="/receitas" element={<RevenuesPage />} />
              <Route path="/despesas" element={<ExpensesPage />} />
              <Route path="/contas" element={<AccountsPage />} />
              <Route path="/cartoes" element={<CardsPage />} />
              <Route path="/categorias" element={<CategoriesPage />} />
              <Route path="/orcamentos" element={<BudgetsPage />} />
              <Route path="/metas" element={<GoalsPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/importacoes" element={<ImportsPage />} />
              <Route path="/alertas" element={<AlertsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
