'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal, hitungPersen } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { validateForm, danaMasukSchema } from '@/lib/validation'
import { useDebounce } from '@/hooks/use-debounce'
import { usePagination, PaginationControls } from '@/hooks/use-pagination'
import { useSupabaseMutation } from '@/hooks/use-supabase-mutation'
import { ExcelExportButton } from '@/components/excel-export-button'
import type { DanaMasuk, Pengeluaran, SumberDana } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Loader2, MoreHorizontal } from 'lucide-react'

type Props = {
  danaList: DanaMasuk[]
  pengeluaranList: Pick<Pengeluaran, 'dana_id' | 'jumlah' | 'status'>[]
  sumberList: SumberDana[]
}

type FormData = {
  nama_dana: string; jumlah: string; tanggal: string; sumber: string; keterangan: string
}
const emptyForm: FormData = { nama_dana: '', jumlah: '', tanggal: '', sumber: '', keterangan: '' }

function fmtCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} jt`
  return formatRupiah(n)
}

export function DanaClient({ danaList, pengeluaranList, sumberList }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [editTarget, setEditTarget] = useState<DanaMasuk | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DanaMasuk | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [formErrors, setFormErrors] = useState<string[]>([])

  const { mutate: saveDana, isLoading: saving } = useSupabaseMutation()
  const { mutate: deleteDana, isLoading: deleting } = useSupabaseMutation()

  const filtered = useMemo(() =>
    danaList.filter(d =>
      d.nama_dana.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      d.sumber.toLowerCase().includes(debouncedSearch.toLowerCase())
    ), [danaList, debouncedSearch])

  const { currentPage, totalPages, paginatedData, itemsPerPage, goToPage, setItemsPerPage, totalItems } =
    usePagination({ data: filtered, itemsPerPage: 15 })

  const getKeluar = (id: number) =>
    pengeluaranList.filter(p => p.dana_id === id && p.status === 'approved').reduce((s, p) => s + Number(p.jumlah), 0)
  const getPending = (id: number) =>
    pengeluaranList.filter(p => p.dana_id === id && p.status === 'pending').reduce((s, p) => s + Number(p.jumlah), 0)

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setFormErrors([]); setOpenForm(true) }
  const openEdit = (dana: DanaMasuk) => {
    setEditTarget(dana)
    setForm({ nama_dana: dana.nama_dana, jumlah: String(dana.jumlah), tanggal: dana.tanggal, sumber: dana.sumber, keterangan: dana.keterangan || '' })
    setFormErrors([])
    setOpenForm(true)
  }

  const validateAndSave = async () => {
    setFormErrors([])
    const validation = validateForm(danaMasukSchema, {
      nama_dana: form.nama_dana,
      jumlah: parseFloat(form.jumlah) || 0,
      tanggal: form.tanggal,
      sumber: form.sumber,
      keterangan: form.keterangan || undefined,
    })
    if (!validation.success) { setFormErrors(validation.errors); toast.error(validation.errors[0]); return }

    const payload = { nama_dana: form.nama_dana, jumlah: parseFloat(form.jumlah), tanggal: form.tanggal, sumber: form.sumber, keterangan: form.keterangan || null, updated_at: new Date().toISOString() }

    if (editTarget) {
      await saveDana(
        async () => { const { error } = await supabase.from('dana_masuk').update(payload).eq('id', editTarget.id); if (error) throw error },
        { onSuccess: () => { toast.success('Dana diperbarui'); setOpenForm(false); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
      )
    } else {
      await saveDana(
        async () => { const { error } = await supabase.from('dana_masuk').insert(payload); if (error) throw error },
        { onSuccess: () => { toast.success('Dana ditambahkan'); setOpenForm(false); setForm(emptyForm); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
      )
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (pengeluaranList.some(p => p.dana_id === deleteTarget.id)) {
      toast.error('Dana tidak dapat dihapus karena memiliki pengeluaran terkait')
      setOpenDelete(false)
      return
    }
    await deleteDana(
      async () => { const { error } = await supabase.from('dana_masuk').delete().eq('id', deleteTarget.id); if (error) throw error },
      { onSuccess: () => { toast.success('Dana dihapus'); setOpenDelete(false); setDeleteTarget(null); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
    )
  }

  // Summary strip totals
  const totalAlokasi = danaList.reduce((s, d) => s + Number(d.jumlah), 0)
  const totalKeluar  = danaList.reduce((s, d) => s + getKeluar(d.id), 0)
  const totalSisa    = totalAlokasi - totalKeluar

  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>
              Dana Masuk
            </h1>
            <span className="cu-mono text-[11px]" style={{ color: 'var(--cu-text-dim)' }}>
              {danaList.length} sumber aktif
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExcelExportButton type="dana" danaList={danaList} filename="dana_masuk" />
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[5px] text-[12px] font-medium"
            style={{ background: 'var(--cu-primary)', color: '#ffffff' }}
          >
            <Plus className="w-3.5 h-3.5" /> Dana Baru
          </button>
        </div>
      </div>

      <div className="cu-page">
        {/* Summary strip */}
        <div
          className="cu-card overflow-hidden"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          {[
            { label: 'Total Alokasi', value: fmtCompact(totalAlokasi), sub: `${danaList.length} dana aktif` },
            { label: 'Realisasi', value: fmtCompact(totalKeluar), sub: `${totalAlokasi > 0 ? ((totalKeluar / totalAlokasi) * 100).toFixed(1) : 0}% dari alokasi` },
            { label: 'Sisa Saldo', value: fmtCompact(totalSisa), sub: 'tersedia' },
            { label: 'Dana Terbanyak', value: danaList[0]?.sumber ?? '—', sub: danaList[0]?.nama_dana ?? '' },
          ].map((s, i) => (
            <div key={i} className="px-4 py-3" style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div className="text-[11px] font-medium uppercase tracking-[0.02em]" style={{ color: 'var(--cu-text-muted)' }}>
                {s.label}
              </div>
              <div className="cu-mono text-[18px] font-semibold mt-1 tracking-[-0.02em]" style={{ color: 'var(--cu-text)' }}>
                {s.value}
              </div>
              <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--cu-text-dim)' }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-2.5 h-[30px] rounded-[5px] flex-1 max-w-xs"
            style={{ border: '1px solid var(--border)', background: 'var(--cu-surface)' }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cu-text-muted)' }} />
            <input
              className="flex-1 bg-transparent text-[12.5px] outline-none"
              style={{ color: 'var(--cu-text)' }}
              placeholder="Cari nama dana atau sumber…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
            <span className="cu-mono font-semibold" style={{ color: 'var(--cu-text)' }}>{filtered.length}</span> dari {danaList.length} dana
          </span>
        </div>

        {/* Table */}
        <div className="cu-card overflow-hidden">
          {paginatedData.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>
              {debouncedSearch ? 'Tidak ada dana yang cocok' : 'Belum ada data dana masuk'}
            </div>
          ) : (
            <>
              <table className="cu-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>ID</th>
                    <th>Nama Dana</th>
                    <th style={{ width: 80 }}>Sumber</th>
                    <th style={{ width: 88 }}>Tanggal</th>
                    <th className="cu-num" style={{ width: 130 }}>Alokasi</th>
                    <th className="cu-num" style={{ width: 130 }}>Terpakai</th>
                    <th style={{ width: 130 }}>Realisasi</th>
                    <th className="cu-num" style={{ width: 130 }}>Sisa</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(dana => {
                    const keluar  = getKeluar(dana.id)
                    const pending = getPending(dana.id)
                    const sisa    = Number(dana.jumlah) - keluar
                    const pct     = hitungPersen(keluar, Number(dana.jumlah))
                    return (
                      <tr key={dana.id}>
                        <td className="cu-mono text-[11px]" style={{ color: 'var(--cu-text-muted)' }}>
                          D-{String(dana.id).padStart(4, '0')}
                        </td>
                        <td>
                          <div className="font-medium text-[12.5px]" style={{ color: 'var(--cu-text)' }}>
                            {dana.nama_dana}
                          </div>
                          {dana.keterangan && (
                            <div className="text-[11px] mt-0.5 truncate max-w-[240px]" style={{ color: 'var(--cu-text-muted)' }}>
                              {dana.keterangan}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="cu-badge">{dana.sumber}</span>
                        </td>
                        <td className="cu-mono text-[11.5px]" style={{ color: 'var(--cu-text-2)' }}>
                          {formatTanggal(dana.tanggal)}
                        </td>
                        <td className="cu-num cu-mono text-[12px]">
                          {fmtCompact(Number(dana.jumlah))}
                        </td>
                        <td className="cu-num cu-mono text-[12px]" style={{ color: 'var(--cu-text-2)' }}>
                          {fmtCompact(keluar)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--cu-surface-2)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  background: pct > 80 ? 'var(--cu-warning)' : pct > 50 ? 'var(--cu-primary)' : '#5d7fa3',
                                }}
                              />
                            </div>
                            <span className="cu-mono text-[11px] w-8 text-right" style={{ color: 'var(--cu-text-muted)' }}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td
                          className="cu-num cu-mono text-[12px] font-medium"
                          style={{ color: sisa < 0 ? 'var(--cu-danger)' : 'var(--cu-text)' }}
                        >
                          {fmtCompact(sisa)}
                        </td>
                        <td>
                          <div className="flex items-center gap-0.5">
                            <Link
                              href={`/dana/${dana.id}`}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]"
                              style={{ color: 'var(--cu-text-muted)' }}
                              title="Lihat detail"
                            >
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/>
                              </svg>
                            </Link>
                            <button
                              onClick={() => openEdit(dana)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]"
                              style={{ color: 'var(--cu-text-muted)' }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(dana); setOpenDelete(true) }}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]"
                              style={{ color: 'var(--cu-text-muted)' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: '1px solid var(--border)', background: 'var(--cu-surface)' }}
              >
                <span className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
                  Menampilkan {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems}
                </span>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  totalItems={totalItems}
                  showItemsPerPage
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">
              {editTarget ? 'Edit Dana' : 'Tambah Dana Masuk'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {formErrors.length > 0 && (
              <div className="text-[12px] rounded-md px-3 py-2 space-y-0.5" style={{ background: 'var(--cu-danger-soft)', color: 'var(--cu-danger)' }}>
                {formErrors.map((err, i) => <p key={i}>· {err}</p>)}
              </div>
            )}
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nama Dana *</Label>
              <Input placeholder="cth: Dana DIPA Semester Ganjil 2026" value={form.nama_dana} onChange={e => setForm(f => ({ ...f, nama_dana: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jumlah *</Label>
                <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Sumber Dana *</Label>
              <Select value={form.sumber} onValueChange={v => setForm(f => ({ ...f, sumber: v ?? '' }))}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Pilih sumber dana" /></SelectTrigger>
                <SelectContent>
                  {sumberList.map(s => <SelectItem key={s.id} value={s.nama}>{s.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Keterangan</Label>
              <Textarea placeholder="Keterangan tambahan (opsional)" rows={2} value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={validateAndSave} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>
              Hapus Dana
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus <strong style={{ color: 'var(--cu-text)' }}>{deleteTarget?.nama_dana}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDelete(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={deleting} className="h-8 text-[12px]" style={{ background: 'var(--cu-danger)', color: '#fff' }}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
