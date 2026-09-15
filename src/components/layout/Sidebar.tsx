'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/use-user-profile'
import { toast } from 'sonner'
import { Wallet, LogOut } from 'lucide-react'
import { NAV_ITEMS, BOOK_SCOPED_PATHS } from './nav-items'

export function Sidebar() {
  return (
    <Suspense fallback={<nav className="hidden h-screen w-[76px] shrink-0 md:block" style={{ background: 'var(--surface)', borderRight: '2px solid var(--divider)' }} />}>
      <SidebarInner />
    </Suspense>
  )
}

function SidebarInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { profile } = useUserProfile()

  const buku = searchParams.get('buku')
  const hrefFor = (href: string) =>
    buku && BOOK_SCOPED_PATHS.includes(href) ? `${href}?buku=${buku}` : href

  // /dana/[id] keeps "Dana" lit
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center overflow-y-auto px-0 py-3 md:flex"
      style={{ background: 'var(--surface)', borderRight: '2px solid var(--divider)' }}
    >
      <Link href={hrefFor('/dashboard')} aria-label="CatatUang" className="mb-[10px]">
        <span className="flex h-10 w-10 items-center justify-center" style={{ background: 'var(--accent)' }}>
          <Wallet size={20} strokeWidth={2} color="#ffffff" />
        </span>
      </Link>

      <ul className="flex w-full flex-1 flex-col items-center gap-[2px]">
        {NAV_ITEMS.filter(i => !i.superAdminOnly || profile?.role === 'super_admin').map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <li key={href}>
              <Link
                href={hrefFor(href)}
                aria-current={active ? 'page' : undefined}
                className="flex w-14 flex-col items-center gap-1 pt-2 pb-[6px] text-center transition-colors"
                style={{
                  background: active ? '#201e1d' : 'transparent',
                  color: active ? '#f3f2f2' : 'var(--text-muted)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={19} strokeWidth={1.75} />
                <span className="text-[8.5px] font-bold uppercase tracking-[0.04em] whitespace-nowrap">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <button
        onClick={handleLogout}
        title={profile ? `Keluar (${profile.nama})` : 'Keluar'}
        aria-label="Keluar"
        className="flex w-14 flex-col items-center gap-1 pt-2 pb-[6px] text-center transition-colors hover:bg-[var(--surface-2)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <LogOut size={19} strokeWidth={1.75} />
        <span className="text-[8.5px] font-bold uppercase tracking-[0.04em]">Keluar</span>
      </button>
    </nav>
  )
}
