'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { validateForm, pengeluaranSchema } from '@/lib/validation'
import { useDebounce } from '@/hooks/use-debounce'
import { usePagination, PaginationControls } from '@/hooks/use-pagination'
import { useSupabaseMutation } from '@/hooks/use-supabase-mutation'
import { ExcelExportButton } from '@/components/excel-export-button'
import type { Pengeluaran, DanaMasuk, Kategori } from '@/lib/types'

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'cu-badge cu-badge-success cu-badge-dot',
    pending:  'cu-badge cu-badge-warning cu-badge-dot',
    rejected: 'cu-badge cu-badge-danger cu-badge-dot',
  }
  const labels: Record<string, string> = { approved: 'Disetujui', pending: 'Menunggu', rejected: 'Ditolak' }
  return <span className={map[status] ?? 'cu-badge'}>{labels[status] ?? status}</span>
}

export function PengeluaranClient({ pengeluaranList, danaList, kategoriList }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

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
      async () => { const { error } = await supabase.from('pengeluaran').update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id); if (error) throw error },
      { onSuccess: () => { toast.success('Pengeluaran disetujui'); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
    )
  }

  const handleReject = async (id: number) => {
    await rejectPengeluaran(
      async () => { const { error } = await supabase.from('pengeluaran').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id); if (error) throw error },
      { onSuccess: () => { toast.success('Pengeluaran ditolak'); router.refresh() }, onError: (e) => toast.error(handleSupabaseError(e)) }
    )
  }

  const tabs = [
    { id: 'semua',    label: 'Semua'    },
    { id: 'pending',  label: 'Menunggu' },
    { id: 'approved', label: 'Disetujui'},
    { id: 'rejected', label: 'Ditolak'  },
  ]

  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>
            Pengeluaran
          </h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
            {pengeluaranList.length} transaksi
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExcelExportButton type="pengeluaran" pengeluaranList={pengeluaranList} filename="pengeluaran" />
        </div>
      </div>

      <div className="cu-page">
        {/* Tabs */}
        <div className="flex items-center gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] transition-colors"
              style={{
                color: activeTab === t.id ? 'var(--cu-text)' : 'var(--cu-text-muted)',
                fontWeight: activeTab === t.id ? 600 : 500,
                borderBottom: activeTab === t.id ? '2px solid var(--cu-primary)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
              <span
                className="cu-mono text-[10.5px] px-1.5 py-0 rounded-full font-semibold"
                style={{
                  background: t.id === 'pending' && counts.pending > 0 ? 'var(--cu-warning-soft)' : 'var(--cu-surface-2)',
                  color: t.id === 'pending' && counts.pending > 0 ? 'var(--cu-warning)' : 'var(--cu-text-muted)',
                }}
              >
                {counts[t.id as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-2.5 h-[30px] rounded-[5px] flex-1 max-w-xs"
            style={{ border: '1px solid var(--border)', background: 'var(--cu-surface)' }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cu-text-muted)' }} />
            <input
              className="flex-1 bg-transparent text-[12.5px] outline-none"
              style={{ color: 'var(--cu-text)' }}
              placeholder="Cari uraian, dana, pemohon…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterDana} onValueChange={v => setFilterDana(v ?? 'all')}>
            <SelectTrigger
              className="h-[30px] text-[12px] px-2.5"
              style={{ border: '1px solid var(--border)', background: 'var(--cu-surface)', width: 200, borderRadius: 5 }}
            >
              <SelectValue placeholder="Semua Dana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Dana</SelectItem>
              {danaList.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          {counts.pending > 0 && (
            <span className="text-[12px] font-medium" style={{ color: 'var(--cu-warning)' }}>
              {counts.pending} menunggu approval
            </span>
          )}
        </div>

        {/* Table */}
        <div className="cu-card overflow-hidden">
          {paginatedData.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>
              Tidak ada pengeluaran
            </div>
          ) : (
            <>
              <table className="cu-table">
                <thead>
                  <tr>
                    <th style={{ width: 76 }}>ID</th>
                    <th style={{ width: 90 }}>Tanggal</th>
                    <th>Uraian</th>
                    <th style={{ width: 160 }}>Dana</th>
                    <th style={{ width: 120 }}>Kategori</th>
                    <th style={{ width: 96 }}>Status</th>
                    <th className="cu-num" style={{ width: 130 }}>Jumlah</th>
                    <th style={{ width: 110 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(p => (
                    <tr
                      key={p.id}
                      style={p.status === 'pending' ? { background: 'color-mix(in srgb, var(--cu-warning-soft) 40%, transparent)' } : {}}
                    >
                      <td className="cu-mono text-[11px]" style={{ color: 'var(--cu-text-muted)' }}>
                        P-{String(p.id).padStart(4, '0')}
                      </td>
                      <td className="cu-mono text-[11.5px]" style={{ color: 'var(--cu-text-2)' }}>
                        {formatTanggal(p.tanggal)}
                      </td>
                      <td>
                        <div className="font-medium text-[12.5px]" style={{ color: 'var(--cu-text)' }}>
                          {p.uraian}
                        </div>
                        {p.keterangan && (
                          <div className="text-[11px]" style={{ color: 'var(--cu-text-muted)' }}>
                            {p.keterangan}
                          </div>
                        )}
                      </td>
                      <td
                        className="text-[12px] truncate max-w-[160px]"
                        style={{ color: 'var(--cu-text-2)' }}
                        title={p.nama_dana}
                      >
                        {p.nama_dana}
                      </td>
                      <td style={{ width: 140 }}>
                        <span 
                          className="cu-badge truncate whitespace-nowrap max-w-[130px] inline-block" 
                          title={p.kategori}
                        >
                          {p.kategori}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="cu-num cu-mono text-[12px] font-medium">
                        {fmtCompact(Number(p.jumlah))}
                      </td>
                      <td>
                        {p.status === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={approving}
                              className="h-6 px-2 text-[11px] font-medium rounded flex items-center gap-0.5"
                              style={{ background: 'var(--cu-primary)', color: '#fff' }}
                              title="Setujui"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
                              disabled={rejecting}
                              className="h-6 px-2 text-[11px] font-medium rounded flex items-center gap-0.5"
                              style={{ background: 'var(--cu-danger-soft)', color: 'var(--cu-danger)', border: '1px solid var(--cu-danger)' }}
                              title="Tolak"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => openEdit(p)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]"
                              style={{ color: 'var(--cu-text-muted)' }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]"
                              style={{ color: 'var(--cu-text-muted)' }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => { setDelTarget(p); setOpenDel(true) }}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]"
                              style={{ color: 'var(--cu-text-muted)' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: '1px solid var(--border)', background: 'var(--cu-surface)' }}
              >
                <span className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
                  Total approved:{' '}
                  <span className="cu-mono font-semibold" style={{ color: 'var(--cu-text)' }}>
                    {fmtCompact(filtered.filter(p => p.status === 'approved').reduce((s, p) => s + Number(p.jumlah), 0))}
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
            <DialogTitle className="text-[15px] font-semibold">Edit Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {formErrors.length > 0 && (
              <div className="text-[12px] rounded-md px-3 py-2 space-y-0.5" style={{ background: 'var(--cu-danger-soft)', color: 'var(--cu-danger)' }}>
                {formErrors.map((err, i) => <p key={i}>· {err}</p>)}
              </div>
            )}
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Dana</Label>
              <Select value={form.dana_id} onValueChange={v => setForm(f => ({ ...f, dana_id: v ?? '' }))}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Pilih dana" /></SelectTrigger>
                <SelectContent>{danaList.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Uraian</Label>
              <Input value={form.uraian} onChange={e => setForm(f => ({ ...f, uraian: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Kategori</Label>
                <Select value={form.kategori} onValueChange={v => setForm(f => ({ ...f, kategori: v ?? '' }))}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{kategoriList.map(k => <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jumlah</Label>
                <Input type="number" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Keterangan</Label>
              <Textarea rows={2} value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} className="text-[13px]" />
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

      {/* Delete Dialog */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>Hapus Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.uraian}</strong>?
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={deleting} className="h-8 text-[12px]" style={{ background: 'var(--cu-danger)', color: '#fff' }}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
