'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal, hitungPersen, getStatusColor } from '@/lib/formatters'
import type { DanaMasuk, Pengeluaran, Kategori } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, Loader2, FileBarChart, ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type Props = { dana: DanaMasuk; pengeluaranList: Pengeluaran[]; kategoriList: Kategori[] }
type FormData = { uraian: string; kategori: string; jumlah: string; tanggal: string; keterangan: string }
const emptyForm: FormData = { uraian: '', kategori: '', jumlah: '', tanggal: '', keterangan: '' }

export function DanaDetailClient({ dana, pengeluaranList, kategoriList }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [openForm, setOpenForm]   = useState(false)
  const [openDel, setOpenDel]     = useState(false)
  const [editTarget, setEditTarget] = useState<Pengeluaran | null>(null)
  const [delTarget, setDelTarget]   = useState<Pengeluaran | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const approved = pengeluaranList.filter(p => p.status === 'approved')
  const pending  = pengeluaranList.filter(p => p.status === 'pending')
  const totalKeluar  = approved.reduce((s, p) => s + Number(p.jumlah), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.jumlah), 0)
  const sisa   = Number(dana.jumlah) - totalKeluar
  const persen = hitungPersen(totalKeluar, Number(dana.jumlah))

  const perKategori = kategoriList.map(k => {
    const total = approved.filter(p => p.kategori === k.nama).reduce((s, p) => s + Number(p.jumlah), 0)
    return { nama: k.nama, total }
  }).filter(k => k.total > 0).sort((a, b) => b.total - a.total)

  const filtered = pengeluaranList.filter(p => filterStatus === 'all' || p.status === filterStatus)

  function openAdd() { setEditTarget(null); setForm(emptyForm); setOpenForm(true) }
  function openEdit(p: Pengeluaran) {
    setEditTarget(p)
    setForm({ uraian: p.uraian, kategori: p.kategori, jumlah: String(p.jumlah), tanggal: p.tanggal, keterangan: p.keterangan || '' })
    setOpenForm(true)
  }

  async function handleSave() {
    if (!form.uraian || !form.kategori || !form.jumlah || !form.tanggal) { toast.error('Lengkapi semua field wajib'); return }
    setSaving(true)
    const payload = { dana_id: dana.id, nama_dana: dana.nama_dana, uraian: form.uraian, kategori: form.kategori, jumlah: parseFloat(form.jumlah), tanggal: form.tanggal, keterangan: form.keterangan || null, updated_at: new Date().toISOString() }
    if (editTarget) {
      const { error } = await supabase.from('pengeluaran').update(payload).eq('id', editTarget.id)
      if (error) { toast.error('Gagal memperbarui'); setSaving(false); return }
      toast.success('Pengeluaran diperbarui')
    } else {
      const { error } = await supabase.from('pengeluaran').insert({ ...payload, status: 'pending' })
      if (error) { toast.error('Gagal menambah pengeluaran'); setSaving(false); return }
      toast.success('Pengeluaran ditambahkan')
    }
    setSaving(false); setOpenForm(false); startTransition(() => router.refresh())
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('pengeluaran').delete().eq('id', delTarget.id)
    if (error) { toast.error('Gagal menghapus'); setSaving(false); return }
    toast.success('Pengeluaran dihapus'); setSaving(false); setOpenDel(false); startTransition(() => router.refresh())
  }

  async function handleApprove(id: number) {
    const { error } = await supabase.from('pengeluaran').update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Gagal menyetujui'); return }
    toast.success('Pengeluaran disetujui'); startTransition(() => router.refresh())
  }

  async function handleReject(id: number) {
    const { error } = await supabase.from('pengeluaran').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Gagal menolak'); return }
    toast.success('Pengeluaran ditolak'); startTransition(() => router.refresh())
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/dana" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900 mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dana
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{dana.nama_dana}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{dana.sumber}</Badge>
              <span className="text-sm text-muted-foreground">{formatTanggal(dana.tanggal)}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/laporan?dana=${dana.id}`}>
              <Button variant="outline" className="gap-2"><FileBarChart className="w-4 h-4" /> Laporan</Button>
            </Link>
            <Button className="gap-2" onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Pengeluaran</Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Dana', value: formatRupiah(Number(dana.jumlah)), color: 'text-blue-600' },
          { label: 'Terpakai',   value: formatRupiah(totalKeluar),          color: 'text-rose-600' },
          { label: 'Pending',    value: formatRupiah(totalPending),          color: 'text-amber-600' },
          { label: 'Sisa Saldo', value: formatRupiah(sisa),                 color: sisa >= 0 ? 'text-emerald-600' : 'text-destructive' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-lg font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">Penggunaan Dana</span>
            <span className="font-mono font-bold text-slate-900">{persen.toFixed(1)}%</span>
          </div>
          <Progress value={persen} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            <span>{formatRupiah(totalKeluar)} terpakai</span>
            <span>{formatRupiah(sisa)} tersisa</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabel Pengeluaran */}
      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Daftar Pengeluaran</CardTitle>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Tidak ada pengeluaran</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const sc = getStatusColor(p.status)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatTanggal(p.tanggal)}</TableCell>
                      <TableCell className="text-sm max-w-[200px]">
                        <p className="truncate font-medium">{p.uraian}</p>
                        {p.keterangan && <p className="text-xs text-muted-foreground truncate">{p.keterangan}</p>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{p.kategori}</Badge></TableCell>
                      <TableCell className="text-right font-mono font-semibold text-slate-900">{formatRupiah(Number(p.jumlah))}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.badge}`}>{sc.label}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center h-7 px-2 gap-1 text-xs font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                            Aksi <ChevronDown className="w-3 h-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.status === 'pending' && <>
                              <DropdownMenuItem onClick={() => handleApprove(p.id)} className="text-emerald-700 gap-2"><Check className="w-3.5 h-3.5" /> Setujui</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReject(p.id)} className="text-destructive gap-2"><X className="w-3.5 h-3.5" /> Tolak</DropdownMenuItem>
                            </>}
                            <DropdownMenuItem onClick={() => openEdit(p)} className="gap-2"><Pencil className="w-3.5 h-3.5" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDelTarget(p); setOpenDel(true) }} className="text-destructive gap-2"><Trash2 className="w-3.5 h-3.5" /> Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Per Kategori */}
      {perKategori.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Breakdown per Kategori</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {perKategori.map(k => (
              <div key={k.nama}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{k.nama}</span>
                  <span className="font-mono font-semibold">{formatRupiah(k.total)} <span className="text-xs text-muted-foreground">({hitungPersen(k.total, totalKeluar).toFixed(1)}%)</span></span>
                </div>
                <Progress value={hitungPersen(k.total, totalKeluar)} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Form Pengeluaran */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Uraian <span className="text-destructive">*</span></Label>
              <Input placeholder="Deskripsi pengeluaran" value={form.uraian} onChange={e => setForm(f => ({ ...f, uraian: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori <span className="text-destructive">*</span></Label>
                <Select value={form.kategori} onValueChange={v => setForm(f => ({ ...f, kategori: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>{kategoriList.map(k => <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Textarea rows={2} placeholder="Keterangan tambahan (opsional)" value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Hapus Pengeluaran</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Hapus pengeluaran <strong>{delTarget?.uraian}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDel(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hapus'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
