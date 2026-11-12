import type { CSSProperties } from 'react'
import { subtotalItems } from '@/lib/nota'
import type { Nota, Toko } from '@/lib/types'

/** Props every nota style receives. `size` only applies to the paper (A4/A5) variant. */
export type PaperProps = { nota: Nota; toko: Toko; size: 'a4' | 'a5'; showNomor: boolean }
export type ThermalProps = { nota: Nota; toko: Toko; showNomor: boolean }

export type NotaStyle = {
  id: string
  label: string
  /** One line shown under the label in the style picker. */
  hint: string
  Paper: (p: PaperProps) => React.ReactNode
  Thermal: (p: ThermalProps) => React.ReactNode
}

/** Signature lines at the foot of every template: the recipient signs "Tanda terima"; "Hormat kami" is the store's, line only. */
export const SIGNATURES = ['Tanda terima', 'Hormat kami'] as const

// Generic shop-type words don't make a good monogram ("Toko Jaya Abadi" → "JA").
const GENERIC = new Set(['toko', 'apotek', 'kantin', 'warung', 'kedai', 'cv', 'pt', 'ud', 'tb', 'rm'])
export function monogram(nama: string) {
  const words = nama.split(/\s+/).filter(Boolean)
  const core = words.filter(w => !GENERIC.has(w.toLowerCase()))
  return (core.length ? core : words).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '·'
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** "16/10/2026 19:06" — time only when the nota was created on its own date (not backdated). */
export function stamp(nota: Nota) {
  const [y, m, d] = nota.tanggal.split('-')
  const date = `${d}/${m}/${y}`
  const created = new Date(nota.created_at)
  if (Number.isNaN(created.getTime())) return date
  const sameDay = created.getFullYear() === +y && created.getMonth() + 1 === +m && created.getDate() === +d
  return sameDay ? `${date} ${pad2(created.getHours())}:${pad2(created.getMinutes())}` : date
}


/** Subtotal and change, shared by every style. `kembali` is null when no payment was entered. */
export function totals(nota: Nota) {
  const subtotal = subtotalItems(nota.items)
  const kembali = nota.bayar != null ? Number(nota.bayar) - Number(nota.total) : null
  return { subtotal, kembali }
}

/** Paper sheet = paper minus @page margins, so the on-screen preview matches the print. */
export function paperSheet(size: 'a4' | 'a5'): CSSProperties {
  const a5 = size === 'a5'
  return {
    width: a5 ? '130mm' : '182mm',
    minHeight: a5 ? '192mm' : '269mm',
    background: '#fff',
    padding: a5 ? '9mm' : '14mm',
    boxSizing: 'content-box',
    boxShadow: '0 22px 44px -30px rgba(24,36,30,.45)',
    border: '1px solid var(--divider)',
  }
}

/** 80 mm roll ≈ 72 mm printable width. */
export const thermalSheet: CSSProperties = {
  width: '72mm',
  background: '#fff',
  color: '#000',
  padding: '4mm',
  boxSizing: 'content-box',
  boxShadow: '0 22px 44px -30px rgba(24,36,30,.45)',
}
