import { createClient } from '@/lib/supabase/server'
import { resolveBuku } from '@/lib/buku'
import { PengeluaranClient } from './PengeluaranClient'
import type { Pengeluaran, DanaMasuk, Kategori } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PengeluaranPage({ searchParams }: { searchParams: Promise<{ buku?: string }> }) {
  const { buku: bukuParam } = await searchParams
  const supabase = await createClient()
  const { current: currentBuku } = await resolveBuku(supabase, bukuParam)
  const bukuId = currentBuku?.id ?? -1

  const [{ data: pengeluaranList }, { data: danaList }, { data: kategoriList }] = await Promise.all([
    supabase.from('pengeluaran').select('*, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId).order('tanggal', { ascending: false }),
    supabase.from('dana_masuk').select('id, nama_dana').eq('buku_id', bukuId).order('nama_dana'),
    supabase.from('kategori').select('*').order('nama'),
  ])

  return (
    <PengeluaranClient
      pengeluaranList={(pengeluaranList || []) as Pengeluaran[]}
      danaList={(danaList || []) as Pick<DanaMasuk, 'id' | 'nama_dana'>[]}
      kategoriList={(kategoriList || []) as Kategori[]}
      bukuNama={currentBuku?.nama ?? ''}
    />
  )
}
