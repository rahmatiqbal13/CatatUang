'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Landmark, Receipt, BarChart3 } from 'lucide-react'

const TABS = [
  { href: '/dashboard', label: 'Dash', Icon: LayoutDashboard },
  { href: '/dana', label: 'Dana', Icon: Landmark },
  { href: '/pengeluaran', label: 'Keluar', Icon: Receipt },
  { href: '/laporan', label: 'Lapor', Icon: BarChart3 },
]

export function MobileTabBar() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Navigasi mobile"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 md:hidden"
      style={{ background: 'var(--surface)', borderTop: '2px solid var(--divider)' }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className="flex min-h-[52px] flex-col items-center justify-center gap-[3px]"
            style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Icon size={18} strokeWidth={1.9} />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.04em]">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
