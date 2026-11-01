'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { validateForm, danaMasukSchema, danaMasukEditSchema } from '@/lib/validation'
import { useDebounce } from '@/hooks/use-debounce'
import { usePagination, PaginationControls } from '@/hooks/use-pagination'
import { useSupabaseMutation } from '@/hooks/use-supabase-mutation'
import { ExcelExportButton } from '@/components/excel-export-button'
import type { DanaMasukWithSaldo, Pengeluaran, SumberDana } from '@/lib/types'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { SolidBadge } from '@/components/ui/StatusBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { sumberColor, formatRp, pct, autoGrid } from '@/lib/tokens'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react'

type Props = {
  danaList: DanaMasukWithSaldo[]
  pengeluaranList: Pick<Pengeluaran, 'dana_id' | 'jumlah' | 'status'>[]
  sumberList: SumberDana[]
  bukuId: number
  bukuNama: string
  bukuKosong: boolean
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

export function DanaClient({ danaList, pengeluaranList, sumberList, bukuId, bukuNama, bukuKosong }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [editTarget, setEditTarget] = useState<DanaMasukWithSaldo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DanaMasukWithSaldo | null>(null)
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
  const openEdit = (dana: DanaMasukWithSaldo) => {
    setEditTarget(dana)
    setForm({ nama_dana: dana.nama_dana, jumlah: String(dana.jumlah), tanggal: dana.tanggal, sumber: dana.sumber, keterangan: dana.keterangan || '' })
    setFormErrors([])
    setOpenForm(true)
  }

  const validateAndSave = async () => {
    setFormErrors([])
    const base = {
      nama_dana: form.nama_dana,
      tanggal: form.tanggal,
      sumber: form.sumber,
      keterangan: form.keterangan || undefined,
    }

    if (editTarget) {
      const validation = validateForm(danaMasukEditSchema, base)
      if (!validation.success) { setFormErrors(validation.errors); toast.error(validation.errors[0]); return }
      const payload = { nama_dana: form.nama_dana, tanggal: form.tanggal, sumber: form.sumber, keterangan: form.keterangan || null, updated_at: new Date().toISOString() }
      await saveDana(
        async () => { const { error } = await supabase.from('dana_masuk').update(payload).eq('id', editTarget.id); if (error) throw error },
        { onSuccess: () => { toast.success('Dana diperbarui'); setOpenForm(false); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
      )
    } else {
      const validation = validateForm(danaMasukSchema, { ...base, jumlah: parseFloat(form.jumlah) || 0 })
      if (!validation.success) { setFormErrors(validation.errors); toast.error(validation.errors[0]); return }
      const saldoAwal = parseFloat(form.jumlah) || 0
      const payload = { nama_dana: form.nama_dana, tanggal: form.tanggal, sumber: form.sumber, keterangan: form.keterangan || null, buku_id: bukuId }
      await saveDana(
        async () => {
          const { data: created, error } = await supabase.from('dana_masuk').insert(payload).select('id').single()
          if (error) throw error
          if (saldoAwal > 0) {
            const { error: pemasukanError } = await supabase.from('pemasukan').insert({
              dana_id: created.id, nama_dana: form.nama_dana, uraian: 'Saldo Awal', jumlah: saldoAwal, tanggal: form.tanggal,
            })
            if (pemasukanError) throw pemasukanError
          }
        },
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
      <Topbar
        crumb={`${bukuNama} / Dana Masuk`}
        title="Dana Masuk"
        subtitle={`${danaList.length} sumber dana aktif · Buku ${bukuNama}`}
        action={
          <div className="flex items-center gap-2">
            <ExcelExportButton type="dana" danaList={danaList} filename="dana_masuk" />
            <BarButton variant="primary" onClick={openAdd} disabled={bukuKosong}>
              <Plus className="h-4 w-4" /> Dompet baru
            </BarButton>
          </div>
        }
      />

      {bukuKosong && (
        <div className="cu-page">
          <div className="card-shell py-16 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Belum ada buku. Buat buku pertama Anda lewat pemilih buku di sidebar.
          </div>
        </div>
      )}

      {!bukuKosong && (
      <div className="cu-page">
        {/* Summary strip */}
        <div style={autoGrid(200)}>
          {[
            { label: 'Total Alokasi', value: fmtCompact(totalAlokasi), sub: `${danaList.length} dana aktif` },
            { label: 'Realisasi', value: fmtCompact(totalKeluar), sub: `${totalAlokasi > 0 ? ((totalKeluar / totalAlokasi) * 100).toFixed(1) : 0}% dari alokasi` },
            { label: 'Sisa Saldo', value: fmtCompact(totalSisa), sub: 'tersedia' },
            { label: 'Dana Terbanyak', value: danaList[0]?.sumber ?? '—', sub: danaList[0]?.nama_dana ?? '' },
          ].map((s, i) => (
            <div key={i} className="card-shell px-5 py-[18px]">
              <div className="label-caps" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </div>
              <div className="serif text-[30px] mt-[6px] tracking-[-0.02em] whitespace-nowrap" style={{ color: 'var(--text)' }}>
                {s.value}
              </div>
              <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-[42px] max-w-xs flex-1 items-center gap-2 rounded-full px-[14px] focus-within:border-[var(--brand)]"
            style={{ border: '1px solid var(--divider)', background: 'var(--surface)' }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: 'var(--text)' }}
              placeholder="Cari nama dana atau sumber…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-[12px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
            <span className="font-bold" style={{ color: 'var(--text)' }}>{filtered.length}</span> dari {danaList.length} dana
          </span>
        </div>

        {/* Card grid */}
        {paginatedData.length === 0 ? (
          <div className="card-shell py-16 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {debouncedSearch ? 'Tidak ada dana yang cocok' : 'Belum ada data dana masuk'}
          </div>
        ) : (
          <>
            <div style={autoGrid(280)}>
              {paginatedData.map(dana => {
                const keluar  = getKeluar(dana.id)
                const pending = getPending(dana.id)
                const sisa    = Number(dana.jumlah) - keluar
                const p       = pct(keluar, Number(dana.jumlah))
                const color   = sumberColor(dana.sumber)
                return (
                  <div
                    key={dana.id}
                    className="card-shell relative transition-[transform,box-shadow] duration-200 hover:-translate-y-[2px] hover:shadow-[0_16px_30px_-22px_rgba(24,36,30,.45)]"
                  >
                    <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1">
                      <button
                        onClick={() => openEdit(dana)}
                        title="Edit"
                        aria-label="Edit dana"
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-2)]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(dana); setOpenDelete(true) }}
                        title="Hapus"
                        aria-label="Hapus dana"
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--danger-soft)]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Link href={`/dana/${dana.id}`} className="flex flex-col gap-4 p-[22px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="label-caps text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatTanggal(dana.tanggal)}</span>
                        <SolidBadge color={color}>{dana.sumber}</SolidBadge>
                      </div>
                      <div>
                        <h3 className="text-[25px] leading-[1.15] tracking-[-0.01em]" style={{ color: 'var(--text)', textWrap: 'pretty' }}>
                          {dana.nama_dana}
                        </h3>
                        {dana.keterangan && (
                          <div className="mt-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                            {dana.keterangan}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Sisa saldo</div>
                        <div className="serif mt-[2px] text-[32px] tracking-[-0.02em] whitespace-nowrap" style={{ color: sisa < 0 ? 'var(--danger)' : 'var(--text)' }}>
                          Rp {formatRp(sisa)}
                        </div>
                      </div>
                      <ProgressBar used={keluar} total={Number(dana.jumlah)} color={color} />
                      <div className="rule-dashed grid grid-cols-2 gap-[10px] pt-[14px] pr-16">
                        <div>
                          <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Masuk</div>
                          <div className="cu-mono mt-[3px] text-[13px] font-semibold whitespace-nowrap">Rp {formatRp(Number(dana.jumlah))}</div>
                        </div>
                        <div>
                          <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Terpakai · {String(p).replace('.', ',')}%</div>
                          <div className="cu-mono mt-[3px] text-[13px] font-semibold whitespace-nowrap">Rp {formatRp(keluar)}</div>
                        </div>
                      </div>
                      {pending > 0 && (
                        <div className="-mt-2 text-[12px]" style={{ color: 'var(--status-wait-fg)' }}>
                          Rp {formatRp(pending)} menunggu persetujuan
                        </div>
                      )}
                    </Link>
                  </div>
                )
              })}
            </div>
            <div
              className="flex items-center justify-between px-4 py-2.5 card-shell"
            >
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
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
      )}

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Dana' : 'Tambah Dana Masuk'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {formErrors.length > 0 && (
              <div className="text-[12px] px-3 py-2 space-y-0.5" style={{ background: 'var(--status-no-bg)', color: 'var(--status-no-fg)' }}>
                {formErrors.map((err, i) => <p key={i}>· {err}</p>)}
              </div>
            )}
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Nama Dana *</Label>
              <Input placeholder="cth: Dana DIPA Semester Ganjil 2026" value={form.nama_dana} onChange={e => setForm(f => ({ ...f, nama_dana: e.target.value }))} className="text-[14px]" />
            </div>
            <div className={editTarget ? '' : 'grid grid-cols-2 gap-3'}>
              {!editTarget && (
                <div>
                  <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Saldo Awal</Label>
                  <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="text-[14px]" />
                </div>
              )}
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="text-[14px]" />
              </div>
            </div>
            {editTarget && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Untuk menambah saldo, buka detail wallet ini lalu gunakan tombol &quot;+ Pemasukan&quot;.
              </p>
            )}
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Sumber Dana *</Label>
              <Select
                value={form.sumber}
                onValueChange={v => setForm(f => ({ ...f, sumber: v ?? '' }))}
                items={Object.fromEntries(sumberList.map(s => [s.nama, s.nama]))}
              >
                <SelectTrigger className="text-[14px]"><SelectValue placeholder="Pilih sumber dana" /></SelectTrigger>
                <SelectContent>
                  {sumberList.map(s => <SelectItem key={s.id} value={s.nama}>{s.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Keterangan</Label>
              <Textarea placeholder="Keterangan tambahan (opsional)" rows={2} value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={validateAndSave} disabled={saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--danger)' }}>
              Hapus Dana
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--text-2)' }}>
            Yakin ingin menghapus <strong style={{ color: 'var(--text)' }}>{deleteTarget?.nama_dana}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Batal</Button>
            <Button onClick={handleDelete} disabled={deleting} style={{ background: 'var(--danger)', color: 'var(--surface-elev)' }}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
