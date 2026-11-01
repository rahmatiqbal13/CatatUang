import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/fetchAll'
import { resolveBuku } from '@/lib/buku'
import { Topbar } from '@/components/layout/Topbar'
import { SaldoHero } from '@/components/dashboard/SaldoHero'
import { AlokasiList, type DanaRow } from '@/components/dashboard/AlokasiList'
import { ApprovalQueueClient, type PendingItem } from '@/components/dashboard/ApprovalQueueClient'
import { KategoriBars, type KategoriRow } from '@/components/dashboard/KategoriBars'
import { RecentList, type RecentRow } from '@/components/dashboard/RecentList'
import type { DanaMasuk, Pemasukan, Pengeluaran } from '@/lib/types'

export const dynamic = 'force-dynamic'

const shortDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d))
const longDate = (d: Date) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
const monthName = (d: string) => new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(d))

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ buku?: string }> }) {
  const { buku: bukuParam } = await searchParams
  const supabase = await createClient()
  const { current: currentBuku } = await resolveBuku(supabase, bukuParam)
  const bukuId = currentBuku?.id ?? -1

  const [{ data: danaList }, { data: pengeluaranList }, { data: pemasukanList }, { data: namaSetting }] = await Promise.all([
    supabase.from('dana_masuk').select('*').eq('buku_id', bukuId).order('created_at', { ascending: false }),
    fetchAll((from, to) => supabase.from('pengeluaran').select('*, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId).order('tanggal', { ascending: false }).order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('pemasukan').select('*, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId).order('tanggal', { ascending: false }).order('id').range(from, to)),
    supabase.from('settings').select('value').eq('key', 'nama_direktorat').maybeSingle(),
  ])

  const pemasukans = (pemasukanList || []) as Pemasukan[]
  const danas = ((danaList || []) as DanaMasuk[]).map(d => ({
    ...d,
    jumlah: pemasukans.filter(p => p.dana_id === d.id).reduce((s, p) => s + Number(p.jumlah), 0),
  }))
  const pengeluarans = (pengeluaranList || []) as Pengeluaran[]

  const approved = pengeluarans.filter(p => p.status === 'approved')
  const pending = pengeluarans.filter(p => p.status === 'pending')

  const totalDana = danas.reduce((s, d) => s + Number(d.jumlah), 0)
  const totalKeluar = approved.reduce((s, p) => s + Number(p.jumlah), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.jumlah), 0)

  const danaRows: DanaRow[] = danas.map(d => ({
    id: d.id,
    nama: d.nama_dana,
    sumber: d.sumber,
    alokasi: Number(d.jumlah),
    terpakai: approved.filter(p => p.dana_id === d.id).reduce((s, p) => s + Number(p.jumlah), 0),
  }))

  const pendingItems: PendingItem[] = pending.map(p => ({
    id: p.id,
    uraian: p.uraian,
    jumlah: Number(p.jumlah),
    meta: `${shortDate(p.tanggal)} · ${p.kategori} · ${p.nama_dana}`,
  }))

  const kategoriTotals = new Map<string, number>()
  for (const p of approved) kategoriTotals.set(p.kategori, (kategoriTotals.get(p.kategori) || 0) + Number(p.jumlah))
  const kategoriRows: KategoriRow[] = Array.from(kategoriTotals, ([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total)
  // approved is newest-first, so the last entry is the oldest.
  const periode = approved.length
    ? `${monthName(approved[approved.length - 1].tanggal)} – ${monthName(approved[0].tanggal)}`
    : undefined

  const recentRows: RecentRow[] = [
    ...pemasukans.map(p => ({ key: `in-${p.id}`, tanggal: p.tanggal, uraian: p.uraian, jumlah: Number(p.jumlah), masuk: true, meta: `${shortDate(p.tanggal)} · ${p.nama_dana}` })),
    ...pengeluarans.filter(p => p.status !== 'rejected').map(p => ({ key: `out-${p.id}`, tanggal: p.tanggal, uraian: p.uraian, jumlah: Number(p.jumlah), masuk: false, meta: `${shortDate(p.tanggal)} · ${p.kategori}${p.status === 'pending' ? ' · menunggu' : ''}` })),
  ]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, 6)

  const namaDirektorat = (namaSetting?.value as string | undefined) || 'Keuangan Direktorat'
  const twoCol = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 24, alignItems: 'start' } as const

  return (
    <div className="animate-fade-in">
      <Topbar
        crumb={`${currentBuku?.nama ?? '—'} / Ringkasan`}
        title="Ringkasan"
        subtitle={`${namaDirektorat} · per ${longDate(new Date())}`}
      />

      <div className="cu-page">
        <SaldoHero
          totalMasuk={totalDana}
          totalKeluar={totalKeluar}
          totalPending={totalPending}
          pemasukanCount={pemasukans.length}
          danaCount={danas.length}
          approvedCount={approved.length}
          pendingCount={pending.length}
        />

        <div style={twoCol}>
          <ApprovalQueueClient items={pendingItems} totalPending={totalPending} />
          <AlokasiList rows={danaRows} hrefAll={`/dana?buku=${bukuId}`} />
        </div>

        <div style={twoCol}>
          <KategoriBars rows={kategoriRows} periode={periode} />
          <RecentList rows={recentRows} />
        </div>
      </div>
    </div>
  )
}
