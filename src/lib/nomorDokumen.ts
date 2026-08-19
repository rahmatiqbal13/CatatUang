import type { SupabaseClient } from '@supabase/supabase-js'

export async function generateNomor(
  supabase: SupabaseClient,
  table: 'invoice' | 'kwitansi' | 'rab',
  prefix: string
): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)
  return `${prefix}/${year}/${String((count ?? 0) + 1).padStart(3, '0')}`
}
