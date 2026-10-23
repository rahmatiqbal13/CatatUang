import { createClient } from '@/lib/supabase/server'
import { BuktiUangClient } from './BuktiUangClient'
import type { BuktiUang } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function BuktiUangPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('bukti_uang').select('*').order('tanggal', { ascending: false })

  return <BuktiUangClient buktiList={(data || []) as BuktiUang[]} />
}
