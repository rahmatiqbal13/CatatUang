'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { pdf } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import type { Peminjaman, DanaMasuk, StatusPeminjaman } from '@/lib/types'
import { PeminjamanPDF } from '@/components/pdf/PeminjamanPDF'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { autoGrid } from '@/lib/tokens'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Printer, Loader2 } from 'lucide-react'

type Props = {
  peminjamanList: Peminjaman[]
  danaList: Pick<DanaMasuk, 'id' | 'nama_dana'>[]
  bukuNama: string
  pihakPertamaNama: string
  pihakPertamaJabatan: string
  pihakPertamaInstansi: string
}

type FormData = {
  dana_id: string; nama_peminjam: string; jabatan: string; unit_kerja: string
  pemberi_nama: string; pemberi_jabatan: string; pemberi_instansi: string
  jumlah: string; tanggal: string; keterangan: string
}
const emptyForm: FormData = {
  dana_id: '', nama_peminjam: '', jabatan: '', unit_kerja: '',
  pemberi_nama: '', pemberi_jabatan: '', pemberi_instansi: '',
  jumlah: '', tanggal: '', keterangan: '',
}

export function PeminjamanClient({ peminjamanList, danaList, pihakPertamaNama, pihakPertamaJabatan, pihakPertamaInstansi }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<Peminjaman | null>(null)
  const [delTarget, setDelTarget] = useState<Peminjaman | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [printingId, setPrintingId] = useState<number | null>(null)

  const belumLunasCount = peminjamanList.filter(p => p.status !== 'lunas').length

  const openAdd = () => {
    setEditTarget(null)
    setForm({
      ...emptyForm,
      pemberi_nama: pihakPertamaNama,
      pemberi_jabatan: pihakPertamaJabatan,
      pemberi_instansi: pihakPertamaInstansi,
    })
    setOpenForm(true)
  }
  const openEdit = (p: Peminjaman) => {
    setEditTarget(p)
    setForm({
      dana_id: p.dana_id ? String(p.dana_id) : '',
      nama_peminjam: p.nama_peminjam,
      jabatan: p.jabatan || '',
      unit_kerja: p.unit_kerja || '',
      pemberi_nama: p.pemberi_nama || '',
      pemberi_jabatan: p.pemberi_jabatan || '',
      pemberi_instansi: p.pemberi_instansi || '',
      jumlah: String(p.jumlah),
      tanggal: p.tanggal,
      keterangan: p.keterangan || '',
    })
    setOpenForm(true)
  }

  async function handleSave() {
    if (!form.dana_id || !form.nama_peminjam || !form.pemberi_nama || !form.jumlah || !form.tanggal) {
      toast.error('Wallet, nama pemberi, nama peminjam, jumlah, dan tanggal wajib diisi')
      return
    }
    const jumlah = parseFloat(form.jumlah)
    if (isNaN(jumlah) || jumlah <= 0) {
      toast.error('Jumlah tidak valid')
      return
    }
    const dana = danaList.find(d => d.id === Number(form.dana_id))
    if (!dana) { toast.error('Wallet tidak valid'); return }

    setSaving(true)
    const payload = {
      dana_id: dana.id,
      nama_dana: dana.nama_dana,
      nama_peminjam: form.nama_peminjam,
      jabatan: form.jabatan || null,
      unit_kerja: form.unit_kerja || null,
      pemberi_nama: form.pemberi_nama,
      pemberi_jabatan: form.pemberi_jabatan || null,
      pemberi_instansi: form.pemberi_instansi || null,
      jumlah,
      tanggal: form.tanggal,
      keterangan: form.keterangan || null,
      updated_at: new Date().toISOString(),
    }

    if (editTarget) {
      const { error } = await supabase.from('peminjaman').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Peminjaman diperbarui')
    } else {
      const { error } = await supabase.from('peminjaman').insert({ ...payload, status: 'belum_lunas' })
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Peminjaman ditambahkan')
    }
    setSaving(false)
    setOpenForm(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('peminjaman').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('Peminjaman dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    router.refresh()
  }

  async function handleToggleStatus(p: Peminjaman) {
    setUpdatingId(p.id)
    const newStatus: StatusPeminjaman = p.status === 'lunas' ? 'belum_lunas' : 'lunas'
    const { error } = await supabase.from('peminjaman').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', p.id)
    if (error) toast.error(handleSupabaseError(error))
    else { toast.success(newStatus === 'lunas' ? 'Ditandai lunas' : 'Ditandai belum lunas'); router.refresh() }
    setUpdatingId(null)
  }

  async function handlePrint(p: Peminjaman) {
    if (!p.pemberi_nama) {
      toast.error('Nama pemberi belum diisi untuk peminjaman ini — edit dulu untuk mengisinya')
      return
    }
    setPrintingId(p.id)
    try {
      const blob = await pdf(
        <PeminjamanPDF
          peminjaman={p}
          pihakPertamaNama={p.pemberi_nama}
          pihakPertamaJabatan={p.pemberi_jabatan || ''}
          pihakPertamaInstansi={p.pemberi_instansi || ''}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Surat_Pinjaman_${p.nama_peminjam.replace(/\s+/g, '_')}_${p.tanggal}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Surat berhasil diunduh')
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat surat')
    } finally {
      setPrintingId(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <Topbar
        title="Peminjaman"
        subtitle={`${peminjamanList.length} peminjam · ${belumLunasCount} belum lunas`}
        action={
          <BarButton variant="primary" onClick={openAdd} disabled={danaList.length === 0}>
            <span className="inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Peminjaman</span>
          </BarButton>
        }
      />

      <div className="cu-page">
        {peminjamanList.length === 0 ? (
          <div className="card-shell py-16 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Belum ada peminjaman
          </div>
        ) : (
          <div style={autoGrid(290)}>
            {peminjamanList.map(p => (
              <div key={p.id} className="card-shell relative" style={{ padding: 18 }}>
                <div className="absolute right-2 top-2 flex items-center gap-0.5">
                  <button
                    onClick={() => openEdit(p)}
                    title="Edit"
                    aria-label="Edit peminjaman"
                    className="w-6 h-6 flex items-center justify-center hover:bg-[var(--surface-2)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { setDelTarget(p); setOpenDel(true) }}
                    title="Hapus"
                    aria-label="Hapus peminjaman"
                    className="w-6 h-6 flex items-center justify-center hover:bg-[var(--status-no-bg)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="pr-14">
                  <StatusBadge status={p.status} />
                </div>

                <div className="mt-2 text-[17px] font-extrabold tracking-[-0.01em] truncate" style={{ color: 'var(--text)' }}>
                  {p.nama_peminjam}
                </div>
                {(p.jabatan || p.unit_kerja) && (
                  <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {[p.jabatan, p.unit_kerja].filter(Boolean).join(' · ')}
                  </div>
                )}

                <div className="mt-3 text-[24px] font-extrabold whitespace-nowrap" style={{ color: 'var(--text)' }}>
                  {formatRupiah(Number(p.jumlah))}
                </div>
                <div className="mt-1 text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {formatTanggal(p.tanggal)} · {p.nama_dana || '—'}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <BarButton
                    variant="ink"
                    className="flex-1"
                    onClick={() => handleToggleStatus(p)}
                    disabled={updatingId === p.id}
                  >
                    {updatingId === p.id
                      ? <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses…</span>
                      : (p.status === 'lunas' ? 'Tandai Belum Lunas' : 'Tandai Lunas')}
                  </BarButton>
                  <BarButton
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePrint(p)}
                    disabled={printingId === p.id}
                  >
                    {printingId === p.id
                      ? <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mencetak…</span>
                      : <span className="inline-flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Cetak Bukti</span>}
                  </BarButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-extrabold">
              {editTarget ? 'Edit Peminjaman' : 'Peminjaman Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Wallet *</Label>
              <Select
                value={form.dana_id}
                onValueChange={v => setForm(f => ({ ...f, dana_id: v ?? '' }))}
                items={Object.fromEntries(danaList.map(d => [String(d.id), d.nama_dana]))}
              >
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Pilih wallet" /></SelectTrigger>
                <SelectContent>{danaList.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="label-caps pt-1" style={{ color: 'var(--text-muted)' }}>
              Pihak Pertama (Pemberi)
            </div>
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Nama Pemberi *</Label>
              <Input value={form.pemberi_nama} onChange={e => setForm(f => ({ ...f, pemberi_nama: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Jabatan</Label>
                <Input value={form.pemberi_jabatan} onChange={e => setForm(f => ({ ...f, pemberi_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Instansi</Label>
                <Input value={form.pemberi_instansi} onChange={e => setForm(f => ({ ...f, pemberi_instansi: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="label-caps pt-1" style={{ color: 'var(--text-muted)' }}>
              Pihak Kedua (Peminjam)
            </div>
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Nama Peminjam *</Label>
              <Input value={form.nama_peminjam} onChange={e => setForm(f => ({ ...f, nama_peminjam: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Jabatan</Label>
                <Input value={form.jabatan} onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Unit Kerja</Label>
                <Input value={form.unit_kerja} onChange={e => setForm(f => ({ ...f, unit_kerja: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Jumlah *</Label>
                <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Keterangan</Label>
              <Textarea placeholder="Keterangan tambahan (opsional)" rows={2} value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--accent)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-extrabold" style={{ color: 'var(--accent-press)' }}>
              Hapus Peminjaman
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--text-2)' }}>
            Yakin ingin menghapus peminjaman <strong style={{ color: 'var(--text)' }}>{delTarget?.nama_peminjam}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--accent-press)', color: '#fff' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
