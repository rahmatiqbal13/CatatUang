import { createClient } from '@/lib/supabase/server'
import { resolveBuku } from '@/lib/buku'
import { LaporanClient } from './LaporanClient'
import type { DanaMasuk, Pemasukan, Pengeluaran } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function LaporanPage({ searchParams }: { searchParams: Promise<{ dana?: string; buku?: string }> }) {
  const { dana: danaFilter, buku: bukuParam } = await searchParams
  const supabase = await createClient()
  const { current: currentBuku } = await resolveBuku(supabase, bukuParam)
  const bukuId = currentBuku?.id ?? -1

  const [{ data: danaList }, { data: pengeluaranList }, { data: pemasukanList }, { data: settings }] = await Promise.all([
    supabase.from('dana_masuk').select('*').eq('buku_id', bukuId).order('created_at', { ascending: false }),
    supabase.from('pengeluaran').select('*, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId).order('tanggal', { ascending: false }),
    supabase.from('pemasukan').select('*, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId).order('tanggal', { ascending: false }),
    supabase.from('settings').select('key, value'),
  ])

  const pemasukans = (pemasukanList || []) as Pemasukan[]
  const danas = ((danaList || []) as DanaMasuk[]).map(d => ({
    ...d,
    jumlah: pemasukans.filter(p => p.dana_id === d.id).reduce((s, p) => s + Number(p.jumlah), 0),
  }))

  const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value || '']))

  return (
    <LaporanClient
      danaList={danas}
      pengeluaranList={(pengeluaranList || []) as Pengeluaran[]}
      settingsMap={settingsMap}
      initialDanaFilter={danaFilter || 'all'}
      bukuNama={currentBuku?.nama ?? ''}
    />
  )
}
