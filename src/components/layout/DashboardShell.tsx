import { Suspense } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileTabBar } from './MobileTabBar'

interface Props {
  children: React.ReactNode
}

export function DashboardShell({ children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar />

      {/* Main content area — rail is hidden below md */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Suspense fallback={<div className="h-12 shrink-0 md:hidden" style={{ background: '#201e1d' }} />}>
          <MobileHeader />
        </Suspense>

        <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
          {children}
        </main>
      </div>

      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
    </div>
  )
}
