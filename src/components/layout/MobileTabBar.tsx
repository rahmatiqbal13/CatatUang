'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, Landmark, Receipt, Menu, Plus, ArrowUp, ArrowLeftRight, FileText } from 'lucide-react'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useLogout } from '@/hooks/use-logout'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { NAV_ITEMS, MORE_PATHS, BOOK_SCOPED_PATHS, isActivePath } from './nav-items'

const QUICK = [
  { href: '/dana', label: 'Pengeluaran', desc: 'Pilih dompet, lalu ajukan belanja', Icon: Receipt, color: 'var(--keluar)', soft: 'var(--danger-soft)' },
  { href: '/dana', label: 'Pemasukan', desc: 'Tambah saldo ke dompet', Icon: ArrowUp, color: 'var(--accent)', soft: 'var(--accent-100)' },
  { href: '/peminjaman?baru=1', label: 'Peminjaman', desc: 'Catat uang muka kegiatan', Icon: ArrowLeftRight, color: 'var(--data-amber)', soft: 'var(--status-wait-bg)' },
  { href: '/bukti-uang?baru=1', label: 'Bukti uang', desc: 'Terbitkan bukti penerimaan', Icon: FileText, color: 'var(--data-blue)', soft: '#DFE4EE' },
]

/**
 * Bottom tab bar: Ringkasan · Dana · (+) · Keluar · Lainnya. The (+) opens a
 * quick-record sheet; "Lainnya" holds the remaining routes and logout.
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { profile } = useUserProfile()
  const logout = useLogout()
  const [sheet, setSheet] = useState<'quick' | 'more' | null>(null)

  const buku = searchParams.get('buku')
  const hrefFor = (href: string) => {
    const path = href.split('?')[0]
    if (!buku || !BOOK_SCOPED_PATHS.includes(path)) return href
    return `${href}${href.includes('?') ? '&' : '?'}buku=${buku}`
  }

  const tab = (href: string, label: string, Icon: typeof Landmark) => {
    const active = isActivePath(pathname, href)
    return (
      <Link
        href={hrefFor(href)}
        aria-current={active ? 'page' : undefined}
        className="flex min-h-[52px] w-full flex-col items-center justify-center gap-1 text-[11px]"
        style={{ color: active ? 'var(--brand)' : 'var(--text-muted)', fontWeight: active ? 700 : 500 }}
      >
        <Icon size={22} strokeWidth={1.8} />
        {label}
      </Link>
    )
  }

  const moreActive = MORE_PATHS.some(p => isActivePath(pathname, p))
  const moreItems = NAV_ITEMS.filter(i => MORE_PATHS.includes(i.href) && (!i.superAdminOnly || profile?.role === 'super_admin'))

  return (
    <>
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-end border-t px-[10px] pt-[6px] pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur-[14px] md:hidden"
        style={{ background: 'rgba(251,249,244,.94)', borderColor: 'var(--divider)' }}
      >
        {tab('/dashboard', 'Ringkasan', LayoutDashboard)}
        {tab('/dana', 'Dana', Landmark)}
        <div className="flex justify-center">
          <button
            onClick={() => setSheet('quick')}
            aria-label="Catat baru"
            className="-mt-[26px] flex h-[58px] w-[58px] items-center justify-center rounded-full border-4 transition-transform active:scale-[.94]"
            style={{ background: 'var(--accent)', color: 'var(--surface-elev)', borderColor: 'var(--background)', boxShadow: '0 10px 24px -8px rgba(30,77,58,.6)' }}
          >
            <Plus size={24} strokeWidth={2.2} />
          </button>
        </div>
        {tab('/pengeluaran', 'Keluar', Receipt)}
        <button
          onClick={() => setSheet('more')}
          className="flex min-h-[52px] w-full flex-col items-center justify-center gap-1 text-[11px]"
          style={{ color: moreActive ? 'var(--brand)' : 'var(--text-muted)', fontWeight: moreActive ? 700 : 500 }}
        >
          <Menu size={22} strokeWidth={1.8} />
          Lainnya
        </button>
      </nav>

      <Sheet open={sheet === 'quick'} onOpenChange={o => setSheet(o ? 'quick' : null)}>
        <SheetContent title="Catat baru">
          <div className="flex flex-col">
            {QUICK.map(({ href, label, desc, Icon, color, soft }) => (
              <Link
                key={label}
                href={hrefFor(href)}
                onClick={() => setSheet(null)}
                className="flex min-h-[60px] items-center gap-[14px] border-t py-[14px]"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px]" style={{ background: soft, color }}>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="flex-1">
                  <span className="block text-[15.5px] font-semibold">{label}</span>
                  <span className="mt-[2px] block text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{desc}</span>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheet === 'more'} onOpenChange={o => setSheet(o ? 'more' : null)}>
        <SheetContent title="Lainnya">
          <div className="grid grid-cols-3 gap-[10px]">
            {moreItems.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={hrefFor(href)}
                onClick={() => setSheet(null)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[14px] border px-2 py-4 text-center text-[12.5px] font-semibold"
                style={{ borderColor: 'var(--divider)', background: isActivePath(pathname, href) ? 'var(--accent-100)' : 'var(--surface-elev)' }}
              >
                <Icon size={22} strokeWidth={1.7} />
                {label}
              </Link>
            ))}
          </div>
          <button
            onClick={logout}
            className="mt-[14px] min-h-12 w-full rounded-full border text-[14px] font-semibold"
            style={{ borderColor: 'var(--divider)', color: 'var(--danger)' }}
          >
            Keluar dari akun
          </button>
        </SheetContent>
      </Sheet>
    </>
  )
}
