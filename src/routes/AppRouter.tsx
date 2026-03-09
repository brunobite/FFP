import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { RevenuesPage } from '@/pages/RevenuesPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { CardsPage } from '@/pages/CardsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { BudgetsPage } from '@/pages/BudgetsPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ImportsPage } from '@/pages/ImportsPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { LoginPage } from '@/pages/auth/LoginPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
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

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
