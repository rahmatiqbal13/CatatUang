'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { handleSupabaseError } from '@/lib/error-handler'
import { setPengeluaranStatus } from '@/lib/pengeluaran'
import { useUserProfile } from '@/hooks/use-user-profile'
import { formatRupiah, formatTanggal, hitungPersen } from '@/lib/formatters'
import type { DanaMasuk, Pemasukan, Pengeluaran, Kategori } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { TableWrap, Th, Td } from '@/components/ui/TableWrap'
import { StatusBadge, SolidBadge } from '@/components/ui/StatusBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { autoGrid, sumberColor, categoryColor, palette } from '@/lib/tokens'

type Props = { dana: DanaMasuk; pengeluaranList: Pengeluaran[]; pemasukanList: Pemasukan[]; kategoriList: Kategori[] }
type FormData = { uraian: string; kategori: string; jumlah: string; tanggal: string; keterangan: string }
const emptyForm: FormData = { uraian: '', kategori: '', jumlah: '', tanggal: '', keterangan: '' }

type TambahDanaForm = { uraian: string; jumlah: string; tanggal: string; keterangan: string }
const emptyTambahDanaForm: TambahDanaForm = { uraian: '', jumlah: '', tanggal: '', keterangan: '' }

function fmtCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} jt`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)} rb`
  return String(n)
}

const TABS = [
  { key: 'all',      label: 'Semua' },
  { key: 'pending',  label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
]

export function DanaDetailClient({ dana, pengeluaranList, pemasukanList, kategoriList }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const { profile } = useUserProfile()
  const isSuperAdmin = profile?.role === 'super_admin'
  const [, startTransition] = useTransition()
  const [openForm, setOpenForm]     = useState(false)
  const [openDel, setOpenDel]       = useState(false)
  const [editTarget, setEditTarget] = useState<Pengeluaran | null>(null)
  const [delTarget, setDelTarget]   = useState<Pengeluaran | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  
  // Pemasukan states
  const [openTambahDana, setOpenTambahDana] = useState(false)
  const [tambahDanaForm, setTambahDanaForm] = useState<TambahDanaForm>(emptyTambahDanaForm)
  const [savingDana, setSavingDana] = useState(false)
  const [editPemasukanTarget, setEditPemasukanTarget] = useState<Pemasukan | null>(null)
  const [openDelPemasukan, setOpenDelPemasukan] = useState(false)
  const [delPemasukanTarget, setDelPemasukanTarget] = useState<Pemasukan | null>(null)

  const approved    = pengeluaranList.filter(p => p.status === 'approved')
  const pending     = pengeluaranList.filter(p => p.status === 'pending')
  const totalKeluar  = approved.reduce((s, p) => s + Number(p.jumlah), 0)
  const totalMasuk = pemasukanList.reduce((s, p) => s + Number(p.jumlah), 0)
  const sisa  = totalMasuk - totalKeluar
  const persen = hitungPersen(totalKeluar, totalMasuk)

  const perKategori = kategoriList.map(k => {
    const total = approved.filter(p => p.kategori === k.nama).reduce((s, p) => s + Number(p.jumlah), 0)
    return { nama: k.nama, total }
  }).filter(k => k.total > 0).sort((a, b) => b.total - a.total)

  const filtered = pengeluaranList.filter(p => activeTab === 'all' || p.status === activeTab)

  const counts: Record<string, number> = {
    all:      pengeluaranList.length,
    pending:  pending.length,
    approved: approved.length,
    rejected: pengeluaranList.filter(p => p.status === 'rejected').length,
  }

  function openAdd() { setEditTarget(null); setForm(emptyForm); setOpenForm(true) }
  function openEdit(p: Pengeluaran) {
    setEditTarget(p)
    setForm({ uraian: p.uraian, kategori: p.kategori, jumlah: String(p.jumlah), tanggal: p.tanggal, keterangan: p.keterangan || '' })
    setOpenForm(true)
  }

  async function handleSave() {
    if (!form.uraian || !form.kategori || !form.jumlah || !form.tanggal) {
      toast.error('Lengkapi semua field wajib'); return
    }
    const jumlah = parseFloat(form.jumlah)
    if (isNaN(jumlah) || jumlah <= 0) {
      toast.error('Jumlah tidak valid'); return
    }
    setSaving(true)
    const payload = {
      dana_id: dana.id, nama_dana: dana.nama_dana,
      uraian: form.uraian, kategori: form.kategori,
      jumlah, tanggal: form.tanggal,
      keterangan: form.keterangan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('pengeluaran').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Pengeluaran diperbarui')
    } else {
      const { error } = await supabase.from('pengeluaran').insert({ ...payload, status: 'pending' })
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Pengeluaran ditambahkan')
    }
    setSaving(false); setOpenForm(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('pengeluaran').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('Pengeluaran dihapus')
    setSaving(false); setOpenDel(false)
    startTransition(() => router.refresh())
  }

  async function handleStatus(id: number, status: 'approved' | 'rejected') {
    try {
      await setPengeluaranStatus(supabase, id, status)
    } catch (e) {
      toast.error(handleSupabaseError(e)); return
    }
    toast.success(status === 'approved' ? 'Pengeluaran disetujui' : 'Pengeluaran ditolak')
    startTransition(() => router.refresh())
  }

  function openAddPemasukan() {
    setEditPemasukanTarget(null)
    setTambahDanaForm(emptyTambahDanaForm)
    setOpenTambahDana(true)
  }
  function openEditPemasukan(p: Pemasukan) {
    setEditPemasukanTarget(p)
    setTambahDanaForm({ uraian: p.uraian, jumlah: String(p.jumlah), tanggal: p.tanggal, keterangan: p.keterangan || '' })
    setOpenTambahDana(true)
  }

  // Handler untuk tambah/edit pemasukan
  async function handleTambahDana() {
    if (!tambahDanaForm.uraian || !tambahDanaForm.jumlah || !tambahDanaForm.tanggal) {
      toast.error('Uraian, jumlah dan tanggal wajib diisi'); return
    }

    const tambahanJumlah = parseFloat(tambahDanaForm.jumlah)
    if (isNaN(tambahanJumlah) || tambahanJumlah <= 0) {
      toast.error('Jumlah tidak valid'); return
    }

    setSavingDana(true)

    if (editPemasukanTarget) {
      const { error: updateError } = await supabase.from('pemasukan').update({
        uraian: tambahDanaForm.uraian,
        jumlah: tambahanJumlah,
        tanggal: tambahDanaForm.tanggal,
        keterangan: tambahDanaForm.keterangan || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editPemasukanTarget.id)

      if (updateError) {
        toast.error('Gagal memperbarui pemasukan: ' + updateError.message)
        setSavingDana(false)
        return
      }
      toast.success('Pemasukan diperbarui')
    } else {
      const { error: insertError } = await supabase.from('pemasukan').insert({
        dana_id: dana.id,
        nama_dana: dana.nama_dana,
        uraian: tambahDanaForm.uraian,
        jumlah: tambahanJumlah,
        tanggal: tambahDanaForm.tanggal,
        keterangan: tambahDanaForm.keterangan || null,
      })

      if (insertError) {
        toast.error('Gagal menambah pemasukan: ' + insertError.message)
        setSavingDana(false)
        return
      }

      // Log aktivitas — best effort; supabase returns errors rather than throwing
      const { error: logError } = await supabase.from('activity_log').insert({
        aksi: 'TAMBAH_PEMASUKAN',
        keterangan: `${tambahDanaForm.uraian}: ${fmtCompact(tambahanJumlah)}`,
        entity_type: 'dana_masuk',
        entity_id: dana.id,
        created_at: new Date().toISOString()
      })
      if (logError) console.error('activity_log insert failed:', logError)

      toast.success(`Berhasil menambah ${fmtCompact(tambahanJumlah)} ke ${dana.nama_dana}`)
    }

    setSavingDana(false)
    setOpenTambahDana(false)
    setEditPemasukanTarget(null)
    setTambahDanaForm(emptyTambahDanaForm)
    startTransition(() => router.refresh())
  }

  async function handleDeletePemasukan() {
    if (!delPemasukanTarget) return
    setSavingDana(true)
    const { error } = await supabase.from('pemasukan').delete().eq('id', delPemasukanTarget.id)
    if (error) {
      toast.error('Gagal menghapus pemasukan: ' + error.message)
      setSavingDana(false)
      return
    }
    toast.success('Pemasukan dihapus')
    setSavingDana(false)
    setOpenDelPemasukan(false)
    setDelPemasukanTarget(null)
    startTransition(() => router.refresh())
  }

  const danaColor = sumberColor(dana.sumber)

  return (
    <div className="animate-fade-in">
      <Topbar
        back={
          <Link href={`/dana?buku=${dana.buku_id}`} className="text-[13px] font-semibold" style={{ color: 'var(--brand)' }}>
            ← Semua dompet
          </Link>
        }
        crumb="Dana Masuk / Detail"
        title={dana.nama_dana}
        subtitle={`${dana.sumber} · masuk ${formatTanggal(dana.tanggal)}`}
        action={
          <div className="flex gap-2">
            <Link
              href={`/laporan?dana=${dana.id}`}
              className="inline-flex items-center rounded-full border px-[18px] py-[10px] text-[14px] font-semibold whitespace-nowrap transition-colors hover:bg-[var(--surface-2)]"
              style={{ borderColor: 'var(--text)', color: 'var(--text)' }}
            >
              Laporan
            </Link>
            <BarButton variant="outline" onClick={openAddPemasukan}>+ Pemasukan</BarButton>
            <BarButton variant="primary" onClick={openAdd}>+ Pengeluaran</BarButton>
          </div>
        }
      />

      <div className="cu-page">
        {/* Stats + usage bar */}
        <section className="card-shell flex flex-col gap-5 px-6 py-[22px]">
          <div style={autoGrid(170, 20)}>
            {[
              { label: 'Total masuk', value: fmtCompact(totalMasuk), color: danaColor },
              { label: 'Terpakai', value: fmtCompact(totalKeluar), color: 'var(--keluar)' },
              { label: 'Realisasi', value: `${persen.toFixed(1).replace('.', ',')}%`, color: 'var(--text)' },
              { label: 'Sisa saldo', value: fmtCompact(sisa), color: sisa < 0 ? 'var(--danger)' : 'var(--accent)' },
            ].map(kpi => (
              <div key={kpi.label}>
                <div className="label-caps" style={{ color: 'var(--text-muted)' }}>{kpi.label}</div>
                <div className="serif mt-[6px] text-[30px] tracking-[-0.02em] whitespace-nowrap" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>
          <ProgressBar used={totalKeluar} total={totalMasuk} color="var(--keluar)" height={10} />
        </section>

        {/* Transaksi Dana Ini */}
        <div className="card-shell overflow-hidden">
          <div className="px-6 pt-[22px] pb-3">
            <div className="serif text-[24px] tracking-[-0.01em]" style={{ color: 'var(--text)' }}>
              Transaksi Dana Ini
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2 px-[18px] py-3">
            {TABS.map(tab => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                  style={{
                    padding: '7px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: active ? 'var(--accent-100)' : 'transparent',
                    color: active ? 'var(--brand)' : 'var(--text)',
                    border: active ? '1px solid #9DBBA8' : '1px solid var(--border-dashed)',
                  }}
                >
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span
                      className="text-[10.5px] px-1.5"
                      style={{
                        background: active ? 'rgba(255,255,255,0.18)' : 'var(--surface-2)',
                        color: active ? 'var(--brand)' : 'var(--text-muted)',
                      }}
                    >
                      {counts[tab.key]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Tidak ada pengeluaran
            </div>
          ) : (
            <TableWrap minWidth={620}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th width={100}>Tanggal</Th>
                    <Th>Uraian</Th>
                    <Th width={140}>Kategori</Th>
                    <Th align="right" width={120}>Jumlah</Th>
                    <Th width={110}>Status</Th>
                    <Th align="right" width={110}>Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <Td>
                        <span className="whitespace-nowrap tabular-nums text-[12px]" style={{ color: 'var(--text-2)' }}>
                          {formatTanggal(p.tanggal)}
                        </span>
                      </Td>
                      <Td>
                        <div className="font-semibold text-[12.5px]" style={{ color: 'var(--text)' }}>
                          {p.uraian}
                        </div>
                        {p.keterangan && (
                          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {p.keterangan}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <SolidBadge color={categoryColor(p.kategori)}>{p.kategori}</SolidBadge>
                      </Td>
                      <Td align="right">
                        <span className="cu-mono font-semibold whitespace-nowrap text-[13.5px]" style={{ color: 'var(--text)' }}>
                          {formatRupiah(Number(p.jumlah))}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={p.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-[6px]">
                          {p.status === 'pending' && isSuperAdmin && (
                            <>
                              <button
                                onClick={() => handleStatus(p.id, 'approved')}
                                title="Setujui"
                                aria-label={`Setujui ${p.uraian}`}
                                className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[14px]"
                                style={{ background: 'var(--accent-100)', color: 'var(--accent-fg)' }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleStatus(p.id, 'rejected')}
                                title="Tolak"
                                aria-label={`Tolak ${p.uraian}`}
                                className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[14px]"
                                style={{
                                  border: '1px solid var(--divider)',
                                  color: 'var(--danger)',
                                }}
                              >
                                ✕
                              </button>
                            </>
                          )}
                          {/* Approved spending is locked; only a super admin may delete it. */}
                          {p.status !== 'approved' && <button
                            onClick={() => openEdit(p)}
                            title="Edit"
                            aria-label={`Edit ${p.uraian}`}
                            className="w-6 h-6 flex items-center justify-center transition-colors hover:bg-[var(--surface-hover)]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
                            </svg>
                          </button>}
                          {(p.status !== 'approved' || isSuperAdmin) && <button
                            onClick={() => { setDelTarget(p); setOpenDel(true) }}
                            title="Hapus"
                            aria-label={`Hapus ${p.uraian}`}
                            className="w-6 h-6 flex items-center justify-center transition-colors hover:bg-[var(--surface-hover)]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9.5h5L11 4" />
                            </svg>
                          </button>}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>

        {/* Riwayat Pemasukan */}
        <div className="card-shell overflow-hidden">
          <div className="px-6 pt-[22px] pb-3">
            <div className="serif text-[24px] tracking-[-0.01em]" style={{ color: 'var(--text)' }}>
              Riwayat Pemasukan
            </div>
          </div>
          {pemasukanList.length === 0 ? (
            <div className="py-14 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Belum ada pemasukan
            </div>
          ) : (
            <TableWrap minWidth={520}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th width={100}>Tanggal</Th>
                    <Th>Uraian</Th>
                    <Th width={110}>Jenis</Th>
                    <Th align="right" width={140}>Jumlah</Th>
                    <Th align="right" width={80}>Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {pemasukanList.map(p => (
                    <tr key={p.id}>
                      <Td>
                        <span className="whitespace-nowrap tabular-nums text-[12px]" style={{ color: 'var(--text-2)' }}>
                          {formatTanggal(p.tanggal)}
                        </span>
                      </Td>
                      <Td>
                        <div className="font-semibold text-[12.5px]" style={{ color: 'var(--text)' }}>
                          {p.uraian}
                        </div>
                        {p.keterangan && (
                          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {p.keterangan}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <SolidBadge color={palette.green}>Masuk</SolidBadge>
                      </Td>
                      <Td align="right">
                        <span className="cu-mono font-semibold whitespace-nowrap text-[13.5px]" style={{ color: palette.green }}>
                          {formatRupiah(Number(p.jumlah))}
                        </span>
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-[6px]">
                          <button
                            onClick={() => openEditPemasukan(p)}
                            title="Edit"
                            aria-label="Edit pemasukan"
                            className="w-6 h-6 flex items-center justify-center transition-colors hover:bg-[var(--surface-hover)]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setDelPemasukanTarget(p); setOpenDelPemasukan(true) }}
                            title="Hapus"
                            aria-label="Hapus pemasukan"
                            className="w-6 h-6 flex items-center justify-center transition-colors hover:bg-[var(--surface-hover)]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9.5h5L11 4" />
                            </svg>
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>

        {/* Per Kategori */}
        {perKategori.length > 0 && (
          <div className="card-shell overflow-hidden">
            <div className="px-6 pt-[22px] pb-3">
              <div className="serif text-[24px] tracking-[-0.01em]" style={{ color: 'var(--text)' }}>
                Breakdown per Kategori
              </div>
            </div>
            <div className="px-[18px] py-4 flex flex-col gap-3">
              {perKategori.map(k => {
                const p = hitungPersen(k.total, totalKeluar)
                return (
                  <div key={k.nama}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12.5px] font-semibold" style={{ color: 'var(--text)' }}>{k.nama}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                          {fmtCompact(k.total)}
                        </span>
                        <span className="text-[11px] w-9 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {p.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar used={k.total} total={totalKeluar} color={categoryColor(k.nama)} height={8} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Uraian <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Deskripsi pengeluaran"
                value={form.uraian}
                onChange={e => setForm(f => ({ ...f, uraian: e.target.value }))}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Kategori <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <Select
                  value={form.kategori}
                  onValueChange={v => setForm(f => ({ ...f, kategori: v ?? '' }))}
                  items={Object.fromEntries(kategoriList.map(k => [k.nama, k.nama]))}
                >
                  <SelectTrigger
                    className="h-[34px] text-[13px] rounded-[5px]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--divider)' }}
                  >
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {kategoriList.map(k => (
                      <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Jumlah <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.jumlah}
                  onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                  className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none cu-mono"
                  style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Tanggal <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="date"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Keterangan
              </label>
              <Textarea
                rows={2}
                placeholder="Keterangan tambahan (opsional)"
                value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="text-[13px] resize-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpenForm(false)}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--divider)', color: 'var(--text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
            >
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : 'Simpan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Pengeluaran</DialogTitle>
          </DialogHeader>
          <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Hapus <strong style={{ color: 'var(--text)' }}>{delTarget?.uraian}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <button
              onClick={() => setOpenDel(false)}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--divider)', color: 'var(--text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tambah/Edit Pemasukan Dialog */}
      <Dialog open={openTambahDana} onOpenChange={setOpenTambahDana}>
        <DialogContent className="sm:max-w-md" style={{ background: 'var(--surface)' }}>
          <DialogHeader>
            <DialogTitle>
              {editPemasukanTarget ? 'Edit Pemasukan' : 'Tambah Pemasukan'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Uraian <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Deskripsi dana masuk"
                value={tambahDanaForm.uraian}
                onChange={e => setTambahDanaForm(f => ({ ...f, uraian: e.target.value }))}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Jumlah <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={tambahDanaForm.jumlah}
                  onChange={e => setTambahDanaForm(f => ({ ...f, jumlah: e.target.value }))}
                  className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none cu-mono"
                  style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Tanggal <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={tambahDanaForm.tanggal}
                  onChange={e => setTambahDanaForm(f => ({ ...f, tanggal: e.target.value }))}
                  className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Keterangan
              </label>
              <Textarea
                rows={2}
                placeholder="Keterangan tambahan (opsional)"
                value={tambahDanaForm.keterangan}
                onChange={e => setTambahDanaForm(f => ({ ...f, keterangan: e.target.value }))}
                className="text-[13px] resize-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
              />
            </div>
            <div className="px-3 py-2 rounded-[5px] mt-2" style={{ background: 'var(--surface-2)' }}>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Saldo Saat Ini: {formatRupiah(totalMasuk)}</div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => { setOpenTambahDana(false); setEditPemasukanTarget(null) }}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--divider)', color: 'var(--text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleTambahDana}
              disabled={savingDana}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
            >
              {savingDana ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : 'Simpan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pemasukan Confirm */}
      <Dialog open={openDelPemasukan} onOpenChange={setOpenDelPemasukan}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Pemasukan</DialogTitle>
          </DialogHeader>
          <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Hapus <strong style={{ color: 'var(--text)' }}>{delPemasukanTarget?.uraian}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <button
              onClick={() => setOpenDelPemasukan(false)}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--divider)', color: 'var(--text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleDeletePemasukan}
              disabled={savingDana}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
            >
              {savingDana ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
