import { createClient } from '@/lib/supabase/server'
import { resolveBuku } from '@/lib/buku'
import { DanaClient } from './DanaClient'
import type { DanaMasuk, Pemasukan, Pengeluaran, SumberDana } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DanaPage({ searchParams }: { searchParams: Promise<{ buku?: string }> }) {
  const { buku: bukuParam } = await searchParams
  const supabase = await createClient()
  const { bukuList, current: currentBuku } = await resolveBuku(supabase, bukuParam)
  const bukuId = currentBuku?.id ?? -1

  const [{ data: danaList }, { data: pengeluaranList }, { data: pemasukanList }, { data: sumberList }] = await Promise.all([
    supabase.from('dana_masuk').select('*').eq('buku_id', bukuId).order('created_at', { ascending: false }),
    supabase.from('pengeluaran').select('dana_id, jumlah, status, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId),
    supabase.from('pemasukan').select('dana_id, jumlah, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId),
    supabase.from('sumber_dana').select('*').order('nama'),
  ])

  const pemasukans = (pemasukanList || []) as Pick<Pemasukan, 'dana_id' | 'jumlah'>[]
  const danas = ((danaList || []) as DanaMasuk[]).map(d => ({
    ...d,
    jumlah: pemasukans.filter(p => p.dana_id === d.id).reduce((s, p) => s + Number(p.jumlah), 0),
  }))

  return (
    <DanaClient
      danaList={danas}
      pengeluaranList={(pengeluaranList || []) as Pick<Pengeluaran, 'dana_id' | 'jumlah' | 'status'>[]}
      sumberList={(sumberList || []) as SumberDana[]}
      bukuId={bukuId}
      bukuNama={currentBuku?.nama ?? ''}
      bukuKosong={bukuList.length === 0}
    />
  )
}
