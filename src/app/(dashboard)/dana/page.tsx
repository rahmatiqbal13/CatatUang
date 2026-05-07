import { createClient } from '@/lib/supabase/server'
import { DanaClient } from './DanaClient'
import type { DanaMasuk, Pengeluaran, SumberDana } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DanaPage() {
  const supabase = await createClient()

  const [{ data: danaList }, { data: pengeluaranList }, { data: sumberList }] = await Promise.all([
    supabase.from('dana_masuk').select('*').order('created_at', { ascending: false }),
    supabase.from('pengeluaran').select('dana_id, jumlah, status'),
    supabase.from('sumber_dana').select('*').order('nama'),
  ])

  return (
    <DanaClient
      danaList={(danaList || []) as DanaMasuk[]}
      pengeluaranList={(pengeluaranList || []) as Pick<Pengeluaran, 'dana_id' | 'jumlah' | 'status'>[]}
      sumberList={(sumberList || []) as SumberDana[]}
    />
  )
}
