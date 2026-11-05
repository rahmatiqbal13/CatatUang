'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal, terbilangRupiah } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import type { BuktiUang, JenisBuktiUang } from '@/lib/types'
import { Topbar, BarButton } from '@/components/layout/Topbar'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Printer } from 'lucide-react'
import { JUDUL_BUKTI } from '@/components/pdf/BuktiUangPDF'
import { JENIS_PREFIX, downloadBuktiPdf } from '@/lib/bukti-pdf'

const JENIS_LABEL: Record<JenisBuktiUang, string> = {
  penerimaan: 'Bukti Penerimaan Uang',
  serah_terima: 'Bukti Serah Terima Uang',
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
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const searchParams = useSearchParams()

  async function handlePrint(b: BuktiUang) {
    setPrintingId(b.id)
    try {
      await downloadBuktiPdf(b)
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

  // The mobile quick-add sheet links here with ?baru=1.
  const wantsNew = searchParams.get('baru') === '1'
  useEffect(() => {
    if (!wantsNew) return
    generateNomor(supabase, 'penerimaan', JENIS_PREFIX.penerimaan).then(nomor => {
      setForm({ ...emptyForm, nomor, tanggal: todayIso() })
      setOpenForm(true)
    })
  }, [wantsNew, supabase])

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
      if (error?.code === '23505') {
        // Someone else took this number meanwhile — hand out the next free one.
        const nomor = await generateNomor(supabase, form.jenis, JENIS_PREFIX[form.jenis])
        setForm(f => ({ ...f, nomor }))
        toast.error(`Nomor sudah dipakai. Nomor baru: ${nomor} — silakan simpan lagi.`)
        setSaving(false)
        return
      }
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

  const selected = buktiList.find(b => b.id === selectedId) ?? buktiList[0]

  return (
    <div className="animate-fade-in">
      <Topbar
        crumb="Arsip / Bukti Uang"
        title="Bukti Uang"
        subtitle={`${buktiList.length} bukti penerimaan / serah terima`}
        action={
          <BarButton variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Terbitkan bukti
          </BarButton>
        }
      />

      <div className="cu-page">
        {!selected ? (
          <div className="card-shell serif py-16 text-center text-[19px] italic" style={{ color: 'var(--text-2)' }}>
            Belum ada bukti penerimaan atau serah terima uang.
          </div>
        ) : (
          <div className="grid items-start gap-6 md:grid-cols-[minmax(240px,300px)_1fr]">
            {/* Index */}
            <div className="flex flex-col gap-2">
              {buktiList.map(b => {
                const on = b.id === selected.id
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className="flex flex-col gap-[6px] rounded-[14px] border px-4 py-[14px] text-left transition-colors"
                    style={{ borderColor: on ? '#9DBBA8' : 'var(--divider)', background: on ? 'var(--accent-100)' : 'var(--surface)' }}
                  >
                    <div className="flex w-full justify-between gap-2">
                      <span className="cu-mono text-[12.5px] font-semibold">{b.nomor}</span>
                      <span className="label-caps text-[10.5px]" style={{ color: b.jenis === 'penerimaan' ? 'var(--accent)' : 'var(--data-blue)' }}>
                        {b.jenis === 'penerimaan' ? 'Penerimaan' : 'Serah terima'}
                      </span>
                    </div>
                    <div className="text-[14px] font-semibold">{b.penerima_nama}</div>
                    <div className="flex w-full justify-between text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                      <span>{formatTanggal(b.tanggal)}</span>
                      <span className="cu-mono font-semibold" style={{ color: 'var(--text)' }}>{formatRupiah(Number(b.jumlah))}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Document */}
            <div className="flex flex-col gap-[14px]">
              <article
                className="flex flex-col gap-[22px] rounded-[4px] border p-6 md:px-10 md:py-9"
                style={{ background: 'var(--surface-elev)', borderColor: 'var(--divider)', boxShadow: '0 22px 44px -30px rgba(24,36,30,.45)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="label-caps text-[11px] tracking-[.16em]" style={{ color: 'var(--text-muted)' }}>{JUDUL_BUKTI[selected.jenis]}</div>
                    <div className="serif mt-2 text-[36px] leading-[1.05] italic">
                      Bukti {selected.jenis === 'penerimaan' ? 'penerimaan' : 'serah terima'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="cu-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>Nomor</div>
                    <div className="cu-mono text-[14px] font-semibold">{selected.nomor}</div>
                  </div>
                </div>
                <div style={{ borderTop: '3px double var(--text)' }} />
                <div className="flex flex-col gap-[14px] text-[14px]">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <span className="w-[150px]" style={{ color: 'var(--text-muted)' }}>Telah diterima dari</span>
                    <span className="flex-[1_1_200px] font-semibold">
                      {selected.pemberi_nama}
                      {selected.pemberi_jabatan && <span className="font-normal" style={{ color: 'var(--text-2)' }}> · {selected.pemberi_jabatan}</span>}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="w-[150px]" style={{ color: 'var(--text-muted)' }}>Uang sejumlah</span>
                    <span
                      className="serif flex-[1_1_200px] border px-[14px] py-1 text-[32px] tracking-[-0.02em] whitespace-nowrap"
                      style={{ borderColor: 'var(--divider)', background: 'repeating-linear-gradient(to bottom, #F3EEE2 0 7px, #FFFDF8 7px 9px)' }}
                    >
                      {formatRupiah(Number(selected.jumlah))}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <span className="w-[150px]" style={{ color: 'var(--text-muted)' }}>Terbilang</span>
                    <span className="serif flex-[1_1_200px] text-[17px] italic" style={{ textWrap: 'pretty' }}>{terbilangRupiah(Number(selected.jumlah))}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <span className="w-[150px]" style={{ color: 'var(--text-muted)' }}>Untuk keperluan</span>
                    <span className="flex-[1_1_200px]">{selected.keperluan}</span>
                  </div>
                </div>
                <div className="text-right text-[13.5px]" style={{ color: 'var(--text-2)' }}>{formatTanggal(selected.tanggal)}</div>
                <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>
                  {[
                    { label: 'Yang menyerahkan', nama: selected.pemberi_nama, jab: selected.pemberi_jabatan },
                    { label: 'Yang menerima', nama: selected.penerima_nama, jab: selected.penerima_jabatan },
                  ].map(t => (
                    <div key={t.label}>
                      <div className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{t.label}</div>
                      <div className="h-[58px]" />
                      <div className="border-b pb-1 font-semibold" style={{ borderColor: 'var(--text)' }}>{t.nama}</div>
                      {t.jab && <div className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{t.jab}</div>}
                    </div>
                  ))}
                </div>
              </article>
              <div className="flex flex-wrap gap-[10px]">
                <BarButton variant="ink" onClick={() => handlePrint(selected)} disabled={printingId === selected.id}>
                  {printingId === selected.id
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Mencetak…</>
                    : <><Printer className="h-4 w-4" /> Cetak PDF</>}
                </BarButton>
                <BarButton variant="outline" onClick={() => openEdit(selected)}>
                  <Pencil className="h-4 w-4" /> Edit
                </BarButton>
                <BarButton
                  variant="outline"
                  onClick={() => { setDelTarget(selected); setOpenDel(true) }}
                  className="!border-[var(--divider)] !text-[var(--danger)] hover:!bg-[var(--danger-soft)]"
                >
                  <Trash2 className="h-4 w-4" /> Hapus
                </BarButton>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Bukti' : 'Bukti Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Jenis Bukti *</Label>
              <Select value={form.jenis} onValueChange={handlePickJenis} items={JENIS_LABEL}>
                <SelectTrigger className="text-[14px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="penerimaan">{JENIS_LABEL.penerimaan}</SelectItem>
                  <SelectItem value="serah_terima">{JENIS_LABEL.serah_terima}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Nomor *</Label>
                <Input value={form.nomor} disabled className="text-[14px]" />
              </div>
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="text-[14px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Nama Pemberi *</Label>
                <Input value={form.pemberi_nama} onChange={e => setForm(f => ({ ...f, pemberi_nama: e.target.value }))} className="text-[14px]" />
              </div>
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Jabatan Pemberi</Label>
                <Input value={form.pemberi_jabatan} onChange={e => setForm(f => ({ ...f, pemberi_jabatan: e.target.value }))} className="text-[14px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Nama Penerima *</Label>
                <Input value={form.penerima_nama} onChange={e => setForm(f => ({ ...f, penerima_nama: e.target.value }))} className="text-[14px]" />
              </div>
              <div>
                <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Jabatan Penerima</Label>
                <Input value={form.penerima_jabatan} onChange={e => setForm(f => ({ ...f, penerima_jabatan: e.target.value }))} className="text-[14px]" />
              </div>
            </div>
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Jumlah *</Label>
              <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="text-[14px]" />
            </div>
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Keperluan *</Label>
              <Input value={form.keperluan} onChange={e => setForm(f => ({ ...f, keperluan: e.target.value }))} className="text-[14px]" />
            </div>
            <div>
              <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Catatan</Label>
              <Textarea placeholder="Catatan tambahan (opsional)" rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} className="text-[13px]" />
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

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--danger)' }}>Hapus Bukti</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--text-2)' }}>
            Yakin ingin menghapus bukti <strong style={{ color: 'var(--text)' }}>{delTarget?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.
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
