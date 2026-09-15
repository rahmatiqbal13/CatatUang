import { createClient } from '@/lib/supabase/server'
import { resolveBuku } from '@/lib/buku'
import { Landmark, Receipt, Wallet, Clock } from 'lucide-react'
import { autoGrid, palette } from '@/lib/tokens'
import { Topbar } from '@/components/layout/Topbar'
import { BukuSwitcher } from '@/components/layout/BukuSwitcher'
import { StatCard } from '@/components/ui/StatCard'
import { AlokasiList, type DanaRow } from '@/components/dashboard/AlokasiList'
import { ApprovalQueueClient, type PendingItem } from '@/components/dashboard/ApprovalQueueClient'
import { KategoriBars, type KategoriRow } from '@/components/dashboard/KategoriBars'
import type { DanaMasuk, Pemasukan, Pengeluaran } from '@/lib/types'

export const dynamic = 'force-dynamic'

const shortDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d))

function monthlyTotal(items: { tanggal: string; jumlah: number }[], monthsAgo: number) {
  const now = new Date()
  const bucket = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const nextBucket = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1)
  return items.reduce((sum, item) => {
    const d = new Date(item.tanggal)
    return d >= bucket && d < nextBucket ? sum + Number(item.jumlah) : sum
  }, 0)
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ buku?: string }> }) {
  const { buku: bukuParam } = await searchParams
  const supabase = await createClient()
  const { current: currentBuku } = await resolveBuku(supabase, bukuParam)
  const bukuId = currentBuku?.id ?? -1

  const [{ data: danaList }, { data: pengeluaranList }, { data: pemasukanList }] = await Promise.all([
    supabase.from('dana_masuk').select('*').eq('buku_id', bukuId).order('created_at', { ascending: false }),
    supabase.from('pengeluaran').select('*, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId).order('tanggal', { ascending: false }),
    supabase.from('pemasukan').select('*, dana_masuk!inner(buku_id)').eq('dana_masuk.buku_id', bukuId).order('tanggal', { ascending: false }),
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
  const sisaSaldo = totalDana - totalKeluar
  const pctRealisasi = totalDana > 0 ? (totalKeluar / totalDana) * 100 : 0
  const pctSisa = totalDana > 0 ? (sisaSaldo / totalDana) * 100 : 0

  const danaThisMonth = monthlyTotal(pemasukans, 0)
  const danaLastMonth = monthlyTotal(pemasukans, 1)
  const danaDeltaPct = danaLastMonth > 0 ? ((danaThisMonth - danaLastMonth) / danaLastMonth) * 100 : danaThisMonth > 0 ? 100 : 0

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

  return (
    <div className="animate-fade-in">
      <Topbar
        title="Dashboard"
        subtitle={`Keuangan Direktorat · Buku ${currentBuku?.nama ?? '—'}`}
        bookSwitcher={<BukuSwitcher />}
      />

      <div className="cu-page">
        <div style={autoGrid(220)}>
          <StatCard label="Total Dana Masuk" amount={totalDana} bg={palette.blue} delta={`${danaDeltaPct >= 0 ? '↑' : '↓'} ${Math.abs(danaDeltaPct).toFixed(1)}% vs bulan lalu`} icon={<Landmark size={17} />} />
          <StatCard label="Realisasi" amount={totalKeluar} bg={palette.red} delta={`${pctRealisasi.toFixed(1)}% dari alokasi`} icon={<Receipt size={17} />} />
          <StatCard label="Sisa Saldo" amount={sisaSaldo} bg={palette.green} delta={`${pctSisa.toFixed(1)}% tersedia`} icon={<Wallet size={17} />} />
          <StatCard label="Menunggu Approval" amount={totalPending} bg={palette.ink} fg="#f3f2f2" delta={`${pending.length} transaksi perlu ditinjau`} icon={<Clock size={17} />} />
        </div>

        <div style={{ ...autoGrid(300), alignItems: 'start' }}>
          <AlokasiList rows={danaRows} hrefAll={`/dana?buku=${bukuId}`} />
          <div className="flex flex-col gap-4">
            <ApprovalQueueClient items={pendingItems} />
            <KategoriBars rows={kategoriRows} />
          </div>
        </div>
      </div>
    </div>
  )
}
