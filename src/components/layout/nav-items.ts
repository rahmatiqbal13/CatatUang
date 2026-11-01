import {
  LayoutDashboard, Landmark, Receipt, ArrowLeftRight,
  FileText, ChartColumn, Database, Users, SlidersVertical,
} from 'lucide-react'

export type NavItem = { href: string; label: string; Icon: typeof Landmark; superAdminOnly?: boolean }

/** Full nav, grouped — the sidebar on desktop, the "Lainnya" sheet on small screens. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Arus kas',
    items: [
      { href: '/dashboard', label: 'Ringkasan', Icon: LayoutDashboard },
      { href: '/dana', label: 'Dana Masuk', Icon: Landmark },
      { href: '/pengeluaran', label: 'Pengeluaran', Icon: Receipt },
      { href: '/peminjaman', label: 'Peminjaman', Icon: ArrowLeftRight },
      { href: '/bukti-uang', label: 'Bukti Uang', Icon: FileText },
    ],
  },
  {
    label: 'Analisa',
    items: [{ href: '/laporan', label: 'Laporan', Icon: ChartColumn }],
  },
  {
    label: 'Administrasi',
    items: [
      { href: '/master-data', label: 'Master Data', Icon: Database },
      { href: '/pengguna', label: 'Pengguna', Icon: Users, superAdminOnly: true },
      { href: '/pengaturan', label: 'Pengaturan', Icon: SlidersVertical },
    ],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items)

/** Routes behind the mobile "Lainnya" tab (the rest have their own tab). */
export const MORE_PATHS = ['/peminjaman', '/bukti-uang', '/laporan', '/master-data', '/pengguna', '/pengaturan']

/** Paths that carry the active book in ?buku= — must match the existing repo constant. */
export const BOOK_SCOPED_PATHS = ['/dashboard', '/dana', '/pengeluaran', '/peminjaman', '/laporan']

export const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/')

export const initials = (nama: string) =>
  nama.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'

export const roleLabel = (role?: string) =>
  role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : role ?? ''
