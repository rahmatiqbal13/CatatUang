'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/use-user-profile'
import { toast } from 'sonner'
import { Menu, LogOut } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NAV_ITEMS, BOOK_SCOPED_PATHS } from './nav-items'

/**
 * The 76px rail (all 11 routes) is hidden on mobile in favour of a 4-item bottom
 * tab bar (Dash/Dana/Keluar/Lapor). This sheet keeps the other 7 routes — and
 * logout — reachable on small screens, so nothing that worked before is lost.
 */
export function MobileMoreMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { profile } = useUserProfile()

  const buku = searchParams.get('buku')
  const hrefFor = (href: string) =>
    buku && BOOK_SCOPED_PATHS.includes(href) ? `${href}?buku=${buku}` : href
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu lainnya"
        className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center"
        style={{ color: '#f3f2f2' }}
      >
        <Menu size={18} strokeWidth={2} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-extrabold">Menu</DialogTitle>
          </DialogHeader>
          <ul className="flex flex-col gap-[2px] py-1">
            {NAV_ITEMS.filter(i => !i.superAdminOnly || profile?.role === 'super_admin').map(({ href, label, Icon }) => {
              const active = isActive(href)
              return (
                <li key={href}>
                  <Link
                    href={hrefFor(href)}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-[10px] text-[13.5px] font-bold"
                    style={{
                      background: active ? '#201e1d' : 'transparent',
                      color: active ? '#f3f2f2' : 'var(--text)',
                    }}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    {label}
                  </Link>
                </li>
              )
            })}
            <li>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-[10px] text-[13.5px] font-bold"
                style={{ color: 'var(--accent-press)' }}
              >
                <LogOut size={18} strokeWidth={1.75} />
                Keluar
              </button>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
