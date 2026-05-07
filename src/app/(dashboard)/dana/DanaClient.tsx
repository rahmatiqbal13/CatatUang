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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Eye, 
  Loader2, 
  Wallet,
  Trophy,
  TrendingUp,
  Target,
  Zap,
  ArrowRight
} from 'lucide-react'

type Props = {
  danaList: DanaMasuk[]
  pengeluaranList: Pick<Pengeluaran, 'dana_id' | 'jumlah' | 'status'>[]
  sumberList: SumberDana[]
}

type FormData = { 
  nama_dana: string
  jumlah: string
  tanggal: string
  sumber: string
  keterangan: string 
}

const emptyForm: FormData = { 
  nama_dana: '', 
  jumlah: '', 
  tanggal: '', 
  sumber: '', 
  keterangan: '' 
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

  const filtered = useMemo(() => {
    return danaList.filter(d =>
      d.nama_dana.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      d.sumber.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
  }, [danaList, debouncedSearch])

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
    itemsPerPage: 9,
  })

  const getKeluar = (danaId: number) => {
    return pengeluaranList
      .filter(p => p.dana_id === danaId && p.status === 'approved')
      .reduce((s, p) => s + Number(p.jumlah), 0)
  }
  
  const getPending = (danaId: number) => {
    return pengeluaranList
      .filter(p => p.dana_id === danaId && p.status === 'pending')
      .reduce((s, p) => s + Number(p.jumlah), 0)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setFormErrors([])
    setOpenForm(true)
  }

  const openEdit = (dana: DanaMasuk) => {
    setEditTarget(dana)
    setForm({
      nama_dana: dana.nama_dana,
      jumlah: String(dana.jumlah),
      tanggal: dana.tanggal,
      sumber: dana.sumber,
      keterangan: dana.keterangan || ''
    })
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

    if (!validation.success) {
      setFormErrors(validation.errors)
      toast.error(validation.errors[0])
      return
    }

    const payload = {
      nama_dana: form.nama_dana,
      jumlah: parseFloat(form.jumlah),
      tanggal: form.tanggal,
      sumber: form.sumber,
      keterangan: form.keterangan || null,
      updated_at: new Date().toISOString()
    }

    if (editTarget) {
      await saveDana(
        async () => {
          const { error } = await supabase
            .from('dana_masuk')
            .update(payload)
            .eq('id', editTarget.id)
          if (error) throw error
          return editTarget.id
        },
        {
          onSuccess: () => {
            toast.success('Dana berhasil diperbarui')
            setOpenForm(false)
            router.refresh()
          },
          onError: (error) => {
            toast.error(handleSupabaseError(error))
          }
        }
      )
    } else {
      await saveDana(
        async () => {
          const { error } = await supabase
            .from('dana_masuk')
            .insert(payload)
          if (error) throw error
        },
        {
          onSuccess: () => {
            toast.success('Dana berhasil ditambahkan')
            setOpenForm(false)
            setForm(emptyForm)
            router.refresh()
          },
          onError: (error) => {
            toast.error(handleSupabaseError(error))
          }
        }
      )
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    
    const hasTransaksi = pengeluaranList.some(p => p.dana_id === deleteTarget.id)
    if (hasTransaksi) {
      toast.error('Dana tidak dapat dihapus karena memiliki pengeluaran terkait')
      setOpenDelete(false)
      return
    }

    await deleteDana(
      async () => {
        const { error } = await supabase
          .from('dana_masuk')
          .delete()
          .eq('id', deleteTarget.id)
        if (error) throw error
      },
      {
        onSuccess: () => {
          toast.success('Dana berhasil dihapus')
          setOpenDelete(false)
          setDeleteTarget(null)
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Dana Masuk
            </h1>
            <p className="text-sm text-slate-500">Kelola dan monitoring seluruh dana</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <ExcelExportButton
            type="dana"
            danaList={danaList}
            filename="dana_masuk"
          />
          <Button 
            onClick={openAdd} 
            className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Tambah Dana
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cari nama dana atau sumber..."
              className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-slate-600 font-semibold text-lg">
              {debouncedSearch ? 'Tidak ada dana yang cocok' : 'Belum ada dana masuk'}
            </p>
            <p className="text-slate-400 mt-2 mb-6">
              {debouncedSearch ? 'Coba kata kunci lain' : 'Tambahkan dana pertama Anda'}
            </p>
            {!debouncedSearch && (
              <Button 
                onClick={openAdd} 
                variant="outline" 
                className="gap-2 border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4" /> Tambah Dana
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Dana Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedData.map(dana => {
              const keluar = getKeluar(dana.id)
              const pending = getPending(dana.id)
              const sisa = Number(dana.jumlah) - keluar
              const persen = hitungPersen(keluar, Number(dana.jumlah))
              const isHighUsage = persen > 80
              
              return (
                <Card 
                  key={dana.id} 
                  className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Top color bar based on usage */}
                  <div className={`h-1.5 w-full ${
                    isHighUsage 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  }`} />
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {dana.nama_dana}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="secondary" 
                            className="text-xs font-semibold bg-slate-100 text-slate-600"
                          >
                            {dana.sumber}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {formatTanggal(dana.tanggal)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => openEdit(dana)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => { 
                            setDeleteTarget(dana)
                            setOpenDelete(true) 
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Total Dana</p>
                        <p className="text-lg font-bold font-mono text-blue-700">
                          {formatRupiah(Number(dana.jumlah))}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 ${sisa >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${sisa >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          Sisa Saldo
                        </p>
                        <p className={`text-lg font-bold font-mono ${sisa >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatRupiah(sisa)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Terpakai
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          {formatRupiah(keluar)}
                        </span>
                      </div>
                      {pending > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-600 flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" /> Pending
                          </span>
                          <span className="font-mono font-bold text-amber-600">
                            {formatRupiah(pending)}
                          </span>
                        </div>
                      )}
                      <div className="pt-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-500">Penggunaan</span>
                          <span className={`font-mono font-bold ${isHighUsage ? 'text-orange-600' : 'text-slate-700'}`}>
                            {persen.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHighUsage 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            }`}
                            style={{ width: `${Math.min(persen, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <Link href={`/dana/${dana.id}`}>
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 mt-2 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group/btn"
                      >
                        <Eye className="w-4 h-4" /> 
                        Lihat Detail
                        <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={totalItems}
            showItemsPerPage
          />
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500 -mt-6 mb-6 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {editTarget ? (
                <><Pencil className="w-5 h-5 text-blue-600" /> Edit Dana</>
              ) : (
                <><Plus className="w-5 h-5 text-blue-600" /> Tambah Dana Masuk</>
              )}
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
              <Label className="text-sm font-semibold text-slate-700">Nama Dana <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="cth: Dana DIPA Semester Ganjil 2025" 
                value={form.nama_dana} 
                onChange={e => setForm(f => ({ ...f, nama_dana: e.target.value }))}
                className="h-11 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Jumlah <span className="text-red-500">*</span></Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={form.jumlah} 
                  onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Tanggal <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  value={form.tanggal} 
                  onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Sumber Dana <span className="text-red-500">*</span></Label>
              <Select 
                value={form.sumber} 
                onValueChange={v => setForm(f => ({ ...f, sumber: v ?? '' }))}
              >
                <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Pilih sumber dana" />
                </SelectTrigger>
                <SelectContent>
                  {sumberList.map(s => (
                    <SelectItem key={s.id} value={s.nama}>{s.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Keterangan</Label>
              <Textarea 
                placeholder="Keterangan tambahan (opsional)" 
                rows={2} 
                value={form.keterangan} 
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</>
              ) : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-sm border-0 shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-orange-500 -mt-6 mb-6 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" /> Hapus Dana
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-center text-slate-600">
              Apakah Anda yakin ingin menghapus <strong className="text-slate-900">{deleteTarget?.nama_dana}</strong>?
            </p>
            <p className="text-center text-sm text-slate-400 mt-2">
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDelete(false)} className="rounded-xl">
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
