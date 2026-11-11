import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotaItem } from './types'

export const METODE_BAYAR = ['Tunai', 'Transfer', 'QRIS', 'Debit'] as const

/** Suggestions for the per-item unit field; any free text is accepted. */
export const SATUAN = ['PCS', 'BOT', 'DOS', 'BKS', 'PAK', 'BOX', 'LBR', 'KG', 'LTR', 'SET', 'PORSI'] as const

export const subtotalItems = (items: NotaItem[]) =>
  items.reduce((s, it) => s + Number(it.qty) * Number(it.harga), 0)

/** Next NT/{year}/{0001}: highest existing suffix + 1, same rule as generateNomor for bukti. */
export async function generateNomorNota(supabase: SupabaseClient): Promise<string> {
  const base = `NT/${new Date().getFullYear()}/`
  const { data } = await supabase.from('nota').select('nomor').like('nomor', `${base}%`)
  const max = (data || []).reduce((m, { nomor }) => {
    const n = parseInt(String(nomor).slice(base.length), 10)
    return Number.isNaN(n) ? m : Math.max(m, n)
  }, 0)
  return `${base}${String(max + 1).padStart(4, '0')}`
}
