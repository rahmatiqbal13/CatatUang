'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Wallet, Receipt, FileBarChart,
  Settings, Database, LogOut, Trophy, ChevronRight,
  TrendingUp, Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/dana',         label: 'Dana Masuk',    icon: Wallet           },
  { href: '/pengeluaran',  label: 'Pengeluaran',   icon: Receipt          },
  { href: '/laporan',      label: 'Laporan',       icon: FileBarChart     },
  { href: '/master-data',  label: 'Master Data',   icon: Database         },
  { href: '/pengaturan',   label: 'Pengaturan',    icon: Settings         },
]

interface SidebarProps {
  namaDirektorat?: string
}

export function Sidebar({ namaDirektorat = 'Keuangan Direktorat' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            {/* Decorative ring */}
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 opacity-20 blur-sm" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight truncate tracking-tight">
              {namaDirektorat}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Sistem Aktif
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Menu Utama
        </p>
        
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden',
                active
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {/* Active background gradient */}
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl" />
              )}
              
              {/* Active glow effect */}
              {active && (
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md" />
              )}
              
              <div className="relative flex items-center gap-3 w-full">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                  active 
                    ? 'bg-white/20' 
                    : 'bg-white/5 group-hover:bg-white/10'
                )}>
                  <Icon className={cn(
                    'w-4 h-4 shrink-0 transition-transform duration-200',
                    active ? 'text-white' : 'text-slate-400 group-hover:text-white',
                    active && 'scale-110'
                  )} />
                </div>
                
                <span className="flex-1 relative">{label}</span>
                
                {active && (
                  <ChevronRight className="w-4 h-4 text-white/60 animate-bounce-subtle" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Stats Summary */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Performa</p>
              <p className="text-sm font-bold text-white">Optimal</p>
            </div>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
          onClick={handleLogout}
        >
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="font-medium">Keluar</span>
        </Button>
      </div>

      {/* Credit */}
      <div className="px-6 pb-4 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-500">
            Dibuat oleh <span className="text-slate-400 font-medium">Rahmat Iqbal</span>
          </p>
          <p className="text-[10px] text-slate-600">2026</p>
        </div>
      </div>
    </aside>
  )
}
