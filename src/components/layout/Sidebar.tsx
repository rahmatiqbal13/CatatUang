'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileBarChart,
  Settings,
  Database,
  Users,
  LogOut,
  Loader2,
  HandCoins,
  FileText,
  ReceiptText,
} from 'lucide-react'
import { toast } from 'sonner'
import { Suspense, useEffect, useState } from 'react'
import type { Buku } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, superAdminOnly: false },
  { href: '/dana',        label: 'Dana Masuk',  icon: Wallet,          superAdminOnly: false },
  { href: '/pengeluaran', label: 'Pengeluaran', icon: Receipt,         superAdminOnly: false },
  { href: '/peminjaman',  label: 'Peminjaman',  icon: HandCoins,       superAdminOnly: false },
  { href: '/invoice',     label: 'Invoice',     icon: FileText,        superAdminOnly: false },
  { href: '/kwitansi',    label: 'Kwitansi',    icon: ReceiptText,     superAdminOnly: false },
  { href: '/laporan',     label: 'Laporan',     icon: FileBarChart,    superAdminOnly: false },
  { href: '/master-data', label: 'Master Data', icon: Database,        superAdminOnly: false },
  { href: '/pengguna',    label: 'Pengguna',    icon: Users,           superAdminOnly: true  },
  { href: '/pengaturan',  label: 'Pengaturan',  icon: Settings,        superAdminOnly: false },
]

const BOOK_SCOPED_PATHS = ['/dashboard', '/dana', '/pengeluaran', '/peminjaman', '/laporan']

interface SidebarProps {
  namaDirektorat?: string
}

interface UserProfile {
  nama: string
  role: string
}

const CREATE_BUKU_VALUE = '__create__'

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={<aside className="w-[232px] shrink-0 h-screen" style={{ background: 'var(--cu-surface)', borderRight: '1px solid var(--border)' }} />}>
      <SidebarInner {...props} />
    </Suspense>
  )
}

function SidebarInner({ namaDirektorat = 'Keuangan Direktorat' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [bukuList, setBukuList] = useState<Buku[]>([])
  const [loadingBuku, setLoadingBuku] = useState(true)
  const [openCreateBuku, setOpenCreateBuku] = useState(false)
  const [newBukuNama, setNewBukuNama] = useState('')
  const [newBukuTahun, setNewBukuTahun] = useState('')
  const [savingBuku, setSavingBuku] = useState(false)

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

  async function fetchBukuList() {
    const { data } = await supabase.from('buku').select('*').order('tahun', { ascending: false })
    setBukuList((data || []) as Buku[])
    setLoadingBuku(false)
  }

  useEffect(() => {
    fetchBukuList()
  }, [supabase])

  const isBookScoped = BOOK_SCOPED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const currentBukuId = searchParams.get('buku') || (bukuList[0] ? String(bukuList[0].id) : '')
  const currentBuku = bukuList.find(b => String(b.id) === currentBukuId)

  function handleBukuChange(value: string | null) {
    if (!value) return
    if (value === CREATE_BUKU_VALUE) {
      setNewBukuNama('')
      setNewBukuTahun('')
      setOpenCreateBuku(true)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('buku', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  async function handleCreateBuku() {
    if (!newBukuNama.trim()) {
      toast.error('Nama buku wajib diisi')
      return
    }
    setSavingBuku(true)
    const { data, error } = await supabase
      .from('buku')
      .insert({ nama: newBukuNama.trim(), tahun: newBukuTahun ? Number(newBukuTahun) : null })
      .select('id')
      .single()
    if (error || !data) {
      toast.error('Gagal membuat buku: ' + (error?.message || 'unknown error'))
      setSavingBuku(false)
      return
    }
    toast.success('Buku dibuat')
    setSavingBuku(false)
    setOpenCreateBuku(false)
    await fetchBukuList()
    const params = new URLSearchParams(searchParams.toString())
    params.set('buku', String(data.id))
    router.push(`${pathname}?${params.toString()}`)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

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

      {/* Book switcher */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: 'var(--cu-text-muted)' }}
        >
          Buku
        </div>
        <Select
          value={currentBukuId}
          onValueChange={handleBukuChange}
          items={{
            ...Object.fromEntries(bukuList.map(b => [String(b.id), b.nama])),
            [CREATE_BUKU_VALUE]: '+ Buku Baru',
          }}
        >
          <SelectTrigger
            className="w-full h-[34px] text-[12px] rounded-md"
            style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
            disabled={loadingBuku}
          >
            <SelectValue placeholder={loadingBuku ? 'Memuat…' : 'Pilih buku'} />
          </SelectTrigger>
          <SelectContent>
            {bukuList.map(b => (
              <SelectItem key={b.id} value={String(b.id)}>{b.nama}</SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={CREATE_BUKU_VALUE}>+ Buku Baru</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div
          className="px-2 mb-1 text-[10px] font-medium uppercase tracking-[0.06em]"
          style={{ color: 'var(--cu-text-dim)' }}
        >
          Menu
        </div>
        {navItems.filter(item => !item.superAdminOnly || profile?.role === 'super_admin').map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const scoped = BOOK_SCOPED_PATHS.includes(href)
          const finalHref = scoped && currentBukuId ? `${href}?buku=${currentBukuId}` : href
          return (
            <Link
              key={href}
              href={finalHref}
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
            {loading ? '…' : profile?.nama?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium truncate" style={{ color: 'var(--cu-text)' }}>
              {loading ? 'Memuat…' : profile?.nama || 'Pengguna'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--cu-text-muted)' }}>
              {loading ? '…' : profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'admin' ? 'Admin' : profile?.role || 'Pengguna'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-red-50"
            style={{ color: 'var(--cu-text-muted)' }}
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create Buku Dialog */}
      <Dialog open={openCreateBuku} onOpenChange={setOpenCreateBuku}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">Buku Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nama Buku *</Label>
              <Input placeholder="cth: 2027" value={newBukuNama} onChange={e => setNewBukuNama(e.target.value)} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tahun</Label>
              <Input type="number" placeholder="2027" value={newBukuTahun} onChange={e => setNewBukuTahun(e.target.value)} className="h-9 text-[13px]" />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--cu-text-muted)' }}>
                Opsional — dipakai untuk urutan buku di pemilih.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenCreateBuku(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleCreateBuku} disabled={savingBuku} className="h-8 text-[12px]" style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {savingBuku ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
