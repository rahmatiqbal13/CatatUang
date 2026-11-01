'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { pdf } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal, terbilangRupiah } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import type { Peminjaman, DanaMasuk, StatusPeminjaman } from '@/lib/types'
import { PeminjamanPDF } from '@/components/pdf/PeminjamanPDF'
import { Topbar, BarButton } from '@/components/layout/Topbar'
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
  // The mobile quick-add sheet links here with ?baru=1.
  const wantsNew = useSearchParams().get('baru') === '1'
  const [handledNew, setHandledNew] = useState(false)
  if (wantsNew && !handledNew && danaList.length > 0) {
    setHandledNew(true)
    openAdd()
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
        crumb="Arus kas / Peminjaman"
        title="Peminjaman"
        subtitle={`${peminjamanList.length} peminjam · ${belumLunasCount} belum lunas`}
        action={
          <BarButton variant="primary" onClick={openAdd} disabled={danaList.length === 0}>
            <Plus className="h-4 w-4" /> Catat peminjaman
          </BarButton>
        }
      />

      <div className="cu-page">
        {peminjamanList.length === 0 ? (
          <div className="card-shell serif py-16 text-center text-[19px] italic" style={{ color: 'var(--text-2)' }}>
            Belum ada peminjaman.
          </div>
        ) : (
          <div style={autoGrid(320, 20)}>
            {peminjamanList.map(p => (
              <article key={p.id} className="card-shell relative flex flex-col gap-[14px] overflow-hidden p-[22px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="label-caps text-[11px]" style={{ color: 'var(--text-muted)' }}>Pinjaman · {formatTanggal(p.tanggal)}</span>
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      title="Edit"
                      aria-label="Edit peminjaman"
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-2)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setDelTarget(p); setOpenDel(true) }}
                      title="Hapus"
                      aria-label="Hapus peminjaman"
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--danger-soft)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>

                <div>
                  <div className="serif text-[27px] leading-[1.1]">{p.nama_peminjam}</div>
                  {(p.jabatan || p.unit_kerja) && (
                    <div className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      {[p.jabatan, p.unit_kerja].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                <div>
                  <div className="serif text-[34px] tracking-[-0.02em] whitespace-nowrap">{formatRupiah(Number(p.jumlah))}</div>
                  <div className="serif mt-1 text-[14px] italic" style={{ color: 'var(--text-2)', textWrap: 'pretty' }}>
                    {terbilangRupiah(Number(p.jumlah))}
                  </div>
                </div>

                <div className="rule-dashed flex flex-col gap-1 pt-3 text-[13px]" style={{ color: 'var(--text-2)' }}>
                  {p.pemberi_nama && (
                    <span>
                      Diberikan oleh <b className="font-semibold" style={{ color: 'var(--text)' }}>{p.pemberi_nama}</b>
                      {p.pemberi_jabatan && ` · ${p.pemberi_jabatan}`}
                    </span>
                  )}
                  <span>Dari dompet {p.nama_dana || '—'}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <BarButton
                    variant={p.status === 'lunas' ? 'outline' : 'ink'}
                    className="flex-1 justify-center !px-4 !text-[13px]"
                    onClick={() => handleToggleStatus(p)}
                    disabled={updatingId === p.id}
                  >
                    {updatingId === p.id
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</>
                      : (p.status === 'lunas' ? 'Tandai belum lunas' : 'Tandai lunas')}
                  </BarButton>
                  <BarButton
                    variant="outline"
                    className="flex-1 justify-center !px-4 !text-[13px]"
                    onClick={() => handlePrint(p)}
                    disabled={printingId === p.id}
                  >
                    {printingId === p.id
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Mencetak…</>
                      : <><Printer className="h-4 w-4" /> Cetak bukti</>}
                  </BarButton>
                </div>

                {p.status === 'lunas' && (
                  <div
                    aria-label="Lunas"
                    className="cu-mono pointer-events-none absolute top-[54px] right-[18px] rounded-[6px] border-[3px] px-3 py-1 text-[16px] font-bold tracking-[.18em] opacity-90"
                    style={{ borderColor: 'var(--accent)', color: 'var(--accent)', transform: 'rotate(-8deg)' }}
                  >
                    LUNAS
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Peminjaman' : 'Peminjaman Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Wallet *</Label>
              <Select
                value={form.dana_id}
                onValueChange={v => setForm(f => ({ ...f, dana_id: v ?? '' }))}
                items={Object.fromEntries(danaList.map(d => [String(d.id), d.nama_dana]))}
              >
                <SelectTrigger className="text-[14px]"><SelectValue placeholder="Pilih wallet" /></SelectTrigger>
                <SelectContent>{danaList.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="label-caps pt-1" style={{ color: 'var(--text-muted)' }}>
              Pihak Pertama (Pemberi)
            </div>
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Nama Pemberi *</Label>
              <Input value={form.pemberi_nama} onChange={e => setForm(f => ({ ...f, pemberi_nama: e.target.value }))} className="text-[14px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Jabatan</Label>
                <Input value={form.pemberi_jabatan} onChange={e => setForm(f => ({ ...f, pemberi_jabatan: e.target.value }))} className="text-[14px]" />
              </div>
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Instansi</Label>
                <Input value={form.pemberi_instansi} onChange={e => setForm(f => ({ ...f, pemberi_instansi: e.target.value }))} className="text-[14px]" />
              </div>
            </div>

            <div className="label-caps pt-1" style={{ color: 'var(--text-muted)' }}>
              Pihak Kedua (Peminjam)
            </div>
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Nama Peminjam *</Label>
              <Input value={form.nama_peminjam} onChange={e => setForm(f => ({ ...f, nama_peminjam: e.target.value }))} className="text-[14px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Jabatan</Label>
                <Input value={form.jabatan} onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))} className="text-[14px]" />
              </div>
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Unit Kerja</Label>
                <Input value={form.unit_kerja} onChange={e => setForm(f => ({ ...f, unit_kerja: e.target.value }))} className="text-[14px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Jumlah *</Label>
                <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="text-[14px]" />
              </div>
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="text-[14px]" />
              </div>
            </div>
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Keterangan</Label>
              <Textarea placeholder="Keterangan tambahan (opsional)" rows={2} value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--danger)' }}>
              Hapus Peminjaman
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--text-2)' }}>
            Yakin ingin menghapus peminjaman <strong style={{ color: 'var(--text)' }}>{delTarget?.nama_peminjam}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)}>Batal</Button>
            <Button onClick={handleDelete} disabled={saving} style={{ background: 'var(--danger)', color: 'var(--surface-elev)' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
