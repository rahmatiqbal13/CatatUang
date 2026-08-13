import { createClient } from '@/lib/supabase/server'
import { resolveBuku } from '@/lib/buku'
import { PeminjamanClient } from './PeminjamanClient'
import type { Peminjaman, DanaMasuk } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PeminjamanPage({ searchParams }: { searchParams: Promise<{ buku?: string }> }) {
  const { buku: bukuParam } = await searchParams
  const supabase = await createClient()
  const { current: currentBuku } = await resolveBuku(supabase, bukuParam)
  const bukuId = currentBuku?.id ?? -1

  const [{ data: peminjamanList }, { data: danaList }, { data: settings }] = await Promise.all([
    supabase.from('peminjaman').select('*, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId).order('tanggal', { ascending: false }),
    supabase.from('dana_masuk').select('id, nama_dana').eq('buku_id', bukuId).order('nama_dana'),
    supabase.from('settings').select('key, value'),
  ])

  const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value || '']))

  return (
    <PeminjamanClient
      peminjamanList={(peminjamanList || []) as Peminjaman[]}
      danaList={(danaList || []) as Pick<DanaMasuk, 'id' | 'nama_dana'>[]}
      bukuNama={currentBuku?.nama ?? ''}
      pihakPertamaNama={settingsMap.pihak_pertama_nama || ''}
      pihakPertamaJabatan={settingsMap.pihak_pertama_jabatan || ''}
      pihakPertamaInstansi={settingsMap.pihak_pertama_instansi || ''}
    />
  )
}
