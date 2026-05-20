'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'

interface Props {
  children: React.ReactNode
  namaDirektorat: string
}

export function DashboardShell({ children, namaDirektorat }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile, relative on desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50
          md:relative md:z-auto md:translate-x-0
          transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar namaDirektorat={namaDirektorat} />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header bar */}
        <div
          className="flex items-center gap-3 h-12 px-4 shrink-0 md:hidden"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--cu-surface)',
          }}
        >
          <button
            onClick={() => setOpen(true)}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
            style={{ color: 'var(--cu-text-muted)' }}
            aria-label="Buka menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          {/* Mini logo */}
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="var(--cu-primary)" />
            <path
              d="M10.5 12.5a4.5 4.5 0 014.5-4.5h2.5a4.5 4.5 0 014.5 4.5"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"
            />
            <rect x="9" y="13.5" width="14" height="10.5" rx="2.5" stroke="white" strokeWidth="1.8" fill="none" />
            <circle cx="19" cy="18.75" r="1.4" fill="white" />
          </svg>

          <span
            className="font-semibold text-[14px] tracking-[-0.01em]"
            style={{ color: 'var(--cu-text)' }}
          >
            CatatUang
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
