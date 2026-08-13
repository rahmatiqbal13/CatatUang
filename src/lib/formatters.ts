export function formatRupiah(value: number): string {
  // `style: 'currency'` is avoided here because its exact spacing/symbol
  // placement for 'id-ID' can differ between server (Node ICU) and browser
  // ICU versions, causing SSR hydration mismatches. Plain grouping + a
  // literal "Rp " prefix is stable across environments.
  const grouped = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value))
  return `Rp ${grouped}`
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

const TERBILANG_SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan']

function terbilangRatusan(n: number): string {
  let result = ''
  if (n >= 100) {
    const ratus = Math.floor(n / 100)
    result += (ratus === 1 ? 'Seratus' : `${TERBILANG_SATUAN[ratus]} Ratus`) + ' '
    n %= 100
  }
  if (n >= 20) {
    result += `${TERBILANG_SATUAN[Math.floor(n / 10)]} Puluh `
    n %= 10
    if (n > 0) result += `${TERBILANG_SATUAN[n]} `
  } else if (n === 11) {
    result += 'Sebelas '
  } else if (n === 10) {
    result += 'Sepuluh '
  } else if (n > 10) {
    result += `${TERBILANG_SATUAN[n - 10]} Belas `
  } else if (n > 0) {
    result += `${TERBILANG_SATUAN[n]} `
  }
  return result.trim()
}

/** Converts a number to Indonesian words, e.g. 250000 -> "Dua Ratus Lima Puluh Ribu" */
export function terbilang(value: number): string {
  const n = Math.floor(Math.abs(value))
  if (n === 0) return 'Nol'

  const parts: string[] = []
  const triliun = Math.floor(n / 1_000_000_000_000)
  const miliar  = Math.floor((n % 1_000_000_000_000) / 1_000_000_000)
  const juta    = Math.floor((n % 1_000_000_000) / 1_000_000)
  const ribu    = Math.floor((n % 1_000_000) / 1_000)
  const sisa    = n % 1_000

  if (triliun > 0) parts.push(`${terbilangRatusan(triliun)} Triliun`)
  if (miliar > 0) parts.push(`${terbilangRatusan(miliar)} Miliar`)
  if (juta > 0) parts.push(`${terbilangRatusan(juta)} Juta`)
  if (ribu > 0) parts.push(ribu === 1 ? 'Seribu' : `${terbilangRatusan(ribu)} Ribu`)
  if (sisa > 0) parts.push(terbilangRatusan(sisa))

  return parts.join(' ').trim()
}
