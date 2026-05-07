import { createClient } from '@/lib/supabase/server'
import { PengeluaranClient } from './PengeluaranClient'
import type { Pengeluaran, DanaMasuk, Kategori } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PengeluaranPage() {
  const supabase = await createClient()

  const [{ data: pengeluaranList }, { data: danaList }, { data: kategoriList }] = await Promise.all([
    supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }),
    supabase.from('dana_masuk').select('id, nama_dana').order('nama_dana'),
    supabase.from('kategori').select('*').order('nama'),
  ])

  return (
    <PengeluaranClient
      pengeluaranList={(pengeluaranList || []) as Pengeluaran[]}
      danaList={(danaList || []) as Pick<DanaMasuk, 'id' | 'nama_dana'>[]}
      kategoriList={(kategoriList || []) as Kategori[]}
    />
  )
}
