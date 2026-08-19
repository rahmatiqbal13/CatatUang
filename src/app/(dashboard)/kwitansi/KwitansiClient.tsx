'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import { computeInvoiceTotals } from '@/lib/dokumenTotals'
import type { Kwitansi, Invoice } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

type InvoiceOption = Pick<Invoice, 'id' | 'nomor' | 'penerima_nama' | 'items' | 'diskon_persen' | 'pajak_persen'>

type Props = { kwitansiList: Kwitansi[]; invoiceList: InvoiceOption[] }

type FormData = {
  nomor: string; tanggal: string; invoice_id: string
  diterima_dari: string; jumlah: string; untuk_pembayaran: string
  penerima_nama: string; penerima_jabatan: string
  catatan: string
}
const emptyForm: FormData = {
  nomor: '', tanggal: '', invoice_id: '',
  diterima_dari: '', jumlah: '', untuk_pembayaran: '',
  penerima_nama: '', penerima_jabatan: '',
  catatan: '',
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

const NO_INVOICE_VALUE = '__none__'

export function KwitansiClient({ kwitansiList, invoiceList }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<Kwitansi | null>(null)
  const [delTarget, setDelTarget] = useState<Kwitansi | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openAdd = async () => {
    setEditTarget(null)
    const nomor = await generateNomor(supabase, 'kwitansi', 'KWT')
    setForm({ ...emptyForm, nomor, tanggal: todayIso() })
    setOpenForm(true)
  }

  const openEdit = (k: Kwitansi) => {
    setEditTarget(k)
    setForm({
      nomor: k.nomor,
      tanggal: k.tanggal,
      invoice_id: k.invoice_id ? String(k.invoice_id) : '',
      diterima_dari: k.diterima_dari,
      jumlah: String(k.jumlah),
      untuk_pembayaran: k.untuk_pembayaran,
      penerima_nama: k.penerima_nama,
      penerima_jabatan: k.penerima_jabatan || '',
      catatan: k.catatan || '',
    })
    setOpenForm(true)
  }

  function handlePickInvoice(value: string | null) {
    const v = value ?? NO_INVOICE_VALUE
    if (v === NO_INVOICE_VALUE) {
      setForm(f => ({ ...f, invoice_id: '' }))
      return
    }
    const inv = invoiceList.find(i => String(i.id) === v)
    if (!inv) return
    const totals = computeInvoiceTotals(inv.items, inv.diskon_persen, inv.pajak_persen)
    setForm(f => ({
      ...f,
      invoice_id: v,
      diterima_dari: inv.penerima_nama,
      jumlah: String(totals.total),
      untuk_pembayaran: `Pembayaran Invoice ${inv.nomor}`,
    }))
  }

  async function handleSave() {
    if (!form.nomor || !form.tanggal || !form.diterima_dari || !form.jumlah || !form.untuk_pembayaran || !form.penerima_nama) {
      toast.error('Nomor, tanggal, diterima dari, jumlah, untuk pembayaran, dan penerima wajib diisi')
      return
    }
    const jumlah = parseFloat(form.jumlah)
    if (isNaN(jumlah) || jumlah <= 0) {
      toast.error('Jumlah tidak valid')
      return
    }
    setSaving(true)
    const payload = {
      nomor: form.nomor,
      tanggal: form.tanggal,
      invoice_id: form.invoice_id ? Number(form.invoice_id) : null,
      diterima_dari: form.diterima_dari,
      jumlah,
      untuk_pembayaran: form.untuk_pembayaran,
      penerima_nama: form.penerima_nama,
      penerima_jabatan: form.penerima_jabatan || null,
      catatan: form.catatan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('kwitansi').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Kwitansi diperbarui')
    } else {
      const { error } = await supabase.from('kwitansi').insert(payload)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Kwitansi ditambahkan')
    }
    setSaving(false)
    setOpenForm(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('kwitansi').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('Kwitansi dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>Kwitansi</h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>{kwitansiList.length} kwitansi</div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[5px] text-[12px] font-medium"
          style={{ background: 'var(--cu-primary)', color: '#ffffff' }}
        >
          <Plus className="w-3.5 h-3.5" /> Kwitansi Baru
        </button>
      </div>

      <div className="cu-page">
        <div className="cu-card overflow-hidden">
          {kwitansiList.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>Belum ada kwitansi</div>
          ) : (
            <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Nomor</th>
                    <th style={{ width: 90 }}>Tanggal</th>
                    <th>Diterima Dari</th>
                    <th>Untuk Pembayaran</th>
                    <th className="cu-num" style={{ width: 130 }}>Jumlah</th>
                    <th style={{ width: 90 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {kwitansiList.map(k => (
                    <tr key={k.id}>
                      <td className="cu-mono text-[12px]">{k.nomor}</td>
                      <td className="cu-mono text-[11.5px] whitespace-nowrap" style={{ color: 'var(--cu-text-2)' }}>{formatTanggal(k.tanggal)}</td>
                      <td className="text-[12.5px]" style={{ color: 'var(--cu-text)' }}>{k.diterima_dari}</td>
                      <td className="text-[12px] truncate max-w-[220px]" style={{ color: 'var(--cu-text-2)' }} title={k.untuk_pembayaran}>{k.untuk_pembayaran}</td>
                      <td className="cu-num cu-mono text-[12px] font-medium">{formatRupiah(Number(k.jumlah))}</td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => openEdit(k)} title="Edit" aria-label="Edit kwitansi" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => { setDelTarget(k); setOpenDel(true) }} title="Hapus" aria-label="Hapus kwitansi" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">{editTarget ? 'Edit Kwitansi' : 'Kwitansi Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nomor *</Label>
                <Input value={form.nomor} onChange={e => setForm(f => ({ ...f, nomor: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            {invoiceList.length > 0 && (
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Kaitkan ke Invoice (opsional)</Label>
                <Select
                  value={form.invoice_id || NO_INVOICE_VALUE}
                  onValueChange={handlePickInvoice}
                  items={{
                    [NO_INVOICE_VALUE]: 'Tidak terkait invoice',
                    ...Object.fromEntries(invoiceList.map(i => [String(i.id), `${i.nomor} — ${i.penerima_nama}`])),
                  }}
                >
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Tidak terkait invoice" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_INVOICE_VALUE}>Tidak terkait invoice</SelectItem>
                    {invoiceList.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.nomor} — {i.penerima_nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Diterima Dari *</Label>
              <Input value={form.diterima_dari} onChange={e => setForm(f => ({ ...f, diterima_dari: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jumlah *</Label>
              <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Untuk Pembayaran *</Label>
              <Input value={form.untuk_pembayaran} onChange={e => setForm(f => ({ ...f, untuk_pembayaran: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Penerima *</Label>
                <Input value={form.penerima_nama} onChange={e => setForm(f => ({ ...f, penerima_nama: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jabatan</Label>
                <Input value={form.penerima_jabatan} onChange={e => setForm(f => ({ ...f, penerima_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Catatan</Label>
              <Textarea placeholder="Catatan tambahan (opsional)" rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>Hapus Kwitansi</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus kwitansi <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-danger)', color: '#fff' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
