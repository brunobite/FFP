import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-3xl font-bold text-white">
            $
          </div>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">FFP</h1>
          <p className="text-sm text-text-secondary">Planejador Financeiro Familiar</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
