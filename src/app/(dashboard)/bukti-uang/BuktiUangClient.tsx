'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal, terbilang } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import type { BuktiUang, JenisBuktiUang } from '@/lib/types'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { autoGrid } from '@/lib/tokens'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Printer } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { BuktiUangPDF, JUDUL_BUKTI } from '@/components/pdf/BuktiUangPDF'

const JENIS_LABEL: Record<JenisBuktiUang, string> = {
  penerimaan: 'Bukti Penerimaan Uang',
  serah_terima: 'Bukti Serah Terima Uang',
}
const JENIS_PREFIX: Record<JenisBuktiUang, string> = {
  penerimaan: 'BPU',
  serah_terima: 'BSTU',
}

type Props = { buktiList: BuktiUang[] }

type FormData = {
  nomor: string; jenis: JenisBuktiUang; tanggal: string
  pemberi_nama: string; pemberi_jabatan: string
  penerima_nama: string; penerima_jabatan: string
  jumlah: string; keperluan: string; catatan: string
}
const emptyForm: FormData = {
  nomor: '', jenis: 'penerimaan', tanggal: '',
  pemberi_nama: '', pemberi_jabatan: '',
  penerima_nama: '', penerima_jabatan: '',
  jumlah: '', keperluan: '', catatan: '',
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function BuktiUangClient({ buktiList }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<BuktiUang | null>(null)
  const [delTarget, setDelTarget] = useState<BuktiUang | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [printingId, setPrintingId] = useState<number | null>(null)

  async function handlePrint(b: BuktiUang) {
    setPrintingId(b.id)
    try {
      const blob = await pdf(<BuktiUangPDF bukti={b} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${JENIS_PREFIX[b.jenis]}_${b.nomor.replace(/\//g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Bukti berhasil diunduh')
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat bukti')
    } finally {
      setPrintingId(null)
    }
  }

  const openAdd = async () => {
    setEditTarget(null)
    const nomor = await generateNomor(supabase, 'penerimaan', JENIS_PREFIX.penerimaan)
    setForm({ ...emptyForm, nomor, tanggal: todayIso() })
    setOpenForm(true)
  }

  const openEdit = (b: BuktiUang) => {
    setEditTarget(b)
    setForm({
      nomor: b.nomor,
      jenis: b.jenis,
      tanggal: b.tanggal,
      pemberi_nama: b.pemberi_nama,
      pemberi_jabatan: b.pemberi_jabatan || '',
      penerima_nama: b.penerima_nama,
      penerima_jabatan: b.penerima_jabatan || '',
      jumlah: String(b.jumlah),
      keperluan: b.keperluan,
      catatan: b.catatan || '',
    })
    setOpenForm(true)
  }

  async function handlePickJenis(value: string | null) {
    const jenis = (value ?? 'penerimaan') as JenisBuktiUang
    // Numbering is per jenis; keep the existing number when editing a record of that jenis.
    const nomor = editTarget && editTarget.jenis === jenis
      ? editTarget.nomor
      : await generateNomor(supabase, jenis, JENIS_PREFIX[jenis])
    setForm(f => ({ ...f, jenis, nomor }))
  }

  async function handleSave() {
    if (!form.nomor || !form.tanggal || !form.pemberi_nama || !form.penerima_nama || !form.jumlah || !form.keperluan) {
      toast.error('Nomor, tanggal, nama pemberi, nama penerima, jumlah, dan keperluan wajib diisi')
      return
    }
    const jumlah = Math.round(parseFloat(form.jumlah))
    if (isNaN(jumlah) || jumlah <= 0) {
      toast.error('Jumlah tidak valid')
      return
    }
    setSaving(true)
    const payload = {
      nomor: form.nomor,
      jenis: form.jenis,
      tanggal: form.tanggal,
      pemberi_nama: form.pemberi_nama,
      pemberi_jabatan: form.pemberi_jabatan || null,
      penerima_nama: form.penerima_nama,
      penerima_jabatan: form.penerima_jabatan || null,
      jumlah,
      keperluan: form.keperluan,
      catatan: form.catatan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('bukti_uang').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Bukti diperbarui')
    } else {
      const { error } = await supabase.from('bukti_uang').insert(payload)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Bukti ditambahkan')
    }
    setSaving(false)
    setOpenForm(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('bukti_uang').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('Bukti dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      <Topbar
        title="Bukti Uang"
        subtitle={`${buktiList.length} bukti penerimaan / serah terima`}
        action={
          <BarButton variant="primary" onClick={openAdd}>
            <span className="inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Bukti</span>
          </BarButton>
        }
      />

      <div className="cu-page">
        {buktiList.length === 0 ? (
          <div className="card-shell py-16 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>Belum ada bukti penerimaan atau serah terima uang</div>
        ) : (
          <div style={autoGrid(330)}>
            {buktiList.map(b => (
              <div key={b.id} className="card-shell overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 px-[18px] py-3" style={{ background: '#201e1d', color: '#f3f2f2' }}>
                  <span className="text-[12px] font-extrabold" style={{ letterSpacing: '0.06em' }}>{JUDUL_BUKTI[b.jenis]}</span>
                  <span className="text-[12px] font-bold whitespace-nowrap">{b.nomor}</span>
                </div>

                {/* Body */}
                <div className="px-[18px] py-[18px] flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Pemberi</div>
                      <div className="text-[14px] font-bold mt-0.5 truncate" style={{ color: 'var(--text)' }}>{b.pemberi_nama}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Penerima</div>
                      <div className="text-[14px] font-bold mt-0.5 truncate" style={{ color: 'var(--text)' }}>{b.penerima_nama}</div>
                    </div>
                  </div>

                  <div className="mt-3 px-3 py-3" style={{ background: 'var(--accent-200)' }}>
                    <div className="label-caps" style={{ color: 'var(--accent-press)' }}>Jumlah</div>
                    <div className="text-[26px] font-extrabold whitespace-nowrap" style={{ color: 'var(--accent-press)' }}>
                      {formatRupiah(Number(b.jumlah))}
                    </div>
                    <div className="text-[11.5px] mt-1" style={{ color: '#7c1405' }}>
                      {terbilang(Number(b.jumlah))} Rupiah
                    </div>
                  </div>

                  <div className="mt-3 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
                    Keperluan: {b.keperluan}
                  </div>

                  <div className="mt-auto pt-3 flex items-center justify-between gap-2" style={{ borderTop: '1px solid var(--border-hairline)', marginTop: 14 }}>
                    <span className="text-[11.5px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatTanggal(b.tanggal)}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <BarButton variant="outline" className="flex-1" onClick={() => handlePrint(b)} disabled={printingId === b.id}>
                      {printingId === b.id
                        ? <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mencetak…</span>
                        : <span className="inline-flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Unduh PDF</span>}
                    </BarButton>
                    <button
                      onClick={() => openEdit(b)}
                      title="Edit"
                      aria-label="Edit bukti"
                      className="w-9 h-9 flex items-center justify-center shrink-0 hover:bg-[var(--surface-2)]"
                      style={{ color: 'var(--text-muted)', border: '1px solid var(--divider)' }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setDelTarget(b); setOpenDel(true) }}
                      title="Hapus"
                      aria-label="Hapus bukti"
                      className="w-9 h-9 flex items-center justify-center shrink-0 hover:bg-[var(--status-no-bg)]"
                      style={{ color: 'var(--text-muted)', border: '1px solid var(--divider)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-extrabold">{editTarget ? 'Edit Bukti' : 'Bukti Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Jenis Bukti *</Label>
              <Select value={form.jenis} onValueChange={handlePickJenis} items={JENIS_LABEL}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="penerimaan">{JENIS_LABEL.penerimaan}</SelectItem>
                  <SelectItem value="serah_terima">{JENIS_LABEL.serah_terima}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Nomor *</Label>
                <Input value={form.nomor} disabled className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Nama Pemberi *</Label>
                <Input value={form.pemberi_nama} onChange={e => setForm(f => ({ ...f, pemberi_nama: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Jabatan Pemberi</Label>
                <Input value={form.pemberi_jabatan} onChange={e => setForm(f => ({ ...f, pemberi_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Nama Penerima *</Label>
                <Input value={form.penerima_nama} onChange={e => setForm(f => ({ ...f, penerima_nama: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Jabatan Penerima</Label>
                <Input value={form.penerima_jabatan} onChange={e => setForm(f => ({ ...f, penerima_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Jumlah *</Label>
              <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Keperluan *</Label>
              <Input value={form.keperluan} onChange={e => setForm(f => ({ ...f, keperluan: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Catatan</Label>
              <Textarea placeholder="Catatan tambahan (opsional)" rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} className="text-[13px]" />
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

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-extrabold" style={{ color: 'var(--accent-press)' }}>Hapus Bukti</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--text-2)' }}>
            Yakin ingin menghapus bukti <strong style={{ color: 'var(--text)' }}>{delTarget?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.
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
