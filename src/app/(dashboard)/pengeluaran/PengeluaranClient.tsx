'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { validateForm, pengeluaranSchema } from '@/lib/validation'
import { useDebounce } from '@/hooks/use-debounce'
import { usePagination, PaginationControls } from '@/hooks/use-pagination'
import { useSupabaseMutation } from '@/hooks/use-supabase-mutation'
import { useUserProfile } from '@/hooks/use-user-profile'
import { setPengeluaranStatus } from '@/lib/pengeluaran'
import { ExcelExportButton } from '@/components/excel-export-button'
import type { Pengeluaran, DanaMasuk, Kategori } from '@/lib/types'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { categoryColor } from '@/lib/tokens'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Search, Check, X, Pencil, Trash2, Loader2 } from 'lucide-react'

type Props = {
  pengeluaranList: Pengeluaran[]
  danaList: Pick<DanaMasuk, 'id' | 'nama_dana'>[]
  kategoriList: Kategori[]
  bukuNama: string
}

type FormData = {
  dana_id: string; uraian: string; kategori: string; jumlah: string; tanggal: string; keterangan: string
}
const emptyForm: FormData = { dana_id: '', uraian: '', kategori: '', jumlah: '', tanggal: '', keterangan: '' }

function fmtCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} jt`
  return formatRupiah(n)
}

export function PengeluaranClient({ pengeluaranList, danaList, kategoriList, bukuNama }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { profile } = useUserProfile()
  const isSuperAdmin = profile?.role === 'super_admin'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [activeTab, setActiveTab] = useState(searchParams.get('status') || 'semua')
  const [filterDana, setFilterDana] = useState('all')

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<Pengeluaran | null>(null)
  const [delTarget, setDelTarget] = useState<Pengeluaran | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [formErrors, setFormErrors] = useState<string[]>([])

  const { mutate: savePengeluaran, isLoading: saving } = useSupabaseMutation()
  const { mutate: deletePengeluaran, isLoading: deleting } = useSupabaseMutation()
  const { mutate: approvePengeluaran, isLoading: approving } = useSupabaseMutation()
  const { mutate: rejectPengeluaran, isLoading: rejecting } = useSupabaseMutation()

  const filtered = useMemo(() => {
    return pengeluaranList.filter(p => {
      const matchSearch = p.uraian.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.nama_dana.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchTab = activeTab === 'semua' || p.status === activeTab
      const matchDana = filterDana === 'all' || String(p.dana_id) === filterDana
      return matchSearch && matchTab && matchDana
    })
  }, [pengeluaranList, debouncedSearch, activeTab, filterDana])

  const { currentPage, totalPages, paginatedData, itemsPerPage, goToPage, setItemsPerPage, totalItems } =
    usePagination({ data: filtered, itemsPerPage: 15 })

  const counts = {
    semua:    pengeluaranList.length,
    pending:  pengeluaranList.filter(p => p.status === 'pending').length,
    approved: pengeluaranList.filter(p => p.status === 'approved').length,
    rejected: pengeluaranList.filter(p => p.status === 'rejected').length,
  }

  const openEdit = (p: Pengeluaran) => {
    setEditTarget(p)
    setForm({ dana_id: String(p.dana_id), uraian: p.uraian, kategori: p.kategori, jumlah: String(p.jumlah), tanggal: p.tanggal, keterangan: p.keterangan || '' })
    setFormErrors([])
    setOpenForm(true)
  }

  const validateAndSave = async () => {
    setFormErrors([])
    const dana = danaList.find(d => d.id === Number(form.dana_id))
    if (!dana) { toast.error('Dana tidak valid'); return }
    const validation = validateForm(pengeluaranSchema, { dana_id: Number(form.dana_id), nama_dana: dana.nama_dana, uraian: form.uraian, kategori: form.kategori, jumlah: parseFloat(form.jumlah) || 0, tanggal: form.tanggal, keterangan: form.keterangan || undefined })
    if (!validation.success) { setFormErrors(validation.errors); toast.error(validation.errors[0]); return }
    const payload = { dana_id: Number(form.dana_id), nama_dana: dana.nama_dana, uraian: form.uraian, kategori: form.kategori, jumlah: parseFloat(form.jumlah), tanggal: form.tanggal, keterangan: form.keterangan || null, updated_at: new Date().toISOString() }
    await savePengeluaran(
      async () => { const { error } = await supabase.from('pengeluaran').update(payload).eq('id', editTarget!.id); if (error) throw error },
      { onSuccess: () => { toast.success('Pengeluaran diperbarui'); setOpenForm(false); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
    )
  }

  const handleDelete = async () => {
    if (!delTarget) return
    await deletePengeluaran(
      async () => { const { error } = await supabase.from('pengeluaran').delete().eq('id', delTarget.id); if (error) throw error },
      { onSuccess: () => { toast.success('Pengeluaran dihapus'); setOpenDel(false); setDelTarget(null); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
    )
  }

  const handleApprove = async (id: number) => {
    await approvePengeluaran(
      () => setPengeluaranStatus(supabase, id, 'approved'),
      { onSuccess: () => { toast.success('Pengeluaran disetujui'); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
    )
  }

  const handleReject = async (id: number) => {
    await rejectPengeluaran(
      () => setPengeluaranStatus(supabase, id, 'rejected'),
      { onSuccess: () => { toast.success('Pengeluaran ditolak'); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
    )
  }

  const tabs = [
    { id: 'semua',    label: 'Semua'    },
    { id: 'pending',  label: 'Menunggu' },
    { id: 'approved', label: 'Disetujui'},
    { id: 'rejected', label: 'Ditolak'  },
  ]

  const totalApproved = filtered.filter(p => p.status === 'approved').reduce((s, p) => s + Number(p.jumlah), 0)

  return (
    <div className="animate-fade-in">
      <Topbar
        crumb={`${bukuNama} / Pengeluaran`}
        title="Pengeluaran"
        subtitle={`${pengeluaranList.length} transaksi · Buku ${bukuNama}`}
        action={<ExcelExportButton type="pengeluaran" pengeluaranList={pengeluaranList} filename="pengeluaran" />}
      />

      <div className="cu-page">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-[10px]">
          {tabs.map(t => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="inline-flex min-h-[38px] items-center gap-[7px] rounded-full px-[14px] py-2 text-[13px] font-semibold whitespace-nowrap"
                style={{
                  background: active ? 'var(--accent-100)' : 'transparent',
                  color: active ? 'var(--brand)' : 'var(--text)',
                  border: active ? '1px solid #9DBBA8' : '1px solid var(--border-dashed)',
                }}
              >
                {t.label}
                <span className="cu-mono text-[11.5px] opacity-70">{counts[t.id as keyof typeof counts]}</span>
              </button>
            )
          })}
          <span className="flex-[1_1_0]" />
          <Select
            value={filterDana}
            onValueChange={v => setFilterDana(v ?? 'all')}
            items={{ all: 'Semua dompet', ...Object.fromEntries(danaList.map(d => [String(d.id), d.nama_dana])) }}
          >
            <SelectTrigger className="h-[42px] w-[200px] rounded-full text-[13.5px]" style={{ background: 'var(--surface)' }}>
              <SelectValue placeholder="Semua dompet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua dompet</SelectItem>
              {danaList.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>)}
            </SelectContent>
          </Select>
          <div
            className="flex h-[42px] max-w-[320px] flex-[1_1_220px] items-center gap-2 rounded-full px-[14px] focus-within:border-[var(--brand)]"
            style={{ border: '1px solid var(--divider)', background: 'var(--surface)' }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: 'var(--text)' }}
              placeholder="Cari uraian atau dompet"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="label-caps -mt-2 text-[11.5px] tracking-[.12em]" style={{ color: 'var(--text-muted)' }}>
          {totalItems} transaksi · Rp {fmtCompact(totalApproved)} disetujui
        </div>

        {/* Table */}
        <div className="card-shell overflow-hidden">
          {paginatedData.length === 0 ? (
            <div className="serif py-10 text-center text-[19px] italic" style={{ color: 'var(--text-2)' }}>
              Tidak ada transaksi yang cocok.
            </div>
          ) : (
            <>
              <div className="px-6">
                {paginatedData.map(p => {
                  const d = new Date(p.tanggal)
                  return (
                    <div key={p.id} className="row-rule flex flex-wrap items-center gap-x-4 gap-y-[10px] py-4">
                      <div className="w-[42px] shrink-0 text-center">
                        <div className="serif text-[24px] leading-none">{d.getDate()}</div>
                        <div className="cu-mono mt-[3px] text-[10px] tracking-[.1em] uppercase" style={{ color: 'var(--text-muted)' }}>
                          {d.toLocaleDateString('id-ID', { month: 'short' }).replace('.', '')}
                        </div>
                      </div>
                      <div className="min-w-0 flex-[1_1_200px]">
                        <div className="text-[15px] font-semibold" style={{ textWrap: 'pretty' }}>{p.uraian}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-[6px] text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                          <span className="h-2 w-2 rounded-[2px]" style={{ background: categoryColor(p.kategori) }} />
                          {p.kategori} · {p.nama_dana}
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                      <span className="cu-mono ml-auto min-w-[130px] text-right text-[15px] font-semibold whitespace-nowrap">
                        {formatRupiah(Number(p.jumlah))}
                      </span>
                      <div className="flex items-center gap-[6px]">
                        {p.status === 'pending' && isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={approving}
                              className="flex h-[34px] w-[34px] items-center justify-center rounded-full"
                              style={{ background: 'var(--accent-100)', color: 'var(--accent-fg)' }}
                              title="Setujui"
                              aria-label={`Setujui ${p.uraian}`}
                            >
                              <Check className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
                              disabled={rejecting}
                              className="flex h-[34px] w-[34px] items-center justify-center rounded-full"
                              style={{ color: 'var(--danger)', border: '1px solid var(--divider)' }}
                              title="Tolak"
                              aria-label={`Tolak ${p.uraian}`}
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          </>
                        )}
                        {/* Approved spending is locked; only a super admin may delete it. */}
                        {p.status !== 'approved' && (
                          <button
                            onClick={() => openEdit(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-2)]"
                            style={{ color: 'var(--text-muted)' }}
                            title="Edit"
                            aria-label={`Edit ${p.uraian}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        )}
                        {(p.status !== 'approved' || isSuperAdmin) && (
                          <button
                            onClick={() => { setDelTarget(p); setOpenDel(true) }}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--danger-soft)]"
                            style={{ color: 'var(--text-muted)' }}
                            title="Hapus"
                            aria-label={`Hapus ${p.uraian}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div
                className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2"
                style={{ borderTop: '1px solid var(--divider)', background: 'var(--surface)' }}
              >
                <span className="text-[12px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  Total approved:{' '}
                  <span className="font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                    {fmtCompact(totalApproved)}
                  </span>
                  {' · '}{totalItems} transaksi
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

      {/* Edit Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {formErrors.length > 0 && (
              <div className="text-[12px] rounded-md px-3 py-2 space-y-0.5" style={{ background: 'var(--cu-danger-soft)', color: 'var(--cu-danger)' }}>
                {formErrors.map((err, i) => <p key={i}>· {err}</p>)}
              </div>
            )}
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Dana</Label>
              <Select
                value={form.dana_id}
                onValueChange={v => setForm(f => ({ ...f, dana_id: v ?? '' }))}
                items={Object.fromEntries(danaList.map(d => [String(d.id), d.nama_dana]))}
              >
                <SelectTrigger className="text-[14px]"><SelectValue placeholder="Pilih dana" /></SelectTrigger>
                <SelectContent>{danaList.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Uraian</Label>
              <Input value={form.uraian} onChange={e => setForm(f => ({ ...f, uraian: e.target.value }))} className="text-[14px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Kategori</Label>
                <Select
                  value={form.kategori}
                  onValueChange={v => setForm(f => ({ ...f, kategori: v ?? '' }))}
                  items={Object.fromEntries(kategoriList.map(k => [k.nama, k.nama]))}
                >
                  <SelectTrigger className="text-[14px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{kategoriList.map(k => <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jumlah</Label>
                <Input type="number" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="text-[14px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="text-[14px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Keterangan</Label>
              <Textarea rows={2} value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={validateAndSave} disabled={saving}  style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--danger)' }}>Hapus Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.uraian}</strong>?
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)}>Batal</Button>
            <Button onClick={handleDelete} disabled={deleting} style={{ background: 'var(--danger)', color: 'var(--surface-elev)' }}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
