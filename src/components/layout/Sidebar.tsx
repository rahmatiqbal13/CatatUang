'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileBarChart,
  Settings,
  Database,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/dana',        label: 'Dana Masuk',  icon: Wallet          },
  { href: '/pengeluaran', label: 'Pengeluaran', icon: Receipt         },
  { href: '/laporan',     label: 'Laporan',     icon: FileBarChart    },
  { href: '/master-data', label: 'Master Data', icon: Database        },
  { href: '/pengaturan',  label: 'Pengaturan',  icon: Settings        },
]

interface SidebarProps {
  namaDirektorat?: string
}

interface UserProfile {
  nama: string
  role: string
}

export function Sidebar({ namaDirektorat = 'Keuangan Direktorat' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Try to get profile from profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('nama, role')
            .eq('id', user.id)
            .single()
          
          if (data && !error) {
            setProfile(data)
          } else {
            // Fallback: use email from auth user
            const emailName = user.email?.split('@')[0] || 'Admin'
            const formattedName = emailName
              .split('.')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            setProfile({
              nama: formattedName,
              role: 'super_admin'
            })
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        // Fallback to default
        setProfile({
          nama: 'Administrator',
          role: 'super_admin'
        })
      }
      setLoading(false)
    }
    fetchUserProfile()
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  const shortName = namaDirektorat.replace('Direktorat ', '')

  return (
    <aside
      className="w-[232px] shrink-0 h-screen sticky top-0 flex flex-col overflow-hidden"
      style={{
        background: 'var(--cu-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-4 h-14 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Wallet logo */}
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="var(--cu-primary)" />
          <path
            d="M10.5 12.5a4.5 4.5 0 014.5-4.5h2.5a4.5 4.5 0 014.5 4.5"
            stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"
          />
          <rect x="9" y="13.5" width="14" height="10.5" rx="2.5" stroke="white" strokeWidth="1.8" fill="none" />
          <circle cx="19" cy="18.75" r="1.4" fill="white" />
        </svg>
        <div style={{ lineHeight: 1.15 }}>
          <div className="font-semibold text-[13.5px] tracking-[-0.01em]" style={{ color: 'var(--cu-text)' }}>
            CatatUang
          </div>
          <div className="text-[10px] font-medium tracking-wide uppercase" style={{ color: 'var(--cu-text-muted)' }}>
            Finance · v2
          </div>
        </div>
      </div>

      {/* Org selector */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer"
          style={{
            background: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--cu-text-muted)' }}>
              Direktorat
            </div>
            <div
              className="text-[12px] font-medium truncate"
              style={{ color: 'var(--cu-text)' }}
              title={namaDirektorat}
            >
              {shortName}
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--cu-text-dim)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 4l4 4 4-4" />
          </svg>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div
          className="px-2 mb-1 text-[10px] font-medium uppercase tracking-[0.06em]"
          style={{ color: 'var(--cu-text-dim)' }}
        >
          Menu
        </div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[13px] transition-colors relative',
                'my-0.5',
                active
                  ? 'font-medium'
                  : 'font-normal hover:bg-[var(--cu-surface-2)]'
              )}
              style={{
                color: active ? 'var(--cu-text)' : 'var(--cu-text-2)',
                background: active ? 'var(--background)' : undefined,
                boxShadow: active ? 'inset 0 0 0 1px var(--border)' : undefined,
              }}
            >
              {/* Active indicator */}
              {active && (
                <span
                  className="absolute left-[-8px] top-2 bottom-2 w-0.5 rounded-full"
                  style={{ background: 'var(--cu-primary)' }}
                />
              )}
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: active ? 'var(--cu-primary)' : 'var(--cu-text-muted)' }}
              />
              <span className="flex-1">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ borderTop: '1px solid var(--border)' }} className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold"
            style={{
              background: 'var(--cu-primary-soft)',
              color: 'var(--cu-primary)',
            }}
          >
            {loading ? '...' : profile?.nama?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium truncate" style={{ color: 'var(--cu-text)' }}>
              {loading ? 'Memuat...' : profile?.nama || 'Pengguna'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--cu-text-muted)' }}>
              {loading ? '...' : profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'admin' ? 'Admin' : profile?.role || 'Pengguna'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-red-50"
            style={{ color: 'var(--cu-text-muted)' }}
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
