'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal, hitungPersen } from '@/lib/formatters'
import type { DanaMasuk, Pengeluaran, Kategori } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = { dana: DanaMasuk; pengeluaranList: Pengeluaran[]; kategoriList: Kategori[] }
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'cu-badge cu-badge-success cu-badge-dot',
    pending:  'cu-badge cu-badge-warning cu-badge-dot',
    rejected: 'cu-badge cu-badge-danger cu-badge-dot',
  }
  const labels: Record<string, string> = { approved: 'Disetujui', pending: 'Menunggu', rejected: 'Ditolak' }
  return <span className={map[status] || 'cu-badge'}>{labels[status] || status}</span>
}

const TABS = [
  { key: 'all',      label: 'Semua' },
  { key: 'pending',  label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
]

export function DanaDetailClient({ dana, pengeluaranList, kategoriList }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [openForm, setOpenForm]     = useState(false)
  const [openDel, setOpenDel]       = useState(false)
  const [editTarget, setEditTarget] = useState<Pengeluaran | null>(null)
  const [delTarget, setDelTarget]   = useState<Pengeluaran | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  
  // Tambah Dana Masuk states
  const [openTambahDana, setOpenTambahDana] = useState(false)
  const [tambahDanaForm, setTambahDanaForm] = useState<TambahDanaForm>(emptyTambahDanaForm)
  const [savingDana, setSavingDana] = useState(false)

  const approved    = pengeluaranList.filter(p => p.status === 'approved')
  const pending     = pengeluaranList.filter(p => p.status === 'pending')
  const totalKeluar  = approved.reduce((s, p) => s + Number(p.jumlah), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.jumlah), 0)
  const sisa  = Number(dana.jumlah) - totalKeluar
  const persen = hitungPersen(totalKeluar, Number(dana.jumlah))

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
    setSaving(true)
    const payload = {
      dana_id: dana.id, nama_dana: dana.nama_dana,
      uraian: form.uraian, kategori: form.kategori,
      jumlah: parseFloat(form.jumlah), tanggal: form.tanggal,
      keterangan: form.keterangan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('pengeluaran').update(payload).eq('id', editTarget.id)
      if (error) { toast.error('Gagal memperbarui'); setSaving(false); return }
      toast.success('Pengeluaran diperbarui')
    } else {
      const { error } = await supabase.from('pengeluaran').insert({ ...payload, status: 'pending' })
      if (error) { toast.error('Gagal menambah pengeluaran'); setSaving(false); return }
      toast.success('Pengeluaran ditambahkan')
    }
    setSaving(false); setOpenForm(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('pengeluaran').delete().eq('id', delTarget.id)
    if (error) { toast.error('Gagal menghapus'); setSaving(false); return }
    toast.success('Pengeluaran dihapus')
    setSaving(false); setOpenDel(false)
    startTransition(() => router.refresh())
  }

  async function handleApprove(id: number) {
    const { error } = await supabase.from('pengeluaran').update({
      status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq('id', id)
    if (error) { toast.error('Gagal menyetujui'); return }
    toast.success('Pengeluaran disetujui')
    startTransition(() => router.refresh())
  }

  async function handleReject(id: number) {
    const { error } = await supabase.from('pengeluaran').update({
      status: 'rejected', updated_at: new Date().toISOString()
    }).eq('id', id)
    if (error) { toast.error('Gagal menolak'); return }
    toast.success('Pengeluaran ditolak')
    startTransition(() => router.refresh())
  }

  // Handler untuk tambah dana masuk
  async function handleTambahDana() {
    if (!tambahDanaForm.uraian || !tambahDanaForm.jumlah || !tambahDanaForm.tanggal) {
      toast.error('Uraian, jumlah dan tanggal wajib diisi'); return
    }
    
    const tambahanJumlah = parseFloat(tambahDanaForm.jumlah)
    if (isNaN(tambahanJumlah) || tambahanJumlah <= 0) {
      toast.error('Jumlah tidak valid'); return
    }

    setSavingDana(true)
    
    // Update jumlah dana_masuk
    const newJumlah = Number(dana.jumlah) + tambahanJumlah
    const { error: updateError } = await supabase
      .from('dana_masuk')
      .update({ 
        jumlah: newJumlah, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', dana.id)
    
    if (updateError) {
      toast.error('Gagal menambah dana: ' + updateError.message)
      setSavingDana(false)
      return
    }

    // Log aktivitas (optional - tidak error jika tabel belum ada)
    try {
      await supabase.from('activity_log').insert({
        aksi: 'TAMBAH_DANA',
        keterangan: `${tambahDanaForm.uraian}: ${fmtCompact(tambahanJumlah)}. Total: ${fmtCompact(newJumlah)}`,
        entity_type: 'dana_masuk',
        entity_id: dana.id,
        created_at: new Date().toISOString()
      })
    } catch {
      // Abaikan error jika tabel activity_log belum ada
    }

    toast.success(`Berhasil menambah ${fmtCompact(tambahanJumlah)} ke ${dana.nama_dana}`)
    setSavingDana(false)
    setOpenTambahDana(false)
    setTambahDanaForm(emptyTambahDanaForm)
    startTransition(() => router.refresh())
  }

  return (
    <div className="animate-fade-in">
      {/* Topbar */}
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Link
              href="/dana"
              className="text-[12px] flex items-center gap-1 transition-colors"
              style={{ color: 'var(--cu-text-muted)' }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
              Dana
            </Link>
            <span style={{ color: 'var(--cu-text-dim)' }}>/</span>
            <span className="text-[12px] truncate max-w-[240px]" style={{ color: 'var(--cu-text)' }}>
              {dana.nama_dana}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="cu-badge" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>
              {dana.sumber}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
              {formatTanggal(dana.tanggal)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/laporan?dana=${dana.id}`}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] border text-[12px] font-medium transition-colors hover:bg-[var(--cu-surface-2)]"
            style={{ borderColor: 'var(--border)', color: 'var(--cu-text)' }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 2v9M4.5 7.5L8 11l3.5-3.5" /><path d="M2.5 13.5h11" />
            </svg>
            Laporan
          </Link>
          <button
            onClick={() => { setTambahDanaForm(emptyTambahDanaForm); setOpenTambahDana(true) }}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[12px] font-medium"
            style={{ background: 'var(--cu-success)', color: '#fff' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 1v10M1 6h10" />
            </svg>
            + Dana
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[12px] font-medium"
            style={{ background: 'var(--cu-primary)', color: '#fff' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 1v10M1 6h10" />
            </svg>
            Pengeluaran
          </button>
        </div>
      </div>

      <div className="cu-page">
        {/* KPI strip */}
        <div className="cu-card overflow-hidden grid grid-cols-2 md:grid-cols-4 cu-stats-strip">
          {[
            { label: 'Total Dana', value: fmtCompact(Number(dana.jumlah)), full: formatRupiah(Number(dana.jumlah)), accent: 'var(--cu-primary)' },
            { label: 'Terpakai', value: fmtCompact(totalKeluar), full: formatRupiah(totalKeluar), accent: 'var(--cu-warning)' },
            { label: 'Pending', value: fmtCompact(totalPending), full: formatRupiah(totalPending), accent: 'var(--cu-danger)' },
            { label: 'Sisa Saldo', value: fmtCompact(sisa), full: formatRupiah(sisa), accent: sisa >= 0 ? 'var(--cu-success)' : 'var(--cu-danger)' },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.03em]" style={{ color: 'var(--cu-text-muted)' }}>
                  {kpi.label}
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: kpi.accent }} />
              </div>
              <div className="cu-mono text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--cu-text)' }}>
                {kpi.value}
              </div>
              <div className="text-[10.5px] mt-0.5 cu-mono" style={{ color: 'var(--cu-text-dim)' }}>
                {kpi.full}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="cu-card px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-medium" style={{ color: 'var(--cu-text)' }}>
              Penggunaan Dana
            </span>
            <span className="cu-mono text-[12.5px] font-semibold" style={{ color: 'var(--cu-text)' }}>
              {persen.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cu-surface-2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(persen, 100)}%`,
                background: persen > 80 ? 'var(--cu-warning)' : 'var(--cu-primary)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] cu-mono" style={{ color: 'var(--cu-text-muted)' }}>
            <span>{fmtCompact(totalKeluar)} terpakai</span>
            <span>{fmtCompact(sisa)} tersisa</span>
          </div>
        </div>

        {/* Tab + table */}
        <div className="cu-card overflow-hidden">
          {/* Tab bar */}
          <div
            className="flex items-center gap-0 px-3 pt-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {TABS.map(tab => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                  style={{
                    color: active ? 'var(--cu-primary)' : 'var(--cu-text-muted)',
                    borderBottom: active ? '2px solid var(--cu-primary)' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span
                      className="cu-mono text-[10px] px-1.5 rounded-full"
                      style={{
                        background: active ? 'var(--cu-primary-soft)' : 'var(--cu-surface-2)',
                        color: active ? 'var(--cu-primary)' : 'var(--cu-text-muted)',
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
            <div className="py-14 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>
              Tidak ada pengeluaran
            </div>
          ) : (
            <div className="cu-table-wrap">
            <table className="cu-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Uraian</th>
                  <th>Kategori</th>
                  <th className="cu-num">Jumlah</th>
                  <th>Status</th>
                  <th className="cu-num">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    style={
                      p.status === 'pending'
                        ? { background: 'color-mix(in srgb, var(--cu-warning-soft) 40%, transparent)' }
                        : undefined
                    }
                  >
                    <td className="cu-mono text-[12px] whitespace-nowrap" style={{ color: 'var(--cu-text-muted)' }}>
                      {formatTanggal(p.tanggal)}
                    </td>
                    <td className="max-w-[200px]">
                      <div className="truncate text-[12.5px] font-medium" style={{ color: 'var(--cu-text)' }}>
                        {p.uraian}
                      </div>
                      {p.keterangan && (
                        <div className="truncate text-[11px]" style={{ color: 'var(--cu-text-muted)' }}>
                          {p.keterangan}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="cu-badge" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>
                        {p.kategori}
                      </span>
                    </td>
                    <td className="cu-num cu-mono text-[12.5px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                      {formatRupiah(Number(p.jumlah))}
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="cu-num">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id)}
                              title="Setujui"
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-[11px] font-bold"
                              style={{ background: 'var(--cu-primary)' }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
                              title="Tolak"
                              className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold"
                              style={{
                                border: '1px solid var(--cu-danger)',
                                color: 'var(--cu-danger)',
                                background: 'transparent',
                              }}
                            >
                              ✕
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit"
                          className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--cu-surface-2)]"
                          style={{ color: 'var(--cu-text-muted)' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setDelTarget(p); setOpenDel(true) }}
                          title="Hapus"
                          className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--cu-surface-2)]"
                          style={{ color: 'var(--cu-text-muted)' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9.5h5L11 4" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Per Kategori */}
        {perKategori.length > 0 && (
          <div className="cu-card overflow-hidden">
            <div
              className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Breakdown per Kategori
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {perKategori.map(k => {
                const pct = hitungPersen(k.total, totalKeluar)
                return (
                  <div key={k.nama}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12.5px]" style={{ color: 'var(--cu-text)' }}>{k.nama}</span>
                      <div className="flex items-center gap-2">
                        <span className="cu-mono text-[12px] font-medium" style={{ color: 'var(--cu-text)' }}>
                          {fmtCompact(k.total)}
                        </span>
                        <span className="cu-mono text-[11px] w-9 text-right" style={{ color: 'var(--cu-text-muted)' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--cu-surface-2)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: 'var(--cu-primary)' }}
                      />
                    </div>
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
            <DialogTitle className="text-[14px]">
              {editTarget ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Uraian <span style={{ color: 'var(--cu-danger)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Deskripsi pengeluaran"
                value={form.uraian}
                onChange={e => setForm(f => ({ ...f, uraian: e.target.value }))}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                  Kategori <span style={{ color: 'var(--cu-danger)' }}>*</span>
                </label>
                <Select
                  value={form.kategori}
                  onValueChange={v => setForm(f => ({ ...f, kategori: v ?? '' }))}
                  items={Object.fromEntries(kategoriList.map(k => [k.nama, k.nama]))}
                >
                  <SelectTrigger
                    className="h-[34px] text-[13px] rounded-[5px]"
                    style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)' }}
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
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                  Jumlah <span style={{ color: 'var(--cu-danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.jumlah}
                  onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                  className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none cu-mono"
                  style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Tanggal <span style={{ color: 'var(--cu-danger)' }}>*</span>
              </label>
              <input
                type="date"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Keterangan
              </label>
              <Textarea
                rows={2}
                placeholder="Keterangan tambahan (opsional)"
                value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="text-[13px] resize-none"
                style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpenForm(false)}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--cu-text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
              style={{ background: 'var(--cu-primary)', color: '#fff' }}
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
            <DialogTitle className="text-[14px]">Hapus Pengeluaran</DialogTitle>
          </DialogHeader>
          <p className="text-[12.5px]" style={{ color: 'var(--cu-text-muted)' }}>
            Hapus <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.uraian}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <button
              onClick={() => setOpenDel(false)}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--cu-text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
              style={{ background: 'var(--cu-danger)', color: '#fff' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tambah Dana Masuk Dialog */}
      <Dialog open={openTambahDana} onOpenChange={setOpenTambahDana}>
        <DialogContent className="sm:max-w-md" style={{ background: '#fff' }}>
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">Tambah Dana Masuk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Uraian <span style={{ color: 'var(--cu-danger)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Deskripsi dana masuk"
                value={tambahDanaForm.uraian}
                onChange={e => setTambahDanaForm(f => ({ ...f, uraian: e.target.value }))}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                  Jumlah <span style={{ color: 'var(--cu-danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={tambahDanaForm.jumlah}
                  onChange={e => setTambahDanaForm(f => ({ ...f, jumlah: e.target.value }))}
                  className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none cu-mono"
                  style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                  Tanggal <span style={{ color: 'var(--cu-danger)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={tambahDanaForm.tanggal}
                  onChange={e => setTambahDanaForm(f => ({ ...f, tanggal: e.target.value }))}
                  className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                  style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Keterangan
              </label>
              <Textarea
                rows={2}
                placeholder="Keterangan tambahan (opsional)"
                value={tambahDanaForm.keterangan}
                onChange={e => setTambahDanaForm(f => ({ ...f, keterangan: e.target.value }))}
                className="text-[13px] resize-none"
                style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
            <div className="px-3 py-2 rounded-[5px] mt-2" style={{ background: 'var(--cu-surface-2)' }}>
              <div className="text-[11px]" style={{ color: 'var(--cu-text-muted)' }}>Saldo Saat Ini: {formatRupiah(Number(dana.jumlah))}</div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setOpenTambahDana(false)}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--cu-text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleTambahDana}
              disabled={savingDana}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
              style={{ background: 'var(--cu-primary)', color: '#fff' }}
            >
              {savingDana ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : 'Simpan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
