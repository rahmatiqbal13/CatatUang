import {
  LayoutDashboard, Landmark, Receipt, HandCoins, FileText,
  ReceiptText, ClipboardList, FileBarChart, Database, Users, Settings, Wallet,
} from 'lucide-react'

export type NavItem = { href: string; label: string; Icon: typeof Wallet; superAdminOnly?: boolean }

/** Full nav — the 76px rail on desktop, the mobile "more" sheet on small screens. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dash', Icon: LayoutDashboard },
  { href: '/dana', label: 'Dana', Icon: Landmark },
  { href: '/pengeluaran', label: 'Keluar', Icon: Receipt },
  { href: '/peminjaman', label: 'Pinjam', Icon: HandCoins },
  { href: '/invoice', label: 'Invoice', Icon: FileText },
  { href: '/kwitansi', label: 'Kwitansi', Icon: ReceiptText },
  { href: '/rab', label: 'RAB', Icon: ClipboardList },
  { href: '/laporan', label: 'Laporan', Icon: FileBarChart },
  { href: '/master-data', label: 'Master', Icon: Database },
  { href: '/pengguna', label: 'User', Icon: Users, superAdminOnly: true },
  { href: '/pengaturan', label: 'Setting', Icon: Settings },
]

/** Paths that carry the active book in ?buku= — must match the existing repo constant. */
export const BOOK_SCOPED_PATHS = ['/dashboard', '/dana', '/pengeluaran', '/peminjaman', '/laporan']
