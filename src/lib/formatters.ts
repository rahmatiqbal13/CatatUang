export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatTanggal(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTanggalShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTanggalInput(date: string | Date): string {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

export function formatPersen(value: number, total: number): string {
  if (total === 0) return '0.00%'
  return ((value / total) * 100).toFixed(2) + '%'
}

export function hitungPersen(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

export type StatusColor = {
  bg: string
  text: string
  badge: string
  label: string
}

export function getStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = {
    approved: { bg: '#D1FAE5', text: '#065F46', badge: 'bg-emerald-100 text-emerald-800', label: 'Disetujui' },
    pending:  { bg: '#FEF3C7', text: '#92400E', badge: 'bg-amber-100 text-amber-800',   label: 'Menunggu'  },
    rejected: { bg: '#FEE2E2', text: '#991B1B', badge: 'bg-red-100 text-red-800',       label: 'Ditolak'   },
  }
  return map[status] ?? { bg: '#F1F5F9', text: '#475569', badge: 'bg-slate-100 text-slate-700', label: status }
}

export function formatBulan(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(date))
}
