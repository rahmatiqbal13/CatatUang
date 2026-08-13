import type { SupabaseClient } from '@supabase/supabase-js'
import type { Buku } from './types'

export async function resolveBuku(supabase: SupabaseClient, requestedId?: string) {
  const { data } = await supabase.from('buku').select('*').order('tahun', { ascending: false })
  const bukuList = (data || []) as Buku[]
  const current = (requestedId && bukuList.find(b => String(b.id) === requestedId)) || bukuList[0] || null
  return { bukuList, current }
}
