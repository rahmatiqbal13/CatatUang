import type { SupabaseClient } from '@supabase/supabase-js'
import type { JenisBuktiUang } from './types'

// Next number = highest existing suffix + 1 (not row count + 1), so deleting a
// document never makes the next one reuse a number that's still in use.
export async function generateNomor(
  supabase: SupabaseClient,
  jenis: JenisBuktiUang,
  prefix: string
): Promise<string> {
  const year = new Date().getFullYear()
  const base = `${prefix}/${year}/`
  const { data } = await supabase
    .from('bukti_uang')
    .select('nomor')
    .eq('jenis', jenis)
    .like('nomor', `${base}%`)
  const max = (data || []).reduce((m, { nomor }) => {
    const n = parseInt(String(nomor).slice(base.length), 10)
    return Number.isNaN(n) ? m : Math.max(m, n)
  }, 0)
  return `${base}${String(max + 1).padStart(3, '0')}`
}
