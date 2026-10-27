import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/fetchAll'
import { BuktiUangClient } from './BuktiUangClient'
import type { BuktiUang } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function BuktiUangPage() {
  const supabase = await createClient()
  const { data } = await fetchAll((from, to) => supabase.from('bukti_uang').select('*').order('tanggal', { ascending: false }).order('id').range(from, to))

  return <BuktiUangClient buktiList={(data || []) as BuktiUang[]} />
}
