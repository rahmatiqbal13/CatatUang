'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal, getStatusColor } from '@/lib/formatters'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { 
  Search, 
  Check, 
  X, 
  Pencil, 
  Trash2, 
  Loader2, 
  Receipt, 
  ChevronDown,
  ReceiptIcon,
  Filter,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'

type Props = {
  pengeluaranList: Pengeluaran[]
  danaList: Pick<DanaMasuk, 'id' | 'nama_dana'>[]
  kategoriList: Kategori[]
}

type FormData = { 
  dana_id: string
  uraian: string
  kategori: string
  jumlah: string
  tanggal: string
  keterangan: string 
}

const emptyForm: FormData = { 
  dana_id: '', 
  uraian: '', 
  kategori: '', 
  jumlah: '', 
  tanggal: '', 
  keterangan: '' 
}

const statusConfig = {
  pending: { 
    label: 'Menunggu', 
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock
  },
  approved: { 
    label: 'Disetujui', 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2
  },
  rejected: { 
    label: 'Ditolak', 
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle
  },
}

export function PengeluaranClient({ pengeluaranList, danaList, kategoriList }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all')
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
      const matchSearch = 
        p.uraian.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.nama_dana.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchStatus = filterStatus === 'all' || p.status === filterStatus
      const matchDana = filterDana === 'all' || String(p.dana_id) === filterDana
      return matchSearch && matchStatus && matchDana
    })
  }, [pengeluaranList, debouncedSearch, filterStatus, filterDana])

  const {
    currentPage,
    totalPages,
    paginatedData,
    itemsPerPage,
    goToPage,
    setItemsPerPage,
    totalItems,
  } = usePagination({
    data: filtered,
    itemsPerPage: 10,
  })

  const totalFiltered = filtered
    .filter(p => p.status === 'approved')
    .reduce((s, p) => s + Number(p.jumlah), 0)

  const pendingCount = pengeluaranList.filter(p => p.status === 'pending').length

  const openEdit = (p: Pengeluaran) => {
    setEditTarget(p)
    setForm({
      dana_id: String(p.dana_id),
      uraian: p.uraian,
      kategori: p.kategori,
      jumlah: String(p.jumlah),
      tanggal: p.tanggal,
      keterangan: p.keterangan || ''
    })
    setFormErrors([])
    setOpenForm(true)
  }

  const validateAndSave = async () => {
    setFormErrors([])
    
    const dana = danaList.find(d => d.id === Number(form.dana_id))
    if (!dana) {
      toast.error('Dana tidak valid')
      return
    }

    const validation = validateForm(pengeluaranSchema, {
      dana_id: Number(form.dana_id),
      nama_dana: dana.nama_dana,
      uraian: form.uraian,
      kategori: form.kategori,
      jumlah: parseFloat(form.jumlah) || 0,
      tanggal: form.tanggal,
      keterangan: form.keterangan || undefined,
    })

    if (!validation.success) {
      setFormErrors(validation.errors)
      toast.error(validation.errors[0])
      return
    }

    const payload = {
      dana_id: Number(form.dana_id),
      nama_dana: dana.nama_dana,
      uraian: form.uraian,
      kategori: form.kategori,
      jumlah: parseFloat(form.jumlah),
      tanggal: form.tanggal,
      keterangan: form.keterangan || null,
      updated_at: new Date().toISOString()
    }

    await savePengeluaran(
      async () => {
        const { error } = await supabase
          .from('pengeluaran')
          .update(payload)
          .eq('id', editTarget!.id)
        if (error) throw error
      },
      {
        onSuccess: () => {
          toast.success('Pengeluaran diperbarui')
          setOpenForm(false)
          router.refresh()
        },
        onError: (error) => {
          toast.error(handleSupabaseError(error))
        }
      }
    )
  }

  const handleDelete = async () => {
    if (!delTarget) return
    
    await deletePengeluaran(
      async () => {
        const { error } = await supabase
          .from('pengeluaran')
          .delete()
          .eq('id', delTarget.id)
        if (error) throw error
      },
      {
        onSuccess: () => {
          toast.success('Pengeluaran dihapus')
          setOpenDel(false)
          setDelTarget(null)
          router.refresh()
        },
        onError: (error) => {
          toast.error(handleSupabaseError(error))
        }
      }
    )
  }

  const handleApprove = async (id: number) => {
    await approvePengeluaran(
      async () => {
        const { error } = await supabase
          .from('pengeluaran')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
        if (error) throw error
      },
      {
        onSuccess: () => {
          toast.success('Pengeluaran disetujui')
          router.refresh()
        },
        onError: (error) => {
          toast.error(handleSupabaseError(error))
        }
      }
    )
  }

  const handleReject = async (id: number) => {
    await rejectPengeluaran(
      async () => {
        const { error } = await supabase
          .from('pengeluaran')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
        if (error) throw error
      },
      {
        onSuccess: () => {
          toast.success('Pengeluaran ditolak')
          router.refresh()
        },
        onError: (error) => {
          toast.error(handleSupabaseError(error))
        }
      }
    )
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <ReceiptIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Pengeluaran
            </h1>
            <p className="text-sm text-slate-500">Kelola dan approval pengeluaran</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">{pendingCount} Menunggu</span>
            </div>
          )}
          <ExcelExportButton
            type="pengeluaran"
            pengeluaranList={pengeluaranList}
            filename="pengeluaran"
          />
        </div>
      </div>

      {/* Filter bar */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Cari uraian atau nama dana..."
                className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
              <SelectTrigger className="w-40 h-12 bg-slate-50 border-slate-200 rounded-xl">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDana} onValueChange={v => setFilterDana(v ?? 'all')}>
              <SelectTrigger className="w-52 h-12 bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue placeholder="Semua Dana">
                  {(value: any) => value && value !== 'all' 
                    ? (danaList.find(d => String(d.id) === value)?.nama_dana ?? value) 
                    : 'Semua Dana'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dana</SelectItem>
                {danaList.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Daftar Pengeluaran</CardTitle>
                <p className="text-sm text-slate-500">{totalItems} transaksi ditemukan</p>
              </div>
            </div>
            {totalItems > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-sm text-emerald-600">Total Approved:</span>
                <span className="font-mono font-bold text-emerald-700">{formatRupiah(totalFiltered)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedData.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <Receipt className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold text-lg">
                {debouncedSearch || filterStatus !== 'all' || filterDana !== 'all'
                  ? 'Tidak ada pengeluaran yang cocok'
                  : 'Tidak ada pengeluaran'}
              </p>
              <p className="text-slate-400 mt-2">
                {debouncedSearch || filterStatus !== 'all' || filterDana !== 'all'
                  ? 'Coba ubah filter pencarian'
                  : 'Belum ada data pengeluaran'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b-2 border-slate-200">
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Dana</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Uraian</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Jumlah</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Status</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map(p => {
                      const status = statusConfig[p.status]
                      const StatusIcon = status.icon
                      return (
                        <TableRow key={p.id} className="hover:bg-blue-50/30 transition-colors">
                          <TableCell className="text-sm text-slate-500 whitespace-nowrap font-medium">
                            {formatTanggal(p.tanggal)}
                          </TableCell>
                          <TableCell className="text-sm max-w-[160px]">
                            <span className="truncate block font-semibold text-slate-700">{p.nama_dana}</span>
                          </TableCell>
                          <TableCell className="text-sm max-w-[220px]">
                            <p className="truncate font-medium text-slate-700">{p.uraian}</p>
                            {p.keterangan && (
                              <p className="text-xs text-slate-400 truncate">{p.keterangan}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-600 border-slate-200">
                              {p.kategori}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-700">
                            {formatRupiah(Number(p.jumlah))}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center h-9 px-3 gap-1.5 text-sm font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                                Aksi <ChevronDown className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {p.status === 'pending' && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleApprove(p.id)} 
                                      disabled={approving}
                                      className="text-emerald-700 gap-2 font-semibold"
                                    >
                                      <Check className="w-4 h-4" /> Setujui
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleReject(p.id)} 
                                      disabled={rejecting}
                                      className="text-red-700 gap-2 font-semibold"
                                    >
                                      <X className="w-4 h-4" /> Tolak
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => openEdit(p)} 
                                  className="gap-2 font-semibold"
                                >
                                  <Pencil className="w-4 h-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => { 
                                    setDelTarget(p)
                                    setOpenDel(true) 
                                  }}
                                  className="text-red-700 gap-2 font-semibold"
                                >
                                  <Trash2 className="w-4 h-4" /> Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="px-6 border-t border-slate-100">
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-amber-500 -mt-6 mb-6 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-orange-600" /> Edit Pengeluaran
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 space-y-1">
                {formErrors.map((err, i) => (
                  <p key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {err}
                  </p>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Dana</Label>
              <Select 
                value={form.dana_id} 
                onValueChange={v => setForm(f => ({ ...f, dana_id: v ?? '' }))}
              >
                <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Pilih dana" />
                </SelectTrigger>
                <SelectContent>
                  {danaList.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Uraian</Label>
              <Input 
                value={form.uraian} 
                onChange={e => setForm(f => ({ ...f, uraian: e.target.value }))}
                className="h-11 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Kategori</Label>
                <Select 
                  value={form.kategori} 
                  onValueChange={v => setForm(f => ({ ...f, kategori: v ?? '' }))}
                >
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kategoriList.map(k => (
                      <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Jumlah</Label>
                <Input 
                  type="number" 
                  value={form.jumlah} 
                  onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Tanggal</Label>
              <Input 
                type="date" 
                value={form.tanggal} 
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                className="h-11 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Keterangan</Label>
              <Textarea 
                rows={2} 
                value={form.keterangan} 
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="rounded-xl">
              Batal
            </Button>
            <Button 
              onClick={validateAndSave} 
              disabled={saving}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</>
              ) : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm border-0 shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-orange-500 -mt-6 mb-6 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" /> Hapus Pengeluaran
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-center text-slate-600">
              Apakah Anda yakin ingin menghapus pengeluaran <strong className="text-slate-900">{delTarget?.uraian}</strong>?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="rounded-xl">
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-xl"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
