import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

  return (
    <div className="flex h-screen overflow-hidden bg-bg-main">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar className="h-screen" />
      </div>

      {/* Mobile Nav */}
      <MobileNav isOpen={mobileNavOpen} onClose={closeMobileNav} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
