import type { SupabaseClient } from '@supabase/supabase-js'
import type { JenisBuktiUang } from './types'

export async function generateNomor(
  supabase: SupabaseClient,
  jenis: JenisBuktiUang,
  prefix: string
): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('bukti_uang')
    .select('id', { count: 'exact', head: true })
    .eq('jenis', jenis)
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)
  return `${prefix}/${year}/${String((count ?? 0) + 1).padStart(3, '0')}`
}
