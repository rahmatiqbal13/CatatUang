'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useBukuList } from '@/hooks/use-buku-list'
import { usePendingCount } from '@/hooks/use-pending-count'
import { useLogout } from '@/hooks/use-logout'
import { BukuCard } from './BukuSwitcher'
import { Logo } from './Logo'
import { NAV_GROUPS, BOOK_SCOPED_PATHS, isActivePath, initials, roleLabel } from './nav-items'

const shell = 'sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col gap-[22px] overflow-y-auto border-r py-6 pr-0 pl-4 pb-[18px] md:flex'
const shellStyle = { background: 'var(--surface-elev)', borderColor: 'var(--border-hairline)' }

export function Sidebar() {
  return (
    <Suspense fallback={<nav className={shell} style={shellStyle} />}>
      <SidebarInner />
    </Suspense>
  )
}

function SidebarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { profile } = useUserProfile()
  const { currentBukuId } = useBukuList()
  const pending = usePendingCount(currentBukuId)
  const logout = useLogout()

  const buku = searchParams.get('buku')
  const hrefFor = (href: string) =>
    buku && BOOK_SCOPED_PATHS.includes(href) ? `${href}?buku=${buku}` : href

  let num = 0

  return (
    <nav aria-label="Navigasi utama" className={shell} style={shellStyle}>
      <Link href={hrefFor('/dashboard')} className="flex shrink-0 items-center gap-[11px] pr-4">
        <Logo />
      </Link>

      <BukuCard />

      <div className="flex flex-[1_0_auto] flex-col gap-[18px]">
        {NAV_GROUPS.map(group => {
          const items = group.items.filter(i => !i.superAdminOnly || profile?.role === 'super_admin')
          if (items.length === 0) return null
          return (
            <div key={group.label} className="flex flex-col gap-[2px]">
              <div className="label-caps px-[14px] pb-[6px] text-[10px]" style={{ color: 'var(--text-dim)' }}>{group.label}</div>
              {items.map(({ href, label, Icon }) => {
                const active = isActivePath(pathname, href)
                const n = String(++num).padStart(2, '0')
                return (
                  <Link
                    key={href}
                    href={hrefFor(href)}
                    aria-current={active ? 'page' : undefined}
                    className="flex w-full items-center gap-3 rounded-l-[11px] py-[10px] pr-4 pl-[14px] text-[14px] transition-colors hover:bg-[var(--surface-hover)]"
                    style={{
                      background: active ? 'var(--accent-100)' : undefined,
                      color: active ? 'var(--brand)' : 'var(--text-2)',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    <span className="cu-mono w-4 text-[10px] opacity-60">{n}</span>
                    <Icon size={18} strokeWidth={1.7} />
                    <span className="flex-1">{label}</span>
                    {href === '/pengeluaran' && pending > 0 && (
                      <span className="cu-mono rounded-full px-[7px] py-[1px] text-[11px] font-semibold" style={{ background: 'var(--data-amber)', color: 'var(--surface-elev)' }}>
                        {pending}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="mr-4 flex shrink-0 items-center gap-[10px] border-t pt-[14px]" style={{ borderColor: 'rgba(24,36,30,0.08)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: 'var(--keluar)', color: 'var(--surface-elev)' }}>
          {profile ? initials(profile.nama) : ''}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold">{profile?.nama ?? '…'}</div>
          <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{roleLabel(profile?.role)}</div>
        </div>
        <button
          onClick={logout}
          title="Keluar"
          className="rounded-[9px] border px-[10px] py-[7px] text-[12px] font-semibold hover:bg-[var(--surface-2)]"
          style={{ borderColor: 'rgba(24,36,30,0.12)' }}
        >
          Keluar
        </button>
      </div>
    </nav>
  )
}
