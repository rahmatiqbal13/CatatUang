/** Modernist design tokens shared by every CatatUang screen. */

import type { CSSProperties } from 'react'

export const palette = {
  blue: '#2563d9',
  red: '#ec3013',
  green: '#0e8a5f',
  purple: '#6d3fd4',
  amber: '#c07a00',
  teal: '#0f7d92',
  ink: '#201e1d',
} as const

const dataCycle = [palette.blue, palette.purple, palette.green, palette.teal, palette.amber, palette.red]

/** Stable color for a name outside the known maps below — same name always picks the same hue. */
function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return dataCycle[Math.abs(hash) % dataCycle.length]
}

/**
 * Fund-source colour — drives card top borders, dots and progress fills.
 * `sumber` is free text from the editable `sumber_dana` master-data table, not a
 * closed union, so named entries from the design spec are exact and anything
 * else (custom master data) still gets a stable colour via the hash fallback.
 */
const namedSumberColor: Record<string, string> = {
  apbn: palette.blue,
  pnbp: palette.purple,
  hibah: palette.green,
  'kerja sama': palette.teal,
}

export const sumberColor = (sumber: string): string =>
  namedSumberColor[sumber.trim().toLowerCase()] ?? hashColor(sumber)

/** Expense-category colour — drives badges and bars. Same free-text situation as sumber. */
const namedKategoriColor: Record<string, string> = {
  'belanja barang': palette.blue,
  'perjalanan dinas': palette.red,
  pemeliharaan: palette.green,
  honorarium: palette.purple,
  konsumsi: palette.amber,
}

export const categoryColor = (name: string): string =>
  namedKategoriColor[name.trim().toLowerCase()] ?? hashColor(name)

export type StatusKind = 'wait' | 'ok' | 'no'

export const statusStyle: Record<StatusKind, { bg: string; fg: string }> = {
  wait: { bg: '#f6efe1', fg: '#8a5600' },
  ok: { bg: '#e2f2ea', fg: '#0b6b49' },
  no: { bg: '#ffe0d9', fg: '#ae1800' },
}

/** Map this repo's status strings (pengeluaran/peminjaman/invoice) onto the three visual kinds. */
export const statusKind = (s: string): StatusKind => {
  const v = s.toLowerCase()
  if (['approved', 'lunas', 'aktif', 'dibayar', 'selesai'].includes(v)) return 'ok'
  if (['rejected', 'ditolak', 'dibatalkan'].includes(v)) return 'no'
  return 'wait'
}

/** Human label for this repo's raw status strings, used alongside statusKind for the badge text. */
export const statusLabel = (s: string): string => {
  const map: Record<string, string> = {
    approved: 'Disetujui',
    pending: 'Menunggu',
    rejected: 'Ditolak',
    lunas: 'Lunas',
    belum_lunas: 'Belum Lunas',
    belum_dibayar: 'Belum Dibayar',
  }
  return map[s] ?? s
}

const rp = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/** 1850000000 -> "1.850.000.000" (prefix "Rp" separately, at 13px/600 per the KPI/list specs). */
export const formatRp = (n: number) => rp.format(Math.round(n))

/** 1850000000 -> { value: "1,85", unit: "M" } for the 32px KPI numerals. */
export const formatCompact = (n: number): { value: string; unit: string } => {
  const one = (x: number) => x.toFixed(2).replace('.', ',').replace(/,00$/, '')
  const abs = Math.abs(n)
  if (abs >= 1e9) return { value: one(n / 1e9), unit: 'M' }
  if (abs >= 1e6) return { value: one(n / 1e6), unit: 'jt' }
  if (abs >= 1e3) return { value: one(n / 1e3), unit: 'rb' }
  return { value: rp.format(n), unit: '' }
}

export const pct = (part: number, whole: number) =>
  whole <= 0 ? 0 : Math.min(100, Math.round((part / whole) * 1000) / 10)

/** Grid that never crushes its cells. Use instead of grid-cols-N per the anti-clipping rules. */
export const autoGrid = (min: number, gap = 16): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap,
})
